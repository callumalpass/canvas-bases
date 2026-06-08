import { describe, expect, it } from "vitest";
import {
	buildBaseboardCanvas,
	getFileNodeId,
	getGroupNodeId,
} from "../src/canvas/canvasBuilder";
import type { CanvasEdge, CanvasGroupNode, JsonCanvas } from "../src/canvas/jsonCanvas";
import type { BaseboardViewSnapshot, MaterializeOptions } from "../src/types";

const baseOptions: MaterializeOptions = {
	canvasPath: "Baseboards/Test.canvas",
	layout: "columns",
	edgeMode: "wikilinks",
	edgeProperties: [],
	showBodyEditor: true,
	taskNotesMode: "auto",
	taskNotesShowBadges: true,
	taskNotesShowActions: true,
	taskNotesRelationships: "dependencies",
	preservePositions: true,
	removeMissingNodes: true,
	nodeWidth: 260,
	nodeHeight: 110,
};

const snapshot: BaseboardViewSnapshot = {
	viewName: "Planning",
	totalEntries: 3,
	textCards: [],
	groups: [
		{
			id: "group-a",
			label: "Active",
			entries: [
				{ path: "Tasks/A.md", name: "A" },
				{ path: "Tasks/B.md", name: "B" },
			],
		},
		{
			id: "group-b",
			label: "Waiting",
			entries: [{ path: "Tasks/C.md", name: "C" }],
		},
	],
};

