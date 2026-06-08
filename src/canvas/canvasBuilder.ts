import type {
	BaseboardNodePosition,
	BaseboardNodePositionMap,
	BaseboardRelationship,
	BaseboardViewSnapshot,
	MaterializeOptions,
} from "../types";
import { stableBaseboardId } from "../utils/hash";
import { getEdgeAttachmentSides } from "./edgeRouting";
import type {
	CanvasEdge,
	CanvasFileNode,
	CanvasGroupNode,
	CanvasNode,
	CanvasTextNode,
	JsonCanvas,
} from "./jsonCanvas";

const GROUP_HEADER_HEIGHT = 42;
const GROUP_PADDING = 18;
const NODE_GAP = 16;
const GROUP_GAP = 48;
const GRID_COLUMNS = 4;
const BASEBOARD_ID_PREFIX = "bb-";

type PositionedGroup = {
	groupNode: CanvasGroupNode | null;
	fileNodes: CanvasFileNode[];
};

export interface InitializedTextCardPositions {
	snapshot: BaseboardViewSnapshot;
	positions: BaseboardNodePositionMap;
	changed: boolean;
}

export function buildBaseboardCanvas(
	snapshot: BaseboardViewSnapshot,
	options: MaterializeOptions,
	relationships: BaseboardRelationship[] = [],
	existingCanvas: JsonCanvas = {}
): JsonCanvas {
	const existingNodes = new Map((existingCanvas.nodes ?? []).map((node) => [node.id, node]));
	const generatedGroups =
		options.layout === "grid"
		? [layoutUngroupedGrid(snapshot, options, existingNodes)]
		: snapshot.groups.map((group, groupIndex) =>
					layoutGroup(snapshot, group, groupIndex, options, existingNodes)
				);

	const generatedLayoutNodes = generatedGroups.flatMap((group) =>
		group.groupNode ? [group.groupNode, ...group.fileNodes] : group.fileNodes
	);
	const generatedTextNodes = layoutTextCards(
		snapshot,
		options,
		existingNodes,
		generatedLayoutNodes
	);
	const generatedNodes = [...generatedLayoutNodes, ...generatedTextNodes];
	const generatedNodeIds = new Set(generatedNodes.map((node) => node.id));
	const generatedEdges = buildRelationshipEdges(snapshot, relationships, generatedNodes);
	const generatedEdgeIds = new Set(generatedEdges.map((edge) => edge.id));

	const preservedNodes = (existingCanvas.nodes ?? []).filter((node) => {
		if (!isBaseboardId(node.id)) return true;
		if (generatedNodeIds.has(node.id)) return false;
		return !options.removeMissingNodes;
	});

	const preservedEdges = (existingCanvas.edges ?? []).filter((edge) => {
		if (!isBaseboardId(edge.id)) return true;
		if (generatedEdgeIds.has(edge.id)) return false;
		return !options.removeMissingNodes;
	});

	return {
		nodes: [...generatedNodes, ...preservedNodes],
		edges: [...generatedEdges, ...preservedEdges],
	};
}

export function initializeTextCardPositions(
	snapshot: BaseboardViewSnapshot,
	options: MaterializeOptions,
	positions: BaseboardNodePositionMap
): InitializedTextCardPositions {
	const missingCardNodeIds = snapshot.textCards
		.map((card) => getTextCardNodeId(card.id))
		.filter((nodeId) => !positions[nodeId]);

	if (missingCardNodeIds.length === 0) {
		return { snapshot, positions, changed: false };
	}

	const missingIds = new Set(missingCardNodeIds);
	const canvas = buildBaseboardCanvas(snapshot, options);
	const nextPositions = { ...positions };
	let changed = false;

	for (const node of canvas.nodes ?? []) {
		if (node.type !== "text" || !missingIds.has(node.id)) continue;

		nextPositions[node.id] = getCanvasNodePosition(node);
		changed = true;
	}

	if (!changed) {
		return { snapshot, positions, changed: false };
	}

	return {
		snapshot: {
			...snapshot,
			textCards: snapshot.textCards.map((card) => ({
				...card,
				position: nextPositions[getTextCardNodeId(card.id)] ?? card.position,
			})),
		},
		positions: nextPositions,
		changed,
	};
}

export function getFileNodeId(path: string): string {
	return stableBaseboardId("file", path);
}

export function getTextCardNodeId(id: string): string {
	return stableBaseboardId("text", id);
}

export function getGroupNodeId(viewName: string, label: string): string {
	return stableBaseboardId("group", `${viewName}:${label}`);
}

export function getRelationshipEdgeId(relationship: BaseboardRelationship): string {
	return stableBaseboardId(
		"edge",
		`${relationship.sourcePath}->${relationship.targetPath}:${relationship.label ?? ""}`
	);
}

