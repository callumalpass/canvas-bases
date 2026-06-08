export type CanvasSide = "top" | "right" | "bottom" | "left";
export type CanvasEnd = "none" | "arrow";

export interface CanvasBaseNode {
	id: string;
	type: "text" | "file" | "link" | "group";
	x: number;
	y: number;
	width: number;
	height: number;
	color?: string;
}

export interface CanvasFileNode extends CanvasBaseNode {
	type: "file";
	file: string;
	subpath?: string;
}

export interface CanvasGroupNode extends CanvasBaseNode {
	type: "group";
	label?: string;
	background?: string;
	backgroundStyle?: "cover" | "ratio" | "repeat";
}

export interface CanvasTextNode extends CanvasBaseNode {
	type: "text";
	text: string;
}

export interface CanvasLinkNode extends CanvasBaseNode {
	type: "link";
	url: string;
}

export type CanvasNode = CanvasFileNode | CanvasGroupNode | CanvasTextNode | CanvasLinkNode;

export interface CanvasEdge {
	id: string;
	fromNode: string;
	fromSide?: CanvasSide;
	fromEnd?: CanvasEnd;
	toNode: string;
	toSide?: CanvasSide;
	toEnd?: CanvasEnd;
	color?: string;
	label?: string;
}

export interface JsonCanvas {
	nodes?: CanvasNode[];
	edges?: CanvasEdge[];
}

export function parseJsonCanvas(value: string): JsonCanvas {
	const parsed = JSON.parse(value) as unknown;

	if (!isRecord(parsed)) {
		return {};
	}

	return {
		nodes: Array.isArray(parsed.nodes) ? filterCanvasNodes(parsed.nodes) : [],
		edges: Array.isArray(parsed.edges) ? filterCanvasEdges(parsed.edges) : [],
	};
}

export function stringifyJsonCanvas(canvas: JsonCanvas): string {
	return `${JSON.stringify(
		{
			nodes: canvas.nodes ?? [],
			edges: canvas.edges ?? [],
		},
		null,
		"\t"
	)}\n`;
}

function filterCanvasNodes(values: unknown[]): CanvasNode[] {
	return values.filter(isCanvasNode);
}

function filterCanvasEdges(values: unknown[]): CanvasEdge[] {
	return values.filter(isCanvasEdge);
}

function isCanvasNode(value: unknown): value is CanvasNode {
	if (!isRecord(value)) return false;

	return (
		typeof value.id === "string" &&
		typeof value.type === "string" &&
		typeof value.x === "number" &&
		typeof value.y === "number" &&
		typeof value.width === "number" &&
		typeof value.height === "number"
	);
}

function isCanvasEdge(value: unknown): value is CanvasEdge {
	if (!isRecord(value)) return false;

	return (
		typeof value.id === "string" &&
		typeof value.fromNode === "string" &&
		typeof value.toNode === "string"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
