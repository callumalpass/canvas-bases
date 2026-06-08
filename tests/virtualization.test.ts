import { describe, expect, it } from "vitest";
import type { CanvasEdge, CanvasNode } from "../src/canvas/jsonCanvas";
import {
	filterEdgesForVisibleNodes,
	getVisibleCanvasRect,
	selectVirtualizedCanvasNodes,
} from "../src/bases/virtualization";

describe("canvas virtualization", () => {
	it("returns all nodes below the virtualization threshold", () => {
		const nodes = [
			group("group"),
			file("near", 0, 0),
			file("far", 10_000, 10_000),
		];

		const result = selectVirtualizedCanvasNodes(nodes, viewport(), {
			zoom: 1,
			threshold: 10,
		});

		expect(result.shouldVirtualize).toBe(false);
		expect(result.nodes.map((node) => node.id)).toEqual(["group", "near", "far"]);
	});

	it("keeps groups and visible cards when above the threshold", () => {
		const nodes = [
			group("group-a"),
			group("group-b"),
			file("near", 50, 50),
			file("edge", 900, 500),
			file("far", 4_000, 4_000),
			text("note", 100, 600),
		];

		const result = selectVirtualizedCanvasNodes(nodes, viewport(), {
			zoom: 1,
			overscan: 0,
			threshold: 2,
		});

		expect(result.shouldVirtualize).toBe(true);
		expect(result.nodes.map((node) => node.id)).toEqual([
			"group-a",
			"group-b",
			"near",
			"edge",
		]);
	});

	it("uses zoom when translating viewport pixels into canvas coordinates", () => {
		expect(getVisibleCanvasRect(
			{
				scrollLeft: 200,
				scrollTop: 100,
				clientWidth: 800,
				clientHeight: 400,
			},
			2,
			40
		)).toEqual({
			x: 80,
			y: 30,
			width: 440,
			height: 240,
		});
	});

	it("can force nodes to stay mounted outside the visible rect", () => {
		const result = selectVirtualizedCanvasNodes(
			[
				file("near", 10, 10),
				file("dragging", 5_000, 5_000),
				file("far", 7_000, 7_000),
			],
			viewport(),
			{
				zoom: 1,
				overscan: 0,
				threshold: 1,
				alwaysRenderNodeIds: new Set(["dragging"]),
			}
		);

		expect(result.nodes.map((node) => node.id)).toEqual(["near", "dragging"]);
	});

	it("filters edges to mounted endpoints while virtualized", () => {
		const edges = [
			edge("visible", "a", "b"),
			edge("hidden-source", "c", "b"),
			edge("hidden-target", "a", "d"),
		];

		expect(filterEdgesForVisibleNodes(edges, new Set(["a", "b"]), true)).toEqual([
			edges[0],
		]);
		expect(filterEdgesForVisibleNodes(edges, new Set(["a", "b"]), false)).toEqual(edges);
	});
});

function viewport() {
	return {
		scrollLeft: 0,
		scrollTop: 0,
		clientWidth: 1_000,
		clientHeight: 600,
	};
}

function group(id: string): CanvasNode {
	return {
		id,
		type: "group",
		x: 0,
		y: 0,
		width: 300,
		height: 300,
	};
}

function file(id: string, x: number, y: number): CanvasNode {
	return {
		id,
		type: "file",
		file: `${id}.md`,
		x,
		y,
		width: 200,
		height: 100,
	};
}

function text(id: string, x: number, y: number): CanvasNode {
	return {
		id,
		type: "text",
		text: id,
		x,
		y,
		width: 200,
		height: 100,
	};
}

function edge(id: string, fromNode: string, toNode: string): CanvasEdge {
	return {
		id,
		fromNode,
		toNode,
	};
}
