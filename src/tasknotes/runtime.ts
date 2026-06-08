import type { App, EventRef, Menu } from "obsidian";
import type {
	BaseboardRelationship,
	BaseboardTaskNotesRelationshipMode,
	BaseboardViewSnapshot,
} from "../types";

export interface BaseboardTaskBadge {
	kind: BaseboardTaskPropertyKind;
	label: string;
	value: string;
	color?: string;
	tone?: "default" | "danger" | "muted" | "success" | "warning";
}

export type BaseboardTaskPropertyKind =
	| "due"
	| "hasSubtasks"
	| "isBlocked"
	| "isBlocking"
	| "priority"
	| "recurrence"
	| "scheduled"
	| "status"
	| "timeEstimate"
	| "totalTrackedTime";

export interface BaseboardTaskCard {
	path: string;
	title: string;
	status: BaseboardTaskBadge;
	priority: BaseboardTaskBadge;
	badges: BaseboardTaskBadge[];
	isArchived: boolean;
	isBlocked: boolean;
	isBlocking: boolean;
	isCompleted: boolean;
	hasSubtasks: boolean;
}

type TaskNotesPluginInstance = {
	api?: TaskNotesRuntimeApiV1;
};

interface TaskNotesRuntimeApiV1 {
	apiVersion: number;
	hasCapability(capability: string): boolean;
	tasks?: {
		get(path: string): Promise<TaskNotesTaskInfo | null>;
		complete?(path: string, options?: unknown, context?: TaskNotesMutationContext): Promise<TaskNotesTaskInfo>;
		uncomplete?(path: string, options?: unknown, context?: TaskNotesMutationContext): Promise<TaskNotesTaskInfo>;
	};
	catalog?: {
		statuses(): TaskNotesStatusConfig[];
		priorities(): TaskNotesPriorityConfig[];
		fields?(): TaskNotesFieldDefinition[];
	};
	relationships?: {
		all(path: string): Promise<TaskNotesTaskRelationships>;
	};
	ui?: {
		taskMenu?: {
			populate(
				menu: Menu,
				options: {
					taskPath: string;
					onUpdate?: () => void;
					promoteOccurrenceControls?: boolean;
				}
			): Promise<void>;
			show(options: {
				taskPath: string;
				event: MouseEvent;
				onUpdate?: () => void;
				promoteOccurrenceControls?: boolean;
			}): Promise<void>;
		};
	};
	events?: {
		on(event: string, handler: () => void): EventRef;
	};
}

interface TaskNotesMutationContext {
	source?: string;
	reason?: string;
}

interface TaskNotesStatusConfig {
	value: string;
	label: string;
	color: string;
	isCompleted: boolean;
}

interface TaskNotesPriorityConfig {
	value: string;
	label: string;
	color: string;
}

interface TaskNotesFieldDefinition {
	id: string;
	label: string;
	aliases?: readonly string[];
	frontmatterKey?: string;
}

interface TaskNotesTaskInfo {
	title: string;
	status: string;
	priority: string;
	path: string;
	archived: boolean;
	due?: string;
	scheduled?: string;
	recurrence?: string;
	completedDate?: string;
	timeEstimate?: number;
	totalTrackedTime?: number;
	tags?: string[];
	contexts?: string[];
	projects?: string[];
	isBlocked?: boolean;
	isBlocking?: boolean;
	hasSubtasks?: boolean;
}

interface ResolvedTaskDependency {
	task: TaskNotesTaskInfo | null;
	path: string | null;
}

interface TaskNotesTaskRelationships {
	task: TaskNotesTaskInfo;
	parents: TaskNotesTaskInfo[];
	subtasks: TaskNotesTaskInfo[];
	dependencies: ResolvedTaskDependency[];
	blocking: TaskNotesTaskInfo[];
}

export class TaskNotesRuntime {
	private readonly app: App;

	constructor(app: App) {
		this.app = app;
	}

	isAvailable(): boolean {
		return this.getApi() !== null;
	}

	getTaskCardsEnabled(): boolean {
		const api = this.getApi();
		return Boolean(api?.hasCapability("tasks.read"));
	}

	getTaskActionsEnabled(): boolean {
		const api = this.getApi();
		return Boolean(api?.hasCapability("ui.task-menu"));
	}

	getPropertyKind(propertyId: string): BaseboardTaskPropertyKind | null {
		const normalized = normalizePropertyId(propertyId);
		const api = this.getApi();
		if (api?.catalog && api.hasCapability("catalog.read")) {
			for (const field of api.catalog.fields?.() ?? []) {
				const kind = getTaskPropertyKindFromFieldId(field.id);
				if (!kind) continue;
				if (field.frontmatterKey && normalizePropertyId(field.frontmatterKey) === normalized) {
					return kind;
				}
			}
		}

		return null;
	}