describe("buildBaseboardCanvas", () => {
	it("materializes groups, file nodes, and scoped edges", () => {
		const canvas = buildBaseboardCanvas(snapshot, baseOptions, [
			{ sourcePath: "Tasks/A.md", targetPath: "Tasks/B.md" },
			{ sourcePath: "Tasks/A.md", targetPath: "Outside.md" },
		]);

		expect(canvas.nodes).toHaveLength(5);
		expect(canvas.edges).toHaveLength(1);
		expect(canvas.nodes?.map((node) => node.type)).toEqual([
			"group",
			"file",
			"file",
			"group",
			"file",
		]);
		expect(canvas.edges?.[0]).toMatchObject({
			fromNode: getFileNodeId("Tasks/A.md"),
			toNode: getFileNodeId("Tasks/B.md"),
			toEnd: "arrow",
		});
	});

	it("lays out grouped columns side by side", () => {
		const canvas = buildBaseboardCanvas(snapshot, {
			...baseOptions,
			layout: "columns",
			preservePositions: false,
		});
		const activeGroup = getGroupNode(canvas, "Active");
		const waitingGroup = getGroupNode(canvas, "Waiting");

		expect(activeGroup).toMatchObject({
			x: 0,
			y: 0,
		});
		expect(waitingGroup.x).toBeGreaterThan(activeGroup.x + activeGroup.width);
		expect(waitingGroup.y).toBe(activeGroup.y);
	});

	it("chooses exported edge sides from generated node geometry", () => {
		const canvas = buildBaseboardCanvas(
			snapshot,
			{
				...baseOptions,
				layout: "columns",
				preservePositions: false,
			},
			[
				{ sourcePath: "Tasks/A.md", targetPath: "Tasks/B.md" },
				{ sourcePath: "Tasks/C.md", targetPath: "Tasks/A.md" },
			]
		);
		const verticalEdge = getEdge(canvas, "Tasks/A.md", "Tasks/B.md");
		const horizontalEdge = getEdge(canvas, "Tasks/C.md", "Tasks/A.md");

		expect(verticalEdge).toMatchObject({
			fromSide: "bottom",
			toSide: "top",
		});
		expect(horizontalEdge).toMatchObject({
			fromSide: "left",
			toSide: "right",
		});
	});

	it("lays out grouped rows in a vertical stack using cumulative group heights", () => {
		const variedSnapshot: BaseboardViewSnapshot = {
			viewName: "Planning",
			totalEntries: 8,
			textCards: [],
			groups: [
				{
					id: getGroupNodeId("Planning", "One"),
					label: "One",
					entries: [{ path: "Tasks/1.md", name: "1" }],
				},
				{
					id: getGroupNodeId("Planning", "Many"),
					label: "Many",
					entries: [
						{ path: "Tasks/2.md", name: "2" },
						{ path: "Tasks/3.md", name: "3" },
						{ path: "Tasks/4.md", name: "4" },
						{ path: "Tasks/5.md", name: "5" },
						{ path: "Tasks/6.md", name: "6" },
					],
				},
				{
					id: getGroupNodeId("Planning", "Last"),
					label: "Last",
					entries: [
						{ path: "Tasks/7.md", name: "7" },
						{ path: "Tasks/8.md", name: "8" },
					],
				},
			],
		};
		const canvas = buildBaseboardCanvas(variedSnapshot, {
			...baseOptions,
			layout: "rows",
			preservePositions: false,
		});
		const firstGroup = getGroupNode(canvas, "One");
		const secondGroup = getGroupNode(canvas, "Many");
		const thirdGroup = getGroupNode(canvas, "Last");

		expect(secondGroup.x).toBe(firstGroup.x);
		expect(thirdGroup.x).toBe(firstGroup.x);
		expect(secondGroup.y).toBeGreaterThan(firstGroup.y + firstGroup.height);
		expect(thirdGroup.y).toBeGreaterThan(secondGroup.y + secondGroup.height);
	});

	it("preserves existing Baseboard node positions and manual nodes", () => {
		const existing: JsonCanvas = {
			nodes: [
				{
					id: getFileNodeId("Tasks/A.md"),
					type: "file",
					file: "Tasks/A.md",
					x: 900,
					y: 700,
					width: 300,
					height: 120,
				},
				{
					id: "manual-note",
					type: "text",
					text: "Keep me",
					x: 20,
					y: 20,
					width: 200,
					height: 80,
				},
			],
			edges: [
				{
					id: "manual-edge",
					fromNode: "manual-note",
					toNode: getFileNodeId("Tasks/A.md"),
				},
			],
		};

		const canvas = buildBaseboardCanvas(snapshot, baseOptions, [], existing);
		const preservedNode = canvas.nodes?.find((node) => node.id === getFileNodeId("Tasks/A.md"));

		expect(preservedNode).toMatchObject({
			x: 900,
			y: 700,
			width: 300,
			height: 120,
		});
		expect(canvas.nodes?.some((node) => node.id === "manual-note")).toBe(true);
		expect(canvas.edges?.some((edge) => edge.id === "manual-edge")).toBe(true);
	});

	it("uses snapshot positions before existing canvas positions", () => {
		const positionedSnapshot: BaseboardViewSnapshot = {
			...snapshot,
			groups: [
				{
					...snapshot.groups[0],
					position: {
						x: 100,
						y: 120,
						width: 360,
						height: 260,
					},
					entries: [
						{
							...snapshot.groups[0].entries[0],
							position: {
								x: 140,
								y: 190,
								width: 280,
								height: 120,
							},
						},
						snapshot.groups[0].entries[1],
					],
				},
				snapshot.groups[1],
			],
		};
		const existing: JsonCanvas = {
			nodes: [
				{
					id: getFileNodeId("Tasks/A.md"),
					type: "file",
					file: "Tasks/A.md",
					x: 900,
					y: 700,
					width: 300,
					height: 120,
				},
				{
					id: snapshot.groups[0].id,
					type: "group",
					label: "Active",
					x: 800,
					y: 600,
					width: 300,
					height: 300,
				},
			],
		};
		const canvas = buildBaseboardCanvas(positionedSnapshot, baseOptions, [], existing);

		expect(canvas.nodes?.find((node) => node.id === getFileNodeId("Tasks/A.md"))).toMatchObject({
			x: 140,
			y: 190,
			width: 280,
			height: 120,
		});
		expect(getGroupNode(canvas, "Active")).toMatchObject({
			x: 100,
			y: 120,
			width: 360,
			height: 260,
		});
	});

	it("can generate a flat grid without group nodes", () => {
		const canvas = buildBaseboardCanvas(snapshot, { ...baseOptions, layout: "grid" });

		expect(canvas.nodes?.every((node) => node.type === "file")).toBe(true);
		expect(canvas.nodes).toHaveLength(3);
	});

	it("materializes Baseboard text cards as native canvas text nodes", () => {
		const canvas = buildBaseboardCanvas({
			...snapshot,
			textCards: [
				{
					id: "planning-note",
					text: "Check dependencies before scheduling.",
				},
			],
		}, baseOptions);
		const textNode = canvas.nodes?.find((node) => node.type === "text");

		expect(textNode).toMatchObject({
			type: "text",
			text: "Check dependencies before scheduling.",
			x: 0,
			y: 362,
			width: 260,
			height: 120,
		});
	});
});

function getGroupNode(canvas: JsonCanvas, label: string): CanvasGroupNode {
	const group = canvas.nodes?.find(
		(node): node is CanvasGroupNode => node.type === "group" && node.label === label
	);

	if (!group) {
		throw new Error(`Missing group node: ${label}`);
	}

	return group;
}

function getEdge(canvas: JsonCanvas, sourcePath: string, targetPath: string): CanvasEdge {
	const edge = canvas.edges?.find(
		(candidate) =>
			candidate.fromNode === getFileNodeId(sourcePath) &&
			candidate.toNode === getFileNodeId(targetPath)
	);

	if (!edge) {
		throw new Error(`Missing edge: ${sourcePath} -> ${targetPath}`);
	}

	return edge;
}
