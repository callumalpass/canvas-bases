import type { CanvasBasesNodePosition } from "../types";
import {
	getEdgeAttachmentSides,
	getNodeAnchor,
	getSideVector,
	type Point,
} from "../canvas/edgeRouting";
import type { CanvasEdge } from "../canvas/jsonCanvas";

const MIN_CURVE_TENSION = 48;
const MAX_CURVE_TENSION = 220;
const LABEL_HEIGHT = 20;
const LABEL_PADDING_X = 8;
const LABEL_CHAR_WIDTH = 6.8;

export interface CanvasBasesEdgeLabelGeometry {
	x: number;
	y: number;
	width: number;
	height: number;
	textX: number;
	textY: number;
}

export interface CanvasBasesEdgeGeometry {
	path: string;
	label: CanvasBasesEdgeLabelGeometry | null;
}

export function buildCanvasBasesEdgeGeometry(
	edge: CanvasEdge,
	nodePositions: ReadonlyMap<string, CanvasBasesNodePosition>
): CanvasBasesEdgeGeometry | null {
	const fromNode = nodePositions.get(edge.fromNode);
	const toNode = nodePositions.get(edge.toNode);
	if (!fromNode || !toNode) return null;

	const { fromSide, toSide } = getEdgeAttachmentSides(fromNode, toNode);
	const from = getNodeAnchor(fromNode, fromSide);
	const to = getNodeAnchor(toNode, toSide);
	const distance = Math.hypot(to.x - from.x, to.y - from.y);
	const tension = clamp(distance * 0.36, MIN_CURVE_TENSION, MAX_CURVE_TENSION);
	const fromVector = getSideVector(fromSide);
	const toVector = getSideVector(toSide);
	const control1 = {
		x: from.x + fromVector.x * tension,
		y: from.y + fromVector.y * tension,
	};
	const control2 = {
		x: to.x + toVector.x * tension,
		y: to.y + toVector.y * tension,
	};
	const labelPoint = getCubicPoint(from, control1, control2, to, 0.5);

	return {
		path: [
			`M ${round(from.x)} ${round(from.y)}`,
			`C ${round(control1.x)} ${round(control1.y)}`,
			`${round(control2.x)} ${round(control2.y)}`,
			`${round(to.x)} ${round(to.y)}`,
		].join(" "),
		label: edge.label ? buildLabelGeometry(edge.label, labelPoint) : null,
	};
}

function getCubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
	const inverse = 1 - t;
	const inverseSquared = inverse * inverse;
	const tSquared = t * t;

	return {
		x:
			inverseSquared * inverse * p0.x +
			3 * inverseSquared * t * p1.x +
			3 * inverse * tSquared * p2.x +
			tSquared * t * p3.x,
		y:
			inverseSquared * inverse * p0.y +
			3 * inverseSquared * t * p1.y +
			3 * inverse * tSquared * p2.y +
			tSquared * t * p3.y,
	};
}

function buildLabelGeometry(label: string, point: Point): CanvasBasesEdgeLabelGeometry {
	const width = Math.max(28, Math.round(label.length * LABEL_CHAR_WIDTH + LABEL_PADDING_X * 2));

	return {
		x: round(point.x - width / 2),
		y: round(point.y - LABEL_HEIGHT / 2),
		width,
		height: LABEL_HEIGHT,
		textX: round(point.x),
		textY: round(point.y + 4),
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
	return Math.round(value * 100) / 100;
}