function layoutGroup(
	snapshot: BaseboardViewSnapshot,
	group: BaseboardViewSnapshot["groups"][number],
	groupIndex: number,
	options: MaterializeOptions,
	existingNodes: Map<string, CanvasNode>
): PositionedGroup {
	const nodeWidth = options.nodeWidth;
	const nodeHeight = options.nodeHeight;
	const columnWidth = nodeWidth + GROUP_PADDING * 2;
	const groupX = options.layout === "columns" ? groupIndex * (columnWidth + GROUP_GAP) : 0;
	const groupY = options.layout === "rows" ? calculateStackedGroupY(snapshot, groupIndex, options) : 0;
	const columns = options.layout === "rows" ? Math.min(GRID_COLUMNS, Math.max(1, group.entries.length)) : 1;
	const groupId = group.id || getGroupNodeId(snapshot.viewName, group.label);
	const hasExistingGroupPosition = existingNodes.has(groupId);

	const fileNodes = group.entries.map((entry, entryIndex) => {
		const row = Math.floor(entryIndex / columns);
		const column = entryIndex % columns;
		const generatedNode: CanvasFileNode = {
			id: getFileNodeId(entry.path),
			type: "file",
			file: entry.path,
			x: groupX + GROUP_PADDING + column * (nodeWidth + NODE_GAP),
			y:
				groupY +
				GROUP_HEADER_HEIGHT +
				GROUP_PADDING +
				row * (nodeHeight + NODE_GAP),
			width: nodeWidth,
			height: nodeHeight,
		};
		const positionedNode = applySnapshotPosition(generatedNode, entry.position);

		return applyExistingNodePosition(positionedNode, existingNodes, options, Boolean(entry.position));
	});

	const groupNode = buildGroupNode({
		id: groupId,
		label: group.label,
		x: groupX,
		y: groupY,
		fileNodes,
		options,
		useBoundingGroupNode:
			options.preservePositions &&
			!group.position &&
			!hasExistingGroupPosition &&
			group.entries.some(
				(entry) => entry.position || existingNodes.has(getFileNodeId(entry.path))
			),
	});

	const positionedGroupNode = applyExistingNodePosition(
		applySnapshotPosition(groupNode, group.position),
		existingNodes,
		options,
		Boolean(group.position)
	);

	return { groupNode: positionedGroupNode, fileNodes };
}

function layoutUngroupedGrid(
	snapshot: BaseboardViewSnapshot,
	options: MaterializeOptions,
	existingNodes: Map<string, CanvasNode>
): PositionedGroup {
	const entries = snapshot.groups.flatMap((group) => group.entries);
	const columns = Math.min(GRID_COLUMNS, Math.max(1, Math.ceil(Math.sqrt(entries.length))));
	const fileNodes = entries.map((entry, index) => {
		const row = Math.floor(index / columns);
		const column = index % columns;
		const generatedNode: CanvasFileNode = {
			id: getFileNodeId(entry.path),
			type: "file",
			file: entry.path,
			x: column * (options.nodeWidth + NODE_GAP),
			y: row * (options.nodeHeight + NODE_GAP),
			width: options.nodeWidth,
			height: options.nodeHeight,
		};
		const positionedNode = applySnapshotPosition(generatedNode, entry.position);

		return applyExistingNodePosition(positionedNode, existingNodes, options, Boolean(entry.position));
	});

	return { groupNode: null, fileNodes };
}

function layoutTextCards(
	snapshot: BaseboardViewSnapshot,
	options: MaterializeOptions,
	existingNodes: Map<string, CanvasNode>,
	generatedNodes: CanvasNode[]
): CanvasTextNode[] {
	const origin = getTextCardOrigin(generatedNodes);
	const textWidth = Math.max(220, options.nodeWidth);
	const textHeight = Math.max(120, options.nodeHeight);

	return snapshot.textCards.map((card, index) => {
		const generatedNode: CanvasTextNode = {
			id: getTextCardNodeId(card.id),
			type: "text",
			text: card.text,
			x: origin.x,
			y: origin.y + index * (textHeight + NODE_GAP),
			width: textWidth,
			height: textHeight,
		};
		const positionedNode = applySnapshotPosition(generatedNode, card.position);

		return applyExistingNodePosition(positionedNode, existingNodes, options, Boolean(card.position));
	});
}

function getTextCardOrigin(generatedNodes: CanvasNode[]): { x: number; y: number } {
	if (generatedNodes.length === 0) {
		return { x: 0, y: 0 };
	}

	const left = Math.min(...generatedNodes.map((node) => node.x));
	const bottom = Math.max(...generatedNodes.map((node) => node.y + node.height));

	return {
		x: left,
		y: bottom + GROUP_GAP,
	};
}

function getCanvasNodePosition(node: CanvasNode): BaseboardNodePosition {
	return {
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height,
	};
}

