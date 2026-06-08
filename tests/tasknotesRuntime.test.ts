import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { TaskNotesRuntime } from "../src/tasknotes/runtime";
import type { BaseboardViewSnapshot } from "../src/types";

describe("TaskNotesRuntime", () => {
	it("builds compact task cards using TaskNotes catalog labels", async () => {
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			tasks: {
				"Tasks/Alpha.md": {
					title: "Alpha task",
					path: "Tasks/Alpha.md",
					status: "in-progress",
					priority: "high",
					archived: false,
					due: "2026-06-10",
					isBlocked: true,
				},
			},
		}));
		const cards = await runtime.getTaskCards(["Tasks/Alpha.md"]);
		const card = cards.get("Tasks/Alpha.md");

		expect(card).toMatchObject({
			title: "Alpha task",
			status: {
				label: "In progress",
				color: "#4f8cff",
			},
			priority: {
				label: "High",
				color: "#d94f4f",
			},
			isBlocked: true,
		});
		expect(card?.badges.map((badge) => badge.label)).toContain("Due");
		expect(card?.badges.map((badge) => badge.label)).toContain("Blocked");
	});

	it("maps visible Bases properties through TaskNotes field definitions", () => {
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			fields: [
				{
					id: "status",
					label: "Status",
					frontmatterKey: "state",
					aliases: ["task.status", "note.status", "status"],
				},
				{
					id: "timeEntries",
					label: "Time entries",
					frontmatterKey: "sessions",
				},
			],
		}));

			expect(runtime.getPropertyKind("state")).toBe("status");
			expect(runtime.getPropertyKind("note.state")).toBe("status");
			expect(runtime.getPropertyKind("status")).toBeNull();
			expect(runtime.getPropertyKind("sessions")).toBe("totalTrackedTime");
			expect(runtime.getPropertyKind("unrelated")).toBeNull();
		});

	it("uses TaskNotes frontmatter mappings instead of TaskNotes field ids or aliases", () => {
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			fields: [
				{
					id: "priority",
					label: "Priority",
					frontmatterKey: "weight",
					aliases: ["task.priority", "note.priority", "priority"],
				},
			],
		}));

		expect(runtime.getPropertyKind("weight")).toBe("priority");
		expect(runtime.getPropertyKind("note.weight")).toBe("priority");
		expect(runtime.getPropertyKind("priority")).toBeNull();
		expect(runtime.getPropertyKind("note.priority")).toBeNull();
	});

	it("does not infer TaskNotes property kinds from hardcoded property names", () => {
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({ fields: [] }));

		expect(runtime.getPropertyKind("priority")).toBeNull();
		expect(runtime.getPropertyKind("status")).toBeNull();
		expect(runtime.getPropertyKind("due")).toBeNull();
	});

	it("collects TaskNotes dependency edges from blocker to blocked task", async () => {
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			relationships: {
				"Tasks/Alpha.md": {
					task: task("Tasks/Alpha.md"),
					parents: [],
					subtasks: [],
					dependencies: [
						{
							path: "Tasks/Beta.md",
							task: task("Tasks/Beta.md"),
						},
					],
					blocking: [],
				},
				"Tasks/Beta.md": {
					task: task("Tasks/Beta.md"),
					parents: [],
					subtasks: [],
					dependencies: [],
					blocking: [task("Tasks/Alpha.md")],
				},
			},
		}));
		const relationships = await runtime.collectRelationships(snapshot(), "dependencies");

		expect(relationships).toEqual([
			{
				sourcePath: "Tasks/Beta.md",
				targetPath: "Tasks/Alpha.md",
				label: "blocks",
			},
		]);
	});

	it("can include parent and subtask relationship edges", async () => {
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			relationships: {
				"Tasks/Alpha.md": {
					task: task("Tasks/Alpha.md"),
					parents: [task("Tasks/Beta.md")],
					subtasks: [],
					dependencies: [],
					blocking: [],
				},
				"Tasks/Beta.md": {
					task: task("Tasks/Beta.md"),
					parents: [],
					subtasks: [task("Tasks/Alpha.md")],
					dependencies: [],
					blocking: [],
				},
			},
		}));
		const relationships = await runtime.collectRelationships(snapshot(), "all");

		expect(relationships).toEqual([
			{
				sourcePath: "Tasks/Beta.md",
				targetPath: "Tasks/Alpha.md",
				label: "parent",
			},
			{
				sourcePath: "Tasks/Beta.md",
				targetPath: "Tasks/Alpha.md",
				label: "subtask",
			},
		]);
	});

	it("skips visible notes that TaskNotes does not recognize as tasks", async () => {
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			relationships: {
				"Tasks/Alpha.md": new Error("Task not found"),
				"Tasks/Beta.md": {
					task: task("Tasks/Beta.md"),
					parents: [],
					subtasks: [],
					dependencies: [],
					blocking: [],
				},
			},
		}));
		const relationships = await runtime.collectRelationships(snapshot(), "all");

		expect(relationships).toEqual([]);
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

function makeTaskNotesApp({
	tasks = {},
	relationships = {},
	fields = [],
}: {
	tasks?: Record<string, ReturnType<typeof task>>;
	relationships?: Record<string, unknown>;
	fields?: Array<{
		id: string;
		label: string;
		aliases?: string[];
		frontmatterKey?: string;
	}>;
}): App {
	const capabilities = new Set(["tasks.read", "catalog.read", "relationships.read"]);

	return {
		plugins: {
			getPlugin: (id: string) =>
				id === "tasknotes"
					? {
							api: {
								apiVersion: 1,
								hasCapability: (capability: string) => capabilities.has(capability),
								tasks: {
									get: async (path: string) => tasks[path] ?? null,
								},
								catalog: {
									statuses: () => [
										{
											value: "in-progress",
											label: "In progress",
											color: "#4f8cff",
											isCompleted: false,
										},
									],
									priorities: () => [
										{
											value: "high",
											label: "High",
											color: "#d94f4f",
										},
									],
									fields: () => fields,
								},
								relationships: {
									all: async (path: string) => {
										const result = relationships[path];
										if (result instanceof Error) throw result;
										return result;
									},
								},
							},
						}
					: null,
		},
	} as unknown as App;
}

function task(path: string): {
	title: string;
	path: string;
	status: string;
	priority: string;
	archived: boolean;
} {
	return {
		title: path.split("/").pop()?.replace(/\.md$/u, "") ?? path,
		path,
		status: "in-progress",
		priority: "high",
		archived: false,
	};
}