	async getTaskCards(paths: string[]): Promise<Map<string, BaseboardTaskCard>> {
		const api = this.getApi();
		if (!api?.tasks || !api.hasCapability("tasks.read")) {
			return new Map();
		}

		const catalog = this.getCatalog(api);
		const cards = new Map<string, BaseboardTaskCard>();

		await Promise.all(
			paths.map(async (path) => {
				const task = await api.tasks?.get(path);
				if (!task) return;
				cards.set(path, buildTaskCard(task, catalog));
			})
		);

		return cards;
	}

	async collectRelationships(
		snapshot: BaseboardViewSnapshot,
		mode: BaseboardTaskNotesRelationshipMode
	): Promise<BaseboardRelationship[]> {
		const api = this.getApi();
		if (mode === "none" || !api?.relationships || !api.hasCapability("relationships.read")) {
			return [];
		}

		const visiblePaths = new Set(
			snapshot.groups.flatMap((group) => group.entries.map((entry) => entry.path))
		);
		const relationships: BaseboardRelationship[] = [];

		await Promise.all(
			[...visiblePaths].map(async (path) => {
				const related = await readRelationships(api, path);
				if (!related) return;
				relationships.push(...buildDependencyRelationships(path, related, visiblePaths));
				if (mode === "all") {
					relationships.push(...buildStructuralRelationships(path, related, visiblePaths));
				}
			})
		);

		return dedupeRelationships(relationships);
	}

	async populateTaskMenu(menu: Menu, path: string, onUpdate: () => void): Promise<boolean> {
		const api = this.getApi();
		if (!api?.ui?.taskMenu || !api.hasCapability("ui.task-menu")) {
			return false;
		}

		try {
			await api.ui.taskMenu.populate(menu, {
				taskPath: path,
				onUpdate,
				promoteOccurrenceControls: true,
			});
			return true;
		} catch {
			return false;
		}
	}

	async showTaskMenu(path: string, event: MouseEvent, onUpdate: () => void): Promise<boolean> {
		const api = this.getApi();
		if (!api?.ui?.taskMenu || !api.hasCapability("ui.task-menu")) {
			return false;
		}

		try {
			await api.ui.taskMenu.show({
				taskPath: path,
				event,
				onUpdate,
				promoteOccurrenceControls: true,
			});
			return true;
		} catch {
			return false;
		}
	}

	registerTaskEvents(onUpdate: () => void): EventRef[] {
		const api = this.getApi();
		if (!api?.events || !api.hasCapability("tasks.events")) {
			return [];
		}

		return [
			api.events.on("task.updated", onUpdate),
			api.events.on("task.created", onUpdate),
			api.events.on("task.deleted", onUpdate),
			api.events.on("task.moved", onUpdate),
		];
	}

	private getApi(): TaskNotesRuntimeApiV1 | null {
		const tasknotes = this.app.plugins.getPlugin("tasknotes") as TaskNotesPluginInstance | null;
		const api = tasknotes?.api;

		return api?.apiVersion === 1 && typeof api.hasCapability === "function" ? api : null;
	}

	private getCatalog(api: TaskNotesRuntimeApiV1): TaskNotesCatalog {
		if (!api.catalog || !api.hasCapability("catalog.read")) {
			return {
				statuses: new Map(),
				priorities: new Map(),
			};
		}

		return {
			statuses: new Map(api.catalog.statuses().map((status) => [status.value, status])),
			priorities: new Map(api.catalog.priorities().map((priority) => [priority.value, priority])),
		};
	}
}

interface TaskNotesCatalog {
	statuses: Map<string, TaskNotesStatusConfig>;
	priorities: Map<string, TaskNotesPriorityConfig>;
}

async function readRelationships(
	api: TaskNotesRuntimeApiV1,
	path: string
): Promise<TaskNotesTaskRelationships | null> {
	try {
		return (await api.relationships?.all(path)) ?? null;
	} catch {
		return null;
	}
}

function buildTaskCard(task: TaskNotesTaskInfo, catalog: TaskNotesCatalog): BaseboardTaskCard {
	const status = catalog.statuses.get(task.status);
	const priority = catalog.priorities.get(task.priority);
	const badges = buildTaskBadges(task);

	return {
		path: task.path,
		title: task.title || task.path.split("/").pop()?.replace(/\.md$/u, "") || task.path,
		status: {
			kind: "status",
			label: status?.label ?? task.status,
			value: task.status,
			color: status?.color,
			tone: status?.isCompleted ? "success" : undefined,
		},
		priority: {
			kind: "priority",
			label: priority?.label ?? task.priority,
			value: task.priority,
			color: priority?.color,
		},
		badges,
		isArchived: task.archived,
		isBlocked: Boolean(task.isBlocked),
		isBlocking: Boolean(task.isBlocking),
		isCompleted: Boolean(status?.isCompleted || task.completedDate),
		hasSubtasks: Boolean(task.hasSubtasks),
	};
}

