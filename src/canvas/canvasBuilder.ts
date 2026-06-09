import type {
	CanvasBasesNodePosition,
	CanvasBasesNodePositionMap,
	CanvasBasesRelationship,
	CanvasBasesViewSnapshot,
	MaterializeOptions,
} from "../types";
import { stableCanvasBasesId } from "../utils/hash";
import { getSnapshotEntries } from "../bases/snapshotEntries";
import { normalizeCanvasNodeColor } from "./colors";
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
const CANVAS_BASES_ID_PREFIX = "canvas-bases-";

type PositionedGroup = {
	groupNode: CanvasGroupNode | null;
	fileNodes: CanvasFileNode[];
};

export interface InitializedTextCardPositions {
	snapshot: CanvasBasesViewSnapshot;
	positions: CanvasBasesNodePositionMap;
	changed: boolean;
}

export function buildCanvasBasesCanvas(
	snapshot: CanvasBasesViewSnapshot,
	options: MaterializeOptions,
	relationships: CanvasBasesRelationship[] = [],
	existingCanvas: JsonCanvas = {}
): JsonCanvas {
	const existingNodes = new Map((existingCanvas.nodes ?? []).map((node) => [node.id, node]));
	const generatedGroups =
		options.layout === "grid" || hasOnlyImplicitGroups(snapshot)
		? [layoutUngrouped(snapshot, options, existingNodes)]
		: snapshot.groups.map((group, groupIndex) =>
					layoutGroup(snapshot, group, groupIndex, options, existingNodes)
				);

	const generatedDataNodes = generatedGroups.flatMap((group) =>
		group.groupNode ? [group.groupNode, ...group.fileNodes] : group.fileNodes
	);
	const generatedManualGroups = layoutManualGroups(
		snapshot,
		options,
		existingNodes,
		generatedDataNodes
	);
	const generatedManualFiles = layoutManualEntries(
		snapshot,
		options,
		existingNodes,
		generatedDataNodes,
		generatedManualGroups
	);
	const generatedLayoutNodes = [
		...generatedDataNodes,
		...generatedManualGroups,
		...generatedManualFiles,
	];
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
		if (!isCanvasBasesId(node.id)) return true;
		if (generatedNodeIds.has(node.id)) return false;
		return !options.removeMissingNodes;
	});

	const preservedEdges = (existingCanvas.edges ?? []).filter((edge) => {
		if (!isCanvasBasesId(edge.id)) return true;
		if (generatedEdgeIds.has(edge.id)) return false;
		return !options.removeMissingNodes;
	});

	return {
		nodes: [...generatedNodes, ...preservedNodes],
		edges: [...generatedEdges, ...preservedEdges],
	};
}

export function initializeTextCardPositions(
	snapshot: CanvasBasesViewSnapshot,
	options: MaterializeOptions,
	positions: CanvasBasesNodePositionMap
): InitializedTextCardPositions {
	const missingCardNodeIds = snapshot.textCards
		.map((card) => getTextCardNodeId(card.id))
		.filter((nodeId) => !positions[nodeId]);

	if (missingCardNodeIds.length === 0) {
		return { snapshot, positions, changed: false };
	}

	const missingIds = new Set(missingCardNodeIds);
	const canvas = buildCanvasBasesCanvas(snapshot, options);
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
	return stableCanvasBasesId("file", path);
}

export function getTextCardNodeId(id: string): string {
	return stableCanvasBasesId("text", id);
}

export function getManualGroupNodeId(id: string): string {
	return stableCanvasBasesId("manual-group", id);
}

export function getGroupNodeId(viewName: string, label: string): string {
	return stableCanvasBasesId("group", `${viewName}:${label}`);
}

export function getRelationshipEdgeId(relationship: CanvasBasesRelationship): string {
	return stableCanvasBasesId(
		"edge",
		`${relationship.sourcePath}->${relationship.targetPath}:${relationship.label ?? ""}`
	);
}

function layoutGroup(
	snapshot: CanvasBasesViewSnapshot,
	group: CanvasBasesViewSnapshot["groups"][number],
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
	});

	const positionedGroupNode = applyExistingNodePosition(
		applySnapshotPosition(groupNode, group.position),
		existingNodes,
		options,
		Boolean(group.position)
	);

	return { groupNode: positionedGroupNode, fileNodes };
}

