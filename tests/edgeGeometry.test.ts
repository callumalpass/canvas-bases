import { describe, expect, it } from "vitest";
import { buildBaseboardEdgeGeometry } from "../src/bases/edgeGeometry";
import type { BaseboardNodePosition } from "../src/types";
import type { CanvasEdge } from "../src/canvas/jsonCanvas";

describe("buildBaseboardEdgeGeometry", () => {
	it("routes horizontal edges from right to left when the target is to the right", () => {
		const geometry = buildBaseboardEdgeGeometry(edge(), positions({
			source: { x: 100, y: 120, width: 200, height: 100 },
			target: { x: 500, y: 140, width: 200, height: 100 },
		}));

		expect(geometry?.path).toMatch(/^M 300 170 C /u);
		expect(geometry?.path).toMatch(/ 500 190$/u);
	});

	it("routes vertical edges when the target is below the source", () => {
		const geometry = buildBaseboardEdgeGeometry(edge(), positions({
			source: { x: 100, y: 100, width: 180, height: 100 },
			target: { x: 130, y: 420, width: 180, height: 100 },
		}));

		expect(geometry?.path).toMatch(/^M 190 200 C /u);
		expect(geometry?.path).toMatch(/ 220 420$/u);
	});

	it("includes label geometry for labelled property edges", () => {
		const geometry = buildBaseboardEdgeGeometry(edge("depends_on"), positions({
			source: { x: 0, y: 0, width: 160, height: 80 },
			target: { x: 360, y: 0, width: 160, height: 80 },
		}));

		expect(geometry?.label).toMatchObject({
			height: 20,
			textX: 260,
			textY: 44,
		});
		expect(geometry?.label?.width).toBeGreaterThan(70);
	});

	it("returns null when either endpoint is missing", () => {
		const geometry = buildBaseboardEdgeGeometry(edge(), positions({
			source: { x: 0, y: 0, width: 160, height: 80 },
		}));

		expect(geometry).toBeNull();
	});
});

function edge(label?: string): CanvasEdge {
	return {
		id: "edge",
		fromNode: "source",
		toNode: "target",
		toEnd: "arrow",
		label,
	};
}

function positions(
	values: Record<string, BaseboardNodePosition>
): Map<string, BaseboardNodePosition> {
	return new Map(Object.entries(values));
}