function buildGroupNode({
	id,
	label,
	x,
	y,
	fileNodes,
	options,
	useBoundingGroupNode,
}: {
	id: string;
	label: string;
	x: number;
	y: number;
	fileNodes: CanvasFileNode[];
	options: MaterializeOptions;
	useBoundingGroupNode: boolean;
}): CanvasGroupNode {
	if (useBoundingGroupNode && fileNodes.length > 0) {
		return buildBoundingGroupNode(id, label, fileNodes);
	}

	const rows =
		options.layout === "rows"
			? Math.ceil(fileNodes.length / Math.min(GRID_COLUMNS, Math.max(1, fileNodes.length)))
			: fileNodes.length;
	const columns =
		options.layout === "rows" ? Math.min(GRID_COLUMNS, Math.max(1, fileNodes.length)) : 1;

	return {
		id,
		type: "group",
		label,
		x,
		y,
		width: columns * options.nodeWidth + Math.max(0, columns - 1) * NODE_GAP + GROUP_PADDING * 2,
		height:
			GROUP_HEADER_HEIGHT +
			GROUP_PADDING * 2 +
			rows * options.nodeHeight +
			Math.max(0, rows - 1) * NODE_GAP,
	};
}

function buildBoundingGroupNode(
	id: string,
	label: string,
	fileNodes: CanvasFileNode[]
): CanvasGroupNode {
	const left = Math.min(...fileNodes.map((node) => node.x));
	const top = Math.min(...fileNodes.map((node) => node.y));
	const right = Math.max(...fileNodes.map((node) => node.x + node.width));
	const bottom = Math.max(...fileNodes.map((node) => node.y + node.height));

	return {
		id,
		type: "group",
		label,
		x: left - GROUP_PADDING,
		y: top - GROUP_HEADER_HEIGHT,
		width: right - left + GROUP_PADDING * 2,
		height: bottom - top + GROUP_HEADER_HEIGHT + GROUP_PADDING,
	};
}

function applyExistingNodePosition<T extends CanvasNode>(
	generatedNode: T,
	existingNodes: Map<string, CanvasNode>,
	options: MaterializeOptions,
	hasSnapshotPosition = false
): T {
	if (!options.preservePositions || hasSnapshotPosition) return generatedNode;

	const existingNode = existingNodes.get(generatedNode.id);
	if (!existingNode) return generatedNode;

	return {
		...generatedNode,
		x: existingNode.x,
		y: existingNode.y,
		width: existingNode.width,
		height: existingNode.height,
	};
}

function applySnapshotPosition<T extends CanvasNode>(
	generatedNode: T,
	position: BaseboardNodePosition | undefined
): T {
	if (!position) return generatedNode;

	return {
		...generatedNode,
		x: position.x,
		y: position.y,
		width: position.width,
		height: position.height,
	};
}

function calculateStackedGroupY(
	snapshot: BaseboardViewSnapshot,
	groupIndex: number,
	options: MaterializeOptions
): number {
	return snapshot.groups
		.slice(0, groupIndex)
		.reduce(
			(y, group) =>
				y + calculateGroupHeight(group.entries.length, options.nodeHeight) + GROUP_GAP,
			0
		);
}

function calculateGroupHeight(entryCount: number, nodeHeight: number): number {
	const rows = Math.max(1, Math.ceil(entryCount / GRID_COLUMNS));
	return (
		GROUP_HEADER_HEIGHT +
		GROUP_PADDING * 2 +
		rows * nodeHeight +
		Math.max(0, rows - 1) * NODE_GAP
	);
}

function buildRelationshipEdges(
	snapshot: BaseboardViewSnapshot,
	relationships: BaseboardRelationship[],
	generatedNodes: CanvasNode[]
): CanvasEdge[] {
	const visiblePaths = new Set(
		snapshot.groups.flatMap((group) => group.entries.map((entry) => entry.path))
	);
	const generatedNodesById = new Map(generatedNodes.map((node) => [node.id, node]));
	const deduped = new Map<string, CanvasEdge>();

	for (const relationship of relationships) {
		if (
			!visiblePaths.has(relationship.sourcePath) ||
			!visiblePaths.has(relationship.targetPath) ||
			relationship.sourcePath === relationship.targetPath
		) {
			continue;
		}

		const fromNodeId = getFileNodeId(relationship.sourcePath);
		const toNodeId = getFileNodeId(relationship.targetPath);
		const fromNode = generatedNodesById.get(fromNodeId);
		const toNode = generatedNodesById.get(toNodeId);
		if (!fromNode || !toNode) continue;

		const { fromSide, toSide } = getEdgeAttachmentSides(fromNode, toNode);
			const edge: CanvasEdge = {
				id: getRelationshipEdgeId(relationship),
			fromNode: fromNodeId,
			fromSide,
			toNode: toNodeId,
			toSide,
			toEnd: "arrow",
		};

		if (relationship.label) {
			edge.label = relationship.label;
		}

		deduped.set(edge.id, edge);
	}

	return [...deduped.values()];
}

function isBaseboardId(id: string): boolean {
	return id.startsWith(BASEBOARD_ID_PREFIX);
}
