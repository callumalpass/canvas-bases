import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { TFile } from "obsidian";
import { collectRelationships } from "../src/canvas/relationships";
import type { BaseboardViewSnapshot, MaterializeOptions } from "../src/types";

const baseOptions: MaterializeOptions = {
	canvasPath: "Baseboards/Test.canvas",
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
});

function snapshot(): BaseboardViewSnapshot {
	return {
		viewName: "Planning",
		totalEntries: 2,
		textCards: [],
		groups: [
			{
				id: "active",
				label: "Active",
				entries: [
					{ path: "Tasks/Alpha.md", name: "Alpha" },
					{ path: "Tasks/Beta.md", name: "Beta" },
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
	const file = Object.create(TFile.prototype) as TFile;
	file.path = path;
	file.name = path.split("/").pop() ?? path;
	file.basename = file.name.replace(/\.md$/u, "");
	file.extension = "md";
	return file;
}
