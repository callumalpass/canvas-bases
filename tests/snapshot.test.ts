import { describe, expect, it } from "vitest";
import type {
	BasesEntry,
	BasesPropertyId,
	BasesQueryResult,
	BasesViewConfig,
	TFile,
	Value,
} from "obsidian";
import { buildCanvasBasesSnapshot } from "../src/bases/snapshot";
import { makeMockTFile } from "./obsidianMockUtils";

describe("buildCanvasBasesSnapshot", () => {
	it("captures visible Bases properties for card rendering", () => {
		const file = makeTFile("Tasks/Alpha.md", "Alpha", "md");
		const entry = makeEntry(file, {
			"file.name": makeValue("Alpha"),
			"note.status": makeValue("active"),
			"note.depends_on": makeValue("[[Beta]]"),
			"file.folder": makeValue("Tasks"),
		});
		const snapshot = buildCanvasBasesSnapshot(
			makeQueryResult(entry),
			makeViewConfig([
				"file.name",
				"note.status",
				"note.depends_on",
				"file.folder",
			])
		);

		expect(snapshot.groups[0].entries[0].properties).toMatchObject([
			{
				id: "note.status",
				displayName: "Status",
				text: "active",
				isEmpty: false,
			},
			{
				id: "note.depends_on",
				displayName: "Depends on",
				text: "[[Beta]]",
				isEmpty: false,
			},
			{
				id: "file.folder",
				displayName: "Folder",
				text: "Tasks",
				isEmpty: false,
			},
		]);
	});

	it("keeps requested empty properties visible", () => {
		const file = makeTFile("Tasks/Alpha.md", "Alpha", "md");
		const entry = makeEntry(file, {
			"note.status": null,
		});
		const snapshot = buildCanvasBasesSnapshot(
			makeQueryResult(entry),
			makeViewConfig(["note.status"])
		);

		expect(snapshot.groups[0].entries[0].properties).toMatchObject([
			{
				id: "note.status",
				text: "Empty",
				isEmpty: true,
			},
		]);
	});

	it("keeps group ids stable when grouped data order changes", () => {
		const activeEntry = makeEntry(makeTFile("Tasks/Active.md", "Active", "md"), {});
		const waitingEntry = makeEntry(makeTFile("Tasks/Waiting.md", "Waiting", "md"), {});
		const config = makeViewConfig(["file.name"]);
		const firstSnapshot = buildCanvasBasesSnapshot(
			makeGroupedQueryResult([
				{ key: "Active", entries: [activeEntry] },
				{ key: "Waiting", entries: [waitingEntry] },
			]),
			config
		);
		const reorderedSnapshot = buildCanvasBasesSnapshot(
			makeGroupedQueryResult([
				{ key: "Waiting", entries: [waitingEntry] },
				{ key: "Active", entries: [activeEntry] },
			]),
			config
		);

		expect(getGroupIdByLabel(firstSnapshot, "Active")).toBe(
			getGroupIdByLabel(reorderedSnapshot, "Active")
		);
		expect(getGroupIdByLabel(firstSnapshot, "Waiting")).toBe(
			getGroupIdByLabel(reorderedSnapshot, "Waiting")
		);
	});

	it("marks the single ungrouped fallback group as implicit", () => {
		const entry = makeEntry(makeTFile("Tasks/Active.md", "Active", "md"), {});
		const snapshot = buildCanvasBasesSnapshot(
			makeGroupedQueryResult([{ key: "", hasKey: false, entries: [entry] }]),
			makeViewConfig(["file.name"])
		);

		expect(snapshot.groups).toMatchObject([
			{
				label: "All notes",
				isImplicit: true,
			},
		]);
	});

	it("captures grouped property and value for zone behavior", () => {
		const activeEntry = makeEntry(makeTFile("Tasks/Active.md", "Active", "md"), {});
		const emptyEntry = makeEntry(makeTFile("Tasks/Empty.md", "Empty", "md"), {});
		const snapshot = buildCanvasBasesSnapshot(
			makeGroupedQueryResult([
				{ key: "Active", entries: [activeEntry] },
				{ key: "", entries: [emptyEntry] },
			]),
			makeViewConfig(["file.name"]),
			"note.status"
		);

		expect(snapshot.groups).toMatchObject([
			{
				label: "Active",
				property: "note.status",
				value: "Active",
			},
			{
				label: "Empty",
				property: "note.status",
				value: "",
			},
		]);
	});
});

function makeTFile(path: string, basename: string, extension: string): TFile {
	const file = makeMockTFile(path);
	if (file.basename !== basename || file.extension !== extension) {
		throw new Error(`Mock file metadata does not match ${basename}.${extension}`);
	}

	return file;
}

function makeEntry(
	file: TFile,
	values: Record<string, Value | null>
): BasesEntry {
	return {
		file,
		getValue: (propertyId: BasesPropertyId) => values[propertyId] ?? null,
	} as unknown as BasesEntry;
}

function makeQueryResult(entry: BasesEntry): BasesQueryResult {
	return makeGroupedQueryResult([{ key: "Active", entries: [entry] }]);
}

function makeGroupedQueryResult(
	groups: Array<{ key: string; entries: BasesEntry[]; hasKey?: boolean }>
): BasesQueryResult {
	return {
		data: groups.flatMap((group) => group.entries),
		groupedData: groups.map((group) => ({
			key: group.key,
			hasKey: () => group.hasKey ?? true,
			entries: group.entries,
		})),
	} as unknown as BasesQueryResult;
}

function makeViewConfig(order: string[]): BasesViewConfig {
	const displayNames: Record<string, string> = {
		"note.status": "Status",
		"note.depends_on": "Depends on",
		"file.folder": "Folder",
	};

	return {
		name: "Planning",
		getOrder: () => order as BasesPropertyId[],
		getDisplayName: (propertyId: BasesPropertyId) => displayNames[propertyId] ?? propertyId,
	} as unknown as BasesViewConfig;
}

function makeValue(text: string): Value {
	return {
		toString: () => text,
		isTruthy: () => text.trim().length > 0,
	} as unknown as Value;
}

function getGroupIdByLabel(
	snapshot: ReturnType<typeof buildCanvasBasesSnapshot>,
	label: string
): string {
	const group = snapshot.groups.find((candidate) => candidate.label === label);
	if (!group) throw new Error(`Missing group: ${label}`);

	return group.id;
}
