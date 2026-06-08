import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import type { App, BasesViewConfig } from "obsidian";
import { VIEW_CONFIG_KEYS } from "../src/constants";
import { applyManualViewItems } from "../src/bases/manualItems";
import type { BaseboardViewSnapshot } from "../src/types";

describe("applyManualViewItems", () => {
	it("adds pinned markdown notes as manual cards without duplicating visible notes", () => {
		const app = makeApp([
			makeTFile("Tasks/Visible.md"),
			makeTFile("Tasks/Pinned.md"),
			makeTFile("Tasks/Other.md"),
		]);
		const snapshot = applyManualViewItems(app, baseSnapshot(), makeConfig({
			[VIEW_CONFIG_KEYS.manualNotePaths]: ["Tasks/Visible.md", "Tasks/Pinned.md"],
		}));

		expect(snapshot.totalEntries).toBe(2);
		expect(snapshot.groups.map((group) => group.label)).toEqual(["Active"]);
		expect(snapshot.manualGroups).toEqual([
			{
				id: "pinned",
				label: "Pinned notes",
			},
		]);
		expect(snapshot.manualEntries).toMatchObject([
			{
				path: "Tasks/Pinned.md",
				isManual: true,
			},
		]);
	});

	it("keeps configured text cards on the snapshot", () => {
		const snapshot = applyManualViewItems(makeApp([]), baseSnapshot(), makeConfig({
			[VIEW_CONFIG_KEYS.textCards]: [
				{
					id: "card-a",
					text: "Plan around the blocker.",
				},
			],
		}));

		expect(snapshot.textCards).toEqual([
			{
				id: "card-a",
				text: "Plan around the blocker.",
			},
		]);
	});

	it("does not recreate the pinned group when manual groups are explicitly empty", () => {
		const app = makeApp([makeTFile("Tasks/Pinned.md")]);
		const snapshot = applyManualViewItems(app, baseSnapshot(), makeConfig({
			[VIEW_CONFIG_KEYS.manualNotePaths]: ["Tasks/Pinned.md"],
			[VIEW_CONFIG_KEYS.manualGroups]: [],
		}));

		expect(snapshot.manualEntries).toMatchObject([
			{
				path: "Tasks/Pinned.md",
				isManual: true,
			},
		]);
		expect(snapshot.manualGroups).toEqual([]);
	});
});

function baseSnapshot(): BaseboardViewSnapshot {
	return {
		viewName: "Planning",
		totalEntries: 1,
		manualEntries: [],
		manualGroups: [],
		textCards: [],
		groups: [
			{
				id: "active",
				label: "Active",
				entries: [
					{
						path: "Tasks/Visible.md",
						name: "Visible",
					},
				],
			},
		],
	};
}

function makeApp(files: TFile[]): App {
	const fileMap = new Map(files.map((file) => [file.path, file]));

	return {
		vault: {
			getAbstractFileByPath: (path: string) => fileMap.get(path) ?? null,
		},
	} as unknown as App;
}

function makeTFile(path: string): TFile {
	const file = Object.create(TFile.prototype) as TFile;
	const name = path.split("/").pop() ?? path;
	Object.assign(file, {
		path,
		name,
		basename: name.replace(/\.md$/u, ""),
		extension: "md",
	});
	return file;
}

function makeConfig(values: Record<string, unknown>): BasesViewConfig {
	return {
		get: (key: string) => values[key] ?? null,
	} as unknown as BasesViewConfig;
}