function buildTaskBadges(task: TaskNotesTaskInfo): BaseboardTaskBadge[] {
	const badges: BaseboardTaskBadge[] = [];

	if (task.due) {
		badges.push({
			kind: "due",
			label: "Due",
			value: task.due,
			tone: isPastDate(task.due) ? "danger" : "default",
		});
	}
	if (task.scheduled) {
		badges.push({
			kind: "scheduled",
			label: "Scheduled",
			value: task.scheduled,
		});
	}
	if (task.recurrence) {
		badges.push({
			kind: "recurrence",
			label: "Repeats",
			value: "Recurring",
			tone: "muted",
		});
	}
	if (task.isBlocked) {
		badges.push({
			kind: "isBlocked",
			label: "Blocked",
			value: "Blocked",
			tone: "warning",
		});
	}
	if (task.isBlocking) {
		badges.push({
			kind: "isBlocking",
			label: "Blocking",
			value: "Blocking",
			tone: "warning",
		});
	}
	if (task.hasSubtasks) {
		badges.push({
			kind: "hasSubtasks",
			label: "Subtasks",
			value: "Subtasks",
			tone: "muted",
		});
	}
	if (typeof task.timeEstimate === "number" && task.timeEstimate > 0) {
		badges.push({
			kind: "timeEstimate",
			label: "Estimate",
			value: formatMinutes(task.timeEstimate),
		});
	}
	if (typeof task.totalTrackedTime === "number" && task.totalTrackedTime > 0) {
		badges.push({
			kind: "totalTrackedTime",
			label: "Tracked",
			value: formatMinutes(task.totalTrackedTime),
		});
	}

	return badges;
}

function buildDependencyRelationships(
	path: string,
	related: TaskNotesTaskRelationships,
	visiblePaths: Set<string>
): BaseboardRelationship[] {
	const relationships: BaseboardRelationship[] = [];

	for (const dependency of related.dependencies) {
		const dependencyPath = dependency.path ?? dependency.task?.path;
		if (dependencyPath && visiblePaths.has(dependencyPath)) {
			relationships.push({
				sourcePath: dependencyPath,
				targetPath: path,
				label: "blocks",
			});
		}
	}

	for (const task of related.blocking) {
		if (visiblePaths.has(task.path)) {
			relationships.push({
				sourcePath: path,
				targetPath: task.path,
				label: "blocks",
			});
		}
	}

	return relationships;
}

function buildStructuralRelationships(
	path: string,
	related: TaskNotesTaskRelationships,
	visiblePaths: Set<string>
): BaseboardRelationship[] {
	const relationships: BaseboardRelationship[] = [];

	for (const parent of related.parents) {
		if (visiblePaths.has(parent.path)) {
			relationships.push({
				sourcePath: parent.path,
				targetPath: path,
				label: "parent",
			});
		}
	}

	for (const subtask of related.subtasks) {
		if (visiblePaths.has(subtask.path)) {
			relationships.push({
				sourcePath: path,
				targetPath: subtask.path,
				label: "subtask",
			});
		}
	}

	return relationships;
}

function dedupeRelationships(
	relationships: BaseboardRelationship[]
): BaseboardRelationship[] {
	const seen = new Set<string>();
	const result: BaseboardRelationship[] = [];

	for (const relationship of relationships) {
		const key = `${relationship.sourcePath}\u0000${relationship.targetPath}\u0000${
			relationship.label ?? ""
		}`;
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(relationship);
	}

	return result;
}

function isPastDate(value: string): boolean {
	const date = new Date(`${value}T23:59:59`);
	if (Number.isNaN(date.getTime())) return false;

	return date.getTime() < Date.now();
}

function formatMinutes(minutes: number): string {
	if (minutes < 60) {
		return `${minutes}m`;
	}

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

function getTaskPropertyKindFromFieldId(id: string): BaseboardTaskPropertyKind | null {
	switch (id) {
		case "blockedBy":
		case "isBlocked":
			return "isBlocked";
		case "blocking":
		case "isBlocking":
			return "isBlocking";
		case "due":
		case "hasSubtasks":
		case "priority":
		case "recurrence":
		case "scheduled":
		case "status":
		case "timeEstimate":
		case "totalTrackedTime":
			return id;
		case "timeEntries":
			return "totalTrackedTime";
		default:
			return null;
	}
}

function normalizePropertyId(propertyId: string): string {
	return propertyId
		.trim()
		.replace(/^(note\.|task\.|properties\.)/iu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/giu, "");
}
