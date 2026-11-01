import { describe, expect, it } from "vitest";
import type { App, TFile } from "obsidian";
import { collectRelationships, normalizeLinkText } from "../src/canvas/relationships";
import type { CanvasBasesViewSnapshot, MaterializeOptions } from "../src/types";
import { makeMockTFile } from "./obsidianMockUtils";

const baseOptions: MaterializeOptions = {
	canvasPath: "Canvas Bases/Test.canvas",
	layout: "columns",
	edgeMode: "properties",
	edgeProperties: ["related"],
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

describe("collectRelationships", () => {
	it("marks frontmatter property links with removable property metadata", () => {
		const alpha = makeTFile("Tasks/Alpha.md");
		const beta = makeTFile("Tasks/Beta.md");
		const app = makeApp([alpha, beta], {
			"Tasks/Alpha.md": {
				frontmatter: {
					related: ["[[Tasks/Beta]]"],
				},
			},
		});

		expect(collectRelationships(app, snapshot(), baseOptions)).toEqual([
			{
				sourcePath: "Tasks/Alpha.md",
				targetPath: "Tasks/Beta.md",
				label: "related",
				metadata: {
					source: "property",
					property: "related",
				},
			},
		]);
	});

	it("resolves Markdown links in frontmatter properties", () => {
		const alpha = makeTFile("Tasks/Alpha.md");
		const beta = makeTFile("Tasks/Beta.md");
		const gamma = makeTFile("Tasks/My Gamma.md");
		const app = makeApp([alpha, beta, gamma], {
			"Tasks/Alpha.md": {
				frontmatter: {
					related: [
						"[Beta](Tasks/Beta.md)",
						"see [Gamma](<Tasks/My Gamma.md#Heading>)",
						"[External](https://example.com/Tasks/Beta.md)",
					],
				},
			},
			"Tasks/Beta.md": {
				frontmatter: {
					related: "[My Gamma](Tasks/My%20Gamma.md)",
				},
			},
		});

		expect(
			collectRelationships(app, snapshot(["Tasks/My Gamma.md"]), baseOptions).map(
				({ sourcePath, targetPath }) => [sourcePath, targetPath]
			)
		).toEqual([
			["Tasks/Alpha.md", "Tasks/Beta.md"],
			["Tasks/Alpha.md", "Tasks/My Gamma.md"],
			["Tasks/Beta.md", "Tasks/My Gamma.md"],
		]);
	});
});

describe("normalizeLinkText", () => {
	it("extracts link paths from wikilinks and Markdown links", () => {
		expect(normalizeLinkText("[[Tasks/Beta|Beta]]")).toBe("Tasks/Beta");
		expect(normalizeLinkText("[Beta](Tasks/My%20Beta.md#Notes)")).toBe("Tasks/My Beta.md");
		expect(normalizeLinkText("[Beta](https://example.com)")).toBe("");
		expect(normalizeLinkText("Tasks/Beta")).toBe("Tasks/Beta");
	});
});

function snapshot(extraPaths: string[] = []): CanvasBasesViewSnapshot {
	return {
		viewName: "Planning",
		totalEntries: 2 + extraPaths.length,
		textCards: [],
		groups: [
			{
				id: "active",
				label: "Active",
				entries: [
					{ path: "Tasks/Alpha.md", name: "Alpha" },
					{ path: "Tasks/Beta.md", name: "Beta" },
					...extraPaths.map((path) => ({ path, name: path })),
				],
			},
		],
	};
}

function makeApp(files: TFile[], caches: Record<string, unknown>): App {
	const fileMap = new Map(files.map((file) => [file.path, file]));
	return {
		vault: {
			getAbstractFileByPath: (path: string) => fileMap.get(path) ?? null,
		},
		metadataCache: {
			getFileCache: (file: TFile) => caches[file.path] ?? {},
			getFirstLinkpathDest: (linkpath: string) =>
				fileMap.get(linkpath.endsWith(".md") ? linkpath : `${linkpath}.md`) ?? null,
		},
	} as unknown as App;
}

function makeTFile(path: string): TFile {
	return makeMockTFile(path);
}