function layoutUngrouped(
	snapshot: CanvasBasesViewSnapshot,
	options: MaterializeOptions,
	existingNodes: Map<string, CanvasNode>
): PositionedGroup {
	const entries = getSnapshotEntries(snapshot);
	const columns = getUngroupedColumnCount(entries.length, options.layout);
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

function hasOnlyImplicitGroups(snapshot: CanvasBasesViewSnapshot): boolean {
	return snapshot.groups.length > 0 && snapshot.groups.every((group) => group.isImplicit);
}

function getUngroupedColumnCount(entryCount: number, layout: MaterializeOptions["layout"]): number {
	if (layout === "columns") return 1;
	if (layout === "rows") return Math.min(GRID_COLUMNS, Math.max(1, entryCount));

	return Math.min(GRID_COLUMNS, Math.max(1, Math.ceil(Math.sqrt(entryCount))));
}

function layoutManualGroups(
	snapshot: CanvasBasesViewSnapshot,
	options: MaterializeOptions,
	existingNodes: Map<string, CanvasNode>,
	generatedDataNodes: CanvasNode[]
): CanvasGroupNode[] {
	const defaultWidth = Math.max(320, options.nodeWidth + GROUP_PADDING * 2);
	const defaultHeight =
		GROUP_HEADER_HEIGHT + GROUP_PADDING * 2 + options.nodeHeight + NODE_GAP;
	const origin = getTextCardOrigin(generatedDataNodes);

	return (snapshot.manualGroups ?? []).map((group, index) => {
		const groupId = getManualGroupNodeId(group.id);
		const generatedNode: CanvasGroupNode = {
			id: groupId,
			type: "group",
			label: group.label,
			x: origin.x,
			y: origin.y + index * (defaultHeight + GROUP_GAP),
			width: defaultWidth,
			height: defaultHeight,
		};
		const positionedNode = applySnapshotPosition(generatedNode, group.position);

		return applyExistingNodePosition(positionedNode, existingNodes, options, Boolean(group.position));
	});
}

function layoutManualEntries(
	snapshot: CanvasBasesViewSnapshot,
	options: MaterializeOptions,
	existingNodes: Map<string, CanvasNode>,
	generatedDataNodes: CanvasNode[],
	manualGroupNodes: CanvasGroupNode[]
): CanvasFileNode[] {
	const nodeWidth = options.nodeWidth;
	const nodeHeight = options.nodeHeight;
	const origin = getManualEntryOrigin(generatedDataNodes, manualGroupNodes);

	return (snapshot.manualEntries ?? []).map((entry, index) => {
		const generatedNode: CanvasFileNode = {
			id: getFileNodeId(entry.path),
			type: "file",
			file: entry.path,
			x: origin.x,
			y: origin.y + index * (nodeHeight + NODE_GAP),
			width: nodeWidth,
			height: nodeHeight,
		};
		const positionedNode = applySnapshotPosition(generatedNode, entry.position);

		return applyExistingNodePosition(positionedNode, existingNodes, options, Boolean(entry.position));
	});
}

function getManualEntryOrigin(
	generatedDataNodes: CanvasNode[],
	manualGroupNodes: CanvasGroupNode[]
): { x: number; y: number } {
	const firstGroup = manualGroupNodes[0];
	if (firstGroup) {
		return {
			x: firstGroup.x + GROUP_PADDING,
			y: firstGroup.y + GROUP_HEADER_HEIGHT + GROUP_PADDING,
		};
	}

	return getTextCardOrigin(generatedDataNodes);
}

function layoutTextCards(
	snapshot: CanvasBasesViewSnapshot,
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

function getCanvasNodePosition(node: CanvasNode): CanvasBasesNodePosition {
	const color = normalizeCanvasNodeColor(node.color);
	return {
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height,
		...(color ? { color } : {}),
	};
}

function buildGroupNode({
	id,
	label,
	x,
	y,
	fileNodes,
	options,
}: {
	id: string;
	label: string;
	x: number;
	y: number;
	fileNodes: CanvasFileNode[];
	options: MaterializeOptions;
}): CanvasGroupNode {
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
		color: normalizeCanvasNodeColor(existingNode.color),
	};
}

function applySnapshotPosition<T extends CanvasNode>(
	generatedNode: T,
	position: CanvasBasesNodePosition | undefined
): T {
	if (!position) return generatedNode;

	return {
		...generatedNode,
		x: position.x,
		y: position.y,
		width: position.width,
		height: position.height,
		color: normalizeCanvasNodeColor(position.color),
	};
}

function calculateStackedGroupY(
	snapshot: CanvasBasesViewSnapshot,
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
	snapshot: CanvasBasesViewSnapshot,
	relationships: CanvasBasesRelationship[],
	generatedNodes: CanvasNode[]
): CanvasEdge[] {
	const visiblePaths = new Set(getSnapshotEntries(snapshot).map((entry) => entry.path));
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

function isCanvasBasesId(id: string): boolean {
	return id.startsWith(CANVAS_BASES_ID_PREFIX);
}
