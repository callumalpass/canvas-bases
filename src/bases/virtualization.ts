import type { CanvasEdge, CanvasNode } from "../canvas/jsonCanvas";

export const DEFAULT_VIRTUALIZATION_OVERSCAN = 720;
export const DEFAULT_VIRTUALIZATION_THRESHOLD = 160;

export interface CanvasViewportMetrics {
	scrollLeft: number;
	scrollTop: number;
	clientWidth: number;
	clientHeight: number;
}

export interface CanvasRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface CanvasVirtualizationOptions {
	zoom: number;
	overscan?: number;
	threshold?: number;
	alwaysRenderNodeIds?: ReadonlySet<string>;
}

export interface CanvasVirtualizationResult<TNode extends CanvasNode> {
	nodes: TNode[];
	visibleNodeIds: Set<string>;
	shouldVirtualize: boolean;
	visibleRect: CanvasRect | null;
}

export function getVisibleCanvasRect(
	viewport: CanvasViewportMetrics,
	zoom: number,
	overscan = DEFAULT_VIRTUALIZATION_OVERSCAN
): CanvasRect | null {
	if (viewport.clientWidth <= 0 || viewport.clientHeight <= 0) return null;

	const safeZoom = Math.max(zoom, 0.01);
	const scaledOverscan = overscan / safeZoom;

	return {
		x: viewport.scrollLeft / safeZoom - scaledOverscan,
		y: viewport.scrollTop / safeZoom - scaledOverscan,
		width: viewport.clientWidth / safeZoom + scaledOverscan * 2,
		height: viewport.clientHeight / safeZoom + scaledOverscan * 2,
	};
}

export function selectVirtualizedCanvasNodes<TNode extends CanvasNode>(
	nodes: TNode[],
	viewport: CanvasViewportMetrics,
	options: CanvasVirtualizationOptions
): CanvasVirtualizationResult<TNode> {
	const threshold = options.threshold ?? DEFAULT_VIRTUALIZATION_THRESHOLD;
	const virtualizableCount = nodes.filter(isVirtualizableNode).length;
	const visibleRect = getVisibleCanvasRect(viewport, options.zoom, options.overscan);
	const shouldVirtualize = virtualizableCount > threshold && visibleRect !== null;

	if (!shouldVirtualize) {
		return {
			nodes,
			visibleNodeIds: new Set(nodes.map((node) => node.id)),
			shouldVirtualize: false,
			visibleRect,
		};
	}

	const selectedNodes = nodes.filter(
		(node) =>
			node.type === "group" ||
			options.alwaysRenderNodeIds?.has(node.id) ||
			intersectsRect(node, visibleRect)
	);

	return {
		nodes: selectedNodes,
		visibleNodeIds: new Set(selectedNodes.map((node) => node.id)),
		shouldVirtualize: true,
		visibleRect,
	};
}

export function filterEdgesForVisibleNodes(
	edges: CanvasEdge[],
	visibleNodeIds: ReadonlySet<string>,
	shouldVirtualize: boolean
): CanvasEdge[] {
	if (!shouldVirtualize) return edges;

	return edges.filter(
		(edge) => visibleNodeIds.has(edge.fromNode) && visibleNodeIds.has(edge.toNode)
	);
}

function isVirtualizableNode(node: CanvasNode): boolean {
	return node.type === "file" || node.type === "text";
}

function intersectsRect(node: CanvasNode, rect: CanvasRect): boolean {
	return (
		node.x < rect.x + rect.width &&
		node.x + node.width > rect.x &&
		node.y < rect.y + rect.height &&
		node.y + node.height > rect.y
	);
}
