import { describe, expect, it } from "vitest";
import { TFile, type App } from "obsidian";
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

	it("checks whether a visible note is a TaskNotes task before showing task actions", async () => {
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			tasks: {
				"Tasks/Alpha.md": task("Tasks/Alpha.md"),
			},
		}));

		await expect(runtime.isTask("Tasks/Alpha.md")).resolves.toBe(true);
		await expect(runtime.isTask("Notes/Idea.md")).resolves.toBe(false);
	});

	it("uses the TaskNotes task menu API when TaskNotes accepts the task path", async () => {
		const taskMenu = createTaskMenuLog();
		const onUpdate = () => undefined;
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			taskMenu,
			tasks: {
				"Tasks/Alpha.md": task("Tasks/Alpha.md"),
			},
		}));
		const menu = {};
		const event = {} as MouseEvent;

		await expect(
			runtime.populateTaskMenu(menu as never, "Tasks/Alpha.md", onUpdate)
		).resolves.toBe(true);
		await expect(
			runtime.showTaskMenu("Tasks/Alpha.md", event, onUpdate)
		).resolves.toBe(true);

		expect(taskMenu.populates).toEqual([
			{
				menu,
				options: {
					taskPath: "Tasks/Alpha.md",
					onUpdate,
					promoteOccurrenceControls: true,
				},
			},
		]);
		expect(taskMenu.shows).toEqual([
			{
				taskPath: "Tasks/Alpha.md",
				event,
				onUpdate,
				promoteOccurrenceControls: true,
			},
		]);
	});

	it("reports unavailable task menus without throwing", async () => {
		const taskMenu = createTaskMenuLog({
			populateError: new Error("task_not_found"),
			showError: new Error("task_not_found"),
		});
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			taskMenu,
			tasks: {
				"Tasks/Alpha.md": task("Tasks/Alpha.md"),
			},
		}));

		await expect(
			runtime.populateTaskMenu({} as never, "Tasks/Missing.md", () => undefined)
		).resolves.toBe(false);
		await expect(
			runtime.showTaskMenu("Tasks/Missing.md", {} as MouseEvent, () => undefined)
		).resolves.toBe(false);
	});

	it("falls back to the Obsidian file menu for TaskNotes versions without the task menu API", async () => {
		const fileMenu = createFileMenuLog();
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			fileMenu,
			frontmatter: {
				"260608yp5.md": {
					tags: ["task"],
				},
			},
		}));
		const menu = { items: [] };

		await expect(
			runtime.populateTaskMenu(menu as never, "260608yp5.md", () => undefined)
		).resolves.toBe(true);

		expect(menu.items).toEqual(["tasknotes-action"]);
		expect(fileMenu.calls).toEqual([
			{
				path: "260608yp5.md",
				source: "baseboard",
			},
		]);
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
							dependency: { uid: "beta-custom-reference", reltype: "FINISHTOSTART" },
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
				metadata: {
					source: "tasknotes",
					kind: "dependency",
					blockedPath: "Tasks/Alpha.md",
					blockingPath: "Tasks/Beta.md",
					dependencyUid: "beta-custom-reference",
				},
			},
		]);
	});

	it("uses a wikilink fallback when dependency relationship details omit the stored uid", async () => {
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			relationships: {
				"260608yp5.md": {
					task: task("260608yp5.md", {
						blockedBy: [{ uid: "[[260608yp8]]", reltype: "FINISHTOSTART" }],
					}),
					parents: [],
					subtasks: [],
					dependencies: [
						{
							path: "260608yp8.md",
							task: task("260608yp8.md"),
						},
					],
					blocking: [],
				},
				"260608yp8.md": {
					task: task("260608yp8.md"),
					parents: [],
					subtasks: [],
					dependencies: [],
					blocking: [task("260608yp5.md")],
				},
			},
		}));
		const relationships = await runtime.collectRelationships(rootTaskSnapshot(), "dependencies");

		expect(relationships).toEqual([
			{
				sourcePath: "260608yp8.md",
				targetPath: "260608yp5.md",
				label: "blocks",
				metadata: {
					source: "tasknotes",
					kind: "dependency",
					blockedPath: "260608yp5.md",
					blockingPath: "260608yp8.md",
					dependencyUid: "[[260608yp8]]",
				},
			},
		]);
	});

	it("renders subtask relationships from child to parent", async () => {
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
				sourcePath: "Tasks/Alpha.md",
				targetPath: "Tasks/Beta.md",
				label: "subtask",
				metadata: {
					source: "tasknotes",
					kind: "project",
					parentPath: "Tasks/Beta.md",
					childPath: "Tasks/Alpha.md",
				},
			},
		]);
	});

	it("does not read reverse subtask relationships when rendering subtask edges", async () => {
		const calls: string[] = [];
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
			relationshipCalls: calls,
		}));

		await runtime.collectRelationships(snapshot(), "all");

		expect([...calls].sort()).toEqual([
			"dependencies:Tasks/Alpha.md",
			"dependencies:Tasks/Beta.md",
			"parents:Tasks/Alpha.md",
			"parents:Tasks/Beta.md",
		].sort());
	});

	it("writes dependency and project links through the TaskNotes task API", async () => {
		const writes = createTaskWrites();
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			tasks: {
				"Tasks/Alpha.md": task("Tasks/Alpha.md", { projects: ["[[Tasks/Beta]]"] }),
				"Tasks/Beta.md": task("Tasks/Beta.md"),
			},
			writes,
		}));

		expect(runtime.getTaskLinkingEnabled()).toBe(true);
		await expect(runtime.addDependency("Tasks/Alpha.md", "Tasks/Beta.md")).resolves.toBe(true);
		await expect(runtime.addProject("Tasks/Alpha.md", "Tasks/Beta.md")).resolves.toBe(true);
		await expect(runtime.removeDependency("Tasks/Alpha.md", "[[Tasks/Beta]]")).resolves.toBe(true);
		await expect(runtime.removeProject("Tasks/Alpha.md", "Tasks/Beta.md")).resolves.toBe(true);

		expect(writes.addDependencies).toEqual([
			{
				path: "Tasks/Alpha.md",
				dependency: { uid: "[[Tasks/Beta]]", reltype: "FINISHTOSTART" },
				context: { source: "baseboard", reason: "link-control" },
			},
		]);
		expect(writes.addProjects).toEqual([
			{
				path: "Tasks/Alpha.md",
				project: "[[Tasks/Beta]]",
				context: { source: "baseboard", reason: "link-control" },
			},
		]);
		expect(writes.removeDependencies).toEqual([
			{
				path: "Tasks/Alpha.md",
				uid: "[[Tasks/Beta]]",
				context: { source: "baseboard", reason: "link-control" },
			},
		]);
		expect(writes.removeProjects).toEqual([
			{
				path: "Tasks/Alpha.md",
				project: "[[Tasks/Beta]]",
				context: { source: "baseboard", reason: "link-control" },
			},
		]);
	});

	it("removes the exact stored TaskNotes dependency uid when the edge used an equivalent path", async () => {
		const writes = createTaskWrites();
		const runtime = new TaskNotesRuntime(makeTaskNotesApp({
			tasks: {
				"260608yp5.md": task("260608yp5.md", {
					blockedBy: [{ uid: "[[260608yp8]]", reltype: "FINISHTOSTART" }],
				}),
			},
			writes,
		}));

		await expect(runtime.removeDependency("260608yp5.md", "[[260608yp8.md]]")).resolves.toBe(true);

		expect(writes.removeDependencies).toEqual([
			{
				path: "260608yp5.md",
				uid: "[[260608yp8]]",
				context: { source: "baseboard", reason: "link-control" },
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

function rootTaskSnapshot(): BaseboardViewSnapshot {
	return {
		viewName: "Today",
		totalEntries: 2,
		textCards: [],
		groups: [
			{
				id: "active",
				label: "Active",
				entries: [
					{ path: "260608yp5.md", name: "Investigate issue" },
					{ path: "260608yp8.md", name: "Release plugin" },
				],
			},
		],
	};
}

function makeTaskNotesApp({
	tasks = {},
	relationships = {},
	fields = [],
	fileMenu,
	frontmatter = {},
	relationshipCalls,
	taskMenu,
	writes = createTaskWrites(),
}: {
	tasks?: Record<string, ReturnType<typeof task>>;
	relationships?: Record<string, unknown>;
	fields?: Array<{
		id: string;
		label: string;
		aliases?: string[];
		frontmatterKey?: string;
	}>;
	fileMenu?: FileMenuLog;
	frontmatter?: Record<string, Record<string, unknown>>;
	relationshipCalls?: string[];
	taskMenu?: TaskMenuLog;
	writes?: TaskWriteLog;
}): App {
	const capabilities = new Set(["tasks.read", "tasks.write", "catalog.read", "relationships.read"]);
	if (taskMenu) capabilities.add("ui.task-menu");

	return {
		metadataCache: {
			getFileCache: (file: TFile) => ({
				frontmatter: frontmatter[file.path],
			}),
			getFirstLinkpathDest: () => null,
		},
		vault: {
			getAbstractFileByPath: (path: string) => makeFile(path),
		},
		workspace: {
			trigger: (event: string, menu: { items?: unknown[] }, file: TFile, source: string) => {
				if (event !== "file-menu" || !fileMenu) return;
				fileMenu.calls.push({ path: file.path, source });
				menu.items?.push("tasknotes-action");
			},
		},
		plugins: {
			getPlugin: (id: string) =>
				id === "tasknotes"
					? {
							cacheManager: {
								isTaskFile: (taskFrontmatter: Record<string, unknown>) =>
									Array.isArray(taskFrontmatter.tags) &&
									taskFrontmatter.tags.includes("task"),
							},
							api: {
								apiVersion: 1,
								hasCapability: (capability: string) => capabilities.has(capability),
								tasks: {
									get: async (path: string) => tasks[path] ?? null,
									addDependency: async (path: string, dependency: unknown, context: unknown) => {
										writes.addDependencies.push({ path, dependency, context });
										return tasks[path] ?? task(path);
									},
									removeDependency: async (path: string, uid: string, context: unknown) => {
										writes.removeDependencies.push({ path, uid, context });
										return tasks[path] ?? task(path);
									},
									addProject: async (path: string, project: string, context: unknown) => {
										writes.addProjects.push({ path, project, context });
										return tasks[path] ?? task(path);
									},
									removeProject: async (path: string, project: string, context: unknown) => {
										writes.removeProjects.push({ path, project, context });
										return tasks[path] ?? task(path);
									},
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
									dependencies: async (path: string) => {
										relationshipCalls?.push(`dependencies:${path}`);
										const result = relationships[path];
										if (result instanceof Error) throw result;
										return isRelationshipResult(result) ? result.dependencies : [];
									},
									parents: async (path: string) => {
										relationshipCalls?.push(`parents:${path}`);
										const result = relationships[path];
										if (result instanceof Error) throw result;
										return isRelationshipResult(result) ? result.parents : [];
									},
								},
								...(taskMenu
									? {
											ui: {
												taskMenu: {
													populate: async (menu: unknown, options: unknown) => {
														if (taskMenu.populateError) throw taskMenu.populateError;
														taskMenu.populates.push({ menu, options });
													},
													show: async (options: unknown) => {
														if (taskMenu.showError) throw taskMenu.showError;
														taskMenu.shows.push(options);
													},
												},
											},
										}
									: {}),
							},
						}
					: null,
		},
	} as unknown as App;
}

interface TaskWriteLog {
	addDependencies: Array<{ path: string; dependency: unknown; context: unknown }>;
	removeDependencies: Array<{ path: string; uid: string; context: unknown }>;
	addProjects: Array<{ path: string; project: string; context: unknown }>;
	removeProjects: Array<{ path: string; project: string; context: unknown }>;
}

interface TaskMenuLog {
	populates: Array<{ menu: unknown; options: unknown }>;
	shows: unknown[];
	populateError?: Error;
	showError?: Error;
}

interface FileMenuLog {
	calls: Array<{ path: string; source: string }>;
}

function createTaskWrites(): TaskWriteLog {
	return {
		addDependencies: [],
		removeDependencies: [],
		addProjects: [],
		removeProjects: [],
	};
}

function isRelationshipResult(value: unknown): value is {
	dependencies: unknown[];
	parents: unknown[];
} {
	return (
		value !== null &&
		typeof value === "object" &&
		Array.isArray((value as { dependencies?: unknown }).dependencies) &&
		Array.isArray((value as { parents?: unknown }).parents)
	);
}

function createTaskMenuLog(errors: Pick<TaskMenuLog, "populateError" | "showError"> = {}): TaskMenuLog {
	return {
		populates: [],
		shows: [],
		...errors,
	};
}

function createFileMenuLog(): FileMenuLog {
	return {
		calls: [],
	};
}

interface MockTask {
	title: string;
	path: string;
	status: string;
	priority: string;
	archived: boolean;
	blockedBy?: Array<{ uid: string; reltype: "FINISHTOSTART" }>;
	projects?: string[];
}

function task(path: string, overrides: Partial<MockTask> = {}): MockTask {
	return {
		title: path.split("/").pop()?.replace(/\.md$/u, "") ?? path,
		path,
		status: "in-progress",
		priority: "high",
		archived: false,
		...overrides,
	};
}

function makeFile(path: string): TFile {
	const file = new TFile();
	file.path = path;
	file.name = path.split("/").pop() ?? path;
	file.basename = file.name.replace(/\.md$/u, "");
	return file;
}
