import type { CanvasBasesNodePosition } from "../types";
import type { CanvasSide } from "./jsonCanvas";

export interface EdgeAttachmentSides {
	fromSide: CanvasSide;
	toSide: CanvasSide;
}

export interface Point {
	x: number;
	y: number;
}

export function getEdgeAttachmentSides(
	fromNode: CanvasBasesNodePosition,
	toNode: CanvasBasesNodePosition
): EdgeAttachmentSides {
	const fromCenter = getNodeCenter(fromNode);
	const toCenter = getNodeCenter(toNode);
	const deltaX = toCenter.x - fromCenter.x;
	const deltaY = toCenter.y - fromCenter.y;
	const useHorizontalRoute = Math.abs(deltaX) >= Math.abs(deltaY);
	const fromSide = useHorizontalRoute
		? deltaX >= 0 ? "right" : "left"
		: deltaY >= 0 ? "bottom" : "top";

	return {
		fromSide,
		toSide: getOppositeSide(fromSide),
	};
}

export function getNodeAnchor(node: CanvasBasesNodePosition, side: CanvasSide): Point {
	switch (side) {
		case "top":
			return { x: node.x + node.width / 2, y: node.y };
		case "right":
			return { x: node.x + node.width, y: node.y + node.height / 2 };
		case "bottom":
			return { x: node.x + node.width / 2, y: node.y + node.height };
		case "left":
			return { x: node.x, y: node.y + node.height / 2 };
	}
}

export function getSideVector(side: CanvasSide): Point {
	switch (side) {
		case "top":
			return { x: 0, y: -1 };
		case "right":
			return { x: 1, y: 0 };
		case "bottom":
			return { x: 0, y: 1 };
		case "left":
			return { x: -1, y: 0 };
	}
}

function getNodeCenter(node: CanvasBasesNodePosition): Point {
	return {
		x: node.x + node.width / 2,
		y: node.y + node.height / 2,
	};
}

function getOppositeSide(side: CanvasSide): CanvasSide {
	switch (side) {
		case "top":
			return "bottom";
		case "right":
			return "left";
		case "bottom":
			return "top";
		case "left":
			return "right";
	}
}
