import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import type { App, BasesQueryResult, BasesViewConfig } from "obsidian";
import {
	buildActiveBasesViewKey,
	getActiveBasesViewSource,
} from "../src/bases/activeBasesView";

describe("getActiveBasesViewSource", () => {
	it("reads the active native Bases view data as a Baseboard source", () => {
		const baseFile = makeTFile("Views/Planning.base", "Planning", "base");
		const alphaFile = makeTFile("Tasks/Alpha.md", "Alpha", "md");
		const betaFile = makeTFile("Tasks/Beta.md", "Beta", "md");
		const config = makeViewConfig("Table", "table");
		const data = makeQueryResult([
			{
				key: "Active",
				files: [alphaFile, betaFile],
			},
		]);
		const app = makeApp({
			baseFile,
			config,
			data,
			viewName: "Table",
			viewType: "table",
		});

		const source = getActiveBasesViewSource(app);

		expect(source).toMatchObject({
			basePath: "Views/Planning.base",
			defaultCanvasName: "Planning - Table",
			sourceKey: buildActiveBasesViewKey("Views/Planning.base", "Table", "table"),
			sourceLabel: "Planning: Table",
			viewType: "table",
		});
		expect(source?.snapshot).toEqual({
			viewName: "Table",
			totalEntries: 2,
			manualEntries: [],
			manualGroups: [],
			textCards: [],
			groups: [
				{
					id: expect.any(String),
					label: "Active",
					entries: [
						{ path: "Tasks/Alpha.md", name: "Alpha", file: alphaFile, properties: [] },
						{ path: "Tasks/Beta.md", name: "Beta", file: betaFile, properties: [] },
					],
				},
			],
		});
	});

	it("ignores non-Bases leaves", () => {
		const app = {
			workspace: {
				getMostRecentLeaf: () => ({
					view: {
						getViewType: () => "markdown",
					},
				}),
			},
		} as unknown as App;

		expect(getActiveBasesViewSource(app)).toBeNull();
	});
});

function makeTFile(path: string, basename: string, extension: string): TFile {
	const file = Object.create(TFile.prototype) as TFile;
	Object.assign(file, {
		path,
		basename,
		name: `${basename}.${extension}`,
		extension,
	});
	return file;
}

function makeViewConfig(name: string, type: string): BasesViewConfig {
	return {
		name,
		type,
		get: () => null,
		getOrder: () => [],
		getDisplayName: (propertyId: string) => propertyId,
		set: () => undefined,
	} as unknown as BasesViewConfig;
}

function makeQueryResult(
	groups: Array<{ key: string; files: TFile[] }>
): BasesQueryResult {
	return {
		data: groups.flatMap((group) =>
			group.files.map((file) => ({
				file,
				getValue: () => null,
			}))
		),
		groupedData: groups.map((group) => ({
			key: group.key,
			hasKey: () => true,
			entries: group.files.map((file) => ({
				file,
				getValue: () => null,
			})),
		})),
	} as unknown as BasesQueryResult;
}

function makeApp({
	baseFile,
	config,
	data,
	viewName,
	viewType,
}: {
	baseFile: TFile;
	config: BasesViewConfig;
	data: BasesQueryResult;
	viewName: string;
	viewType: string;
}): App {
	return {
		workspace: {
			getMostRecentLeaf: () => ({
				view: {
					getViewType: () => "bases",
					file: baseFile,
					controller: {
						currentFile: baseFile,
						viewName,
						view: {
							config,
							data,
							type: viewType,
						},
					},
				},
			}),
		},
	} as unknown as App;
}
