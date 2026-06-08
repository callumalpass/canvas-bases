import { TFile, type App, type EventRef, type Menu } from "obsidian";
import type {
	BaseboardRelationship,
	BaseboardTaskNotesRelationshipMode,
	BaseboardViewSnapshot,
} from "../types";
import type { TranslateFn } from "../i18n";

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
	cacheManager?: {
		isTaskFile?(frontmatter: Record<string, unknown>): boolean;
	};
};

interface TaskNotesRuntimeApiV1 {
	apiVersion: number;
	hasCapability(capability: string): boolean;
	tasks?: {
		get(path: string): Promise<TaskNotesTaskInfo | null>;
		complete?(path: string, options?: unknown, context?: TaskNotesMutationContext): Promise<TaskNotesTaskInfo>;
		uncomplete?(path: string, options?: unknown, context?: TaskNotesMutationContext): Promise<TaskNotesTaskInfo>;
		addDependency?(
			path: string,
			dependency: TaskNotesDependency,
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
		removeDependency?(
			path: string,
			uid: string,
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
		addProject?(
			path: string,
			project: string,
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
		removeProject?(
			path: string,
			project: string,
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
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
	blockedBy?: TaskNotesDependency[];
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
	dependency?: TaskNotesDependency;
	task: TaskNotesTaskInfo | null;
	path: string | null;
}

interface TaskNotesDependency {
	uid: string;
	reltype: TaskNotesDependencyRelType;
}

type TaskNotesDependencyRelType =
	| "FINISHTOSTART"
	| "FINISHTOFINISH"
	| "STARTTOSTART"
	| "STARTTOFINISH";

interface TaskNotesTaskRelationships {
	task: TaskNotesTaskInfo;
	parents: TaskNotesTaskInfo[];
	subtasks: TaskNotesTaskInfo[];
	dependencies: ResolvedTaskDependency[];
	blocking: TaskNotesTaskInfo[];
}

export class TaskNotesRuntime {
	private readonly app: App;
	private readonly t: TranslateFn;

	constructor(app: App, t: TranslateFn = defaultTranslate) {
		this.app = app;
		this.t = t;
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

	async isTask(path: string): Promise<boolean> {
		const api = this.getApi();
		if (!api?.tasks?.get || !api.hasCapability("tasks.read")) return false;

		try {
			return (await api.tasks.get(path)) !== null;
		} catch {
			return false;
		}
	}

	getTaskLinkingEnabled(): boolean {
		const api = this.getApi();
		return Boolean(
			api?.hasCapability("tasks.write") &&
				typeof api.tasks?.addDependency === "function" &&
				typeof api.tasks.addProject === "function"
		);
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
				cards.set(path, buildTaskCard(task, catalog, this.t));
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
				relationships.push(...buildDependencyRelationships(path, related, visiblePaths, this.t));
				if (mode === "all") {
					relationships.push(...buildStructuralRelationships(path, related, visiblePaths, this.t));
				}
			})
		);

		return dedupeRelationships(relationships);
	}

	async addDependency(
		blockedPath: string,
		blockingPath: string,
		reltype: TaskNotesDependencyRelType = "FINISHTOSTART"
	): Promise<boolean> {
		const api = this.getApi();
		if (!api?.tasks?.addDependency || !api.hasCapability("tasks.write")) return false;

		await api.tasks.addDependency(
			blockedPath,
			{
				uid: createWikiLink(blockingPath),
				reltype,
			},
			{
				source: "baseboard",
				reason: "link-control",
			}
		);
		return true;
	}

	async removeDependency(blockedPath: string, dependencyUid: string): Promise<boolean> {
		const api = this.getApi();
		if (!api?.tasks?.removeDependency || !api.hasCapability("tasks.write")) return false;

		const storedUid = await this.findDependencyReference(blockedPath, dependencyUid);
		await api.tasks.removeDependency(blockedPath, storedUid ?? dependencyUid, {
			source: "baseboard",
			reason: "link-control",
		});
		return true;
	}

	async addProject(childPath: string, parentPath: string): Promise<boolean> {
		const api = this.getApi();
		if (!api?.tasks?.addProject || !api.hasCapability("tasks.write")) return false;

		await api.tasks.addProject(childPath, createWikiLink(parentPath), {
			source: "baseboard",
			reason: "link-control",
		});
		return true;
	}

	async removeProject(childPath: string, parentPath: string): Promise<boolean> {
		const api = this.getApi();
		if (!api?.tasks?.removeProject || !api.hasCapability("tasks.write")) return false;

		const projectReference = await this.findProjectReference(childPath, parentPath);
		if (!projectReference) return false;

		await api.tasks.removeProject(childPath, projectReference, {
			source: "baseboard",
			reason: "link-control",
		});
		return true;
	}

	async populateTaskMenu(menu: Menu, path: string, onUpdate: () => void): Promise<boolean> {
		const api = this.getApi();
		if (api?.ui?.taskMenu && api.hasCapability("ui.task-menu")) {
			try {
				await api.ui.taskMenu.populate(menu, {
					taskPath: path,
					onUpdate,
					promoteOccurrenceControls: true,
				});
				return true;
			} catch {
				// Fall through to the legacy file-menu integration below.
			}
		}

		return this.populateLegacyTaskFileMenu(menu, path);
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

	private populateLegacyTaskFileMenu(menu: Menu, path: string): boolean {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return false;
		if (!this.isLegacyTaskFile(file)) return false;

		const before = getMenuItemCount(menu);
		this.app.workspace.trigger("file-menu", menu, file, "baseboard");
		const after = getMenuItemCount(menu);

		return typeof before === "number" && typeof after === "number" ? after > before : true;
	}

	private isLegacyTaskFile(file: TFile): boolean {
		const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
		if (!isRecord(frontmatter)) return false;

		const tasknotes = this.app.plugins.getPlugin("tasknotes") as TaskNotesPluginInstance | null;
		return tasknotes?.cacheManager?.isTaskFile?.(frontmatter) === true;
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

	private async findProjectReference(childPath: string, parentPath: string): Promise<string | null> {
		const api = this.getApi();
		const task = await api?.tasks?.get(childPath);
		if (!task?.projects) return null;

		for (const project of task.projects) {
			if (this.referenceMatchesPath(project, childPath, parentPath)) {
				return project;
			}
		}

		return null;
	}

	private async findDependencyReference(
		blockedPath: string,
		dependencyUid: string
	): Promise<string | null> {
		const api = this.getApi();
		const task = await api?.tasks?.get(blockedPath);
		if (!task?.blockedBy) return null;

		return (
			task.blockedBy.find((dependency) =>
				dependencyReferencesSameTask(dependency.uid, dependencyUid)
			)?.uid ?? null
		);
	}

	private referenceMatchesPath(reference: string, sourcePath: string, targetPath: string): boolean {
		const linkPath = normalizeLinkText(reference);
		if (!linkPath) return false;

		const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);
		if (resolvedFile?.path === targetPath) return true;

		return taskReferencePathCandidates(linkPath).some((candidate) => candidate === targetPath);
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

function buildTaskCard(
	task: TaskNotesTaskInfo,
	catalog: TaskNotesCatalog,
	t: TranslateFn
): BaseboardTaskCard {
	const status = catalog.statuses.get(task.status);
	const priority = catalog.priorities.get(task.priority);
	const badges = buildTaskBadges(task, t);

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

function buildTaskBadges(task: TaskNotesTaskInfo, t: TranslateFn): BaseboardTaskBadge[] {
	const badges: BaseboardTaskBadge[] = [];

	if (task.due) {
		badges.push({
			kind: "due",
			label: t("tasknotes.badges.due"),
			value: task.due,
			tone: isPastDate(task.due) ? "danger" : "default",
		});
	}
	if (task.scheduled) {
		badges.push({
			kind: "scheduled",
			label: t("tasknotes.badges.scheduled"),
			value: task.scheduled,
		});
	}
	if (task.recurrence) {
		badges.push({
			kind: "recurrence",
			label: t("tasknotes.badges.recurrence"),
			value: t("tasknotes.badges.recurring"),
			tone: "muted",
		});
	}
	if (task.isBlocked) {
		badges.push({
			kind: "isBlocked",
			label: t("tasknotes.badges.blocked"),
			value: t("tasknotes.badges.blocked"),
			tone: "warning",
		});
	}
	if (task.isBlocking) {
		badges.push({
			kind: "isBlocking",
			label: t("tasknotes.badges.blocking"),
			value: t("tasknotes.badges.blocking"),
			tone: "warning",
		});
	}
	if (task.hasSubtasks) {
		badges.push({
			kind: "hasSubtasks",
			label: t("tasknotes.badges.subtasks"),
			value: t("tasknotes.badges.subtasks"),
			tone: "muted",
		});
	}
	if (typeof task.timeEstimate === "number" && task.timeEstimate > 0) {
		badges.push({
			kind: "timeEstimate",
			label: t("tasknotes.badges.estimate"),
			value: formatMinutes(task.timeEstimate),
		});
	}
	if (typeof task.totalTrackedTime === "number" && task.totalTrackedTime > 0) {
		badges.push({
			kind: "totalTrackedTime",
			label: t("tasknotes.badges.tracked"),
			value: formatMinutes(task.totalTrackedTime),
		});
	}

	return badges;
}

function buildDependencyRelationships(
	path: string,
	related: TaskNotesTaskRelationships,
	visiblePaths: Set<string>,
	t: TranslateFn
): BaseboardRelationship[] {
	const relationships: BaseboardRelationship[] = [];

	for (const dependency of related.dependencies) {
		const dependencyPath = dependency.path ?? dependency.task?.path;
		if (dependencyPath && visiblePaths.has(dependencyPath)) {
			const dependencyUid =
				dependency.dependency?.uid ??
				findStoredDependencyUid(related.task, dependencyPath) ??
				createWikiLink(dependencyPath);
			relationships.push({
				sourcePath: dependencyPath,
				targetPath: path,
				label: t("tasknotes.relationships.blocks"),
				metadata: {
					source: "tasknotes",
					kind: "dependency",
					blockedPath: path,
					blockingPath: dependencyPath,
					dependencyUid,
				},
			});
		}
	}

	return relationships;
}

function findStoredDependencyUid(task: TaskNotesTaskInfo, dependencyPath: string): string | null {
	return (
		task.blockedBy?.find((dependency) =>
			dependencyReferencesSameTask(dependency.uid, dependencyPath)
		)?.uid ?? null
	);
}

function buildStructuralRelationships(
	path: string,
	related: TaskNotesTaskRelationships,
	visiblePaths: Set<string>,
	t: TranslateFn
): BaseboardRelationship[] {
	const relationships: BaseboardRelationship[] = [];

	for (const parent of related.parents) {
		if (visiblePaths.has(parent.path)) {
			relationships.push({
				sourcePath: path,
				targetPath: parent.path,
				label: t("tasknotes.relationships.subtask"),
				metadata: {
					source: "tasknotes",
					kind: "project",
					parentPath: parent.path,
					childPath: path,
				},
			});
		}
	}

	for (const subtask of related.subtasks) {
		if (visiblePaths.has(subtask.path)) {
			relationships.push({
				sourcePath: subtask.path,
				targetPath: path,
				label: t("tasknotes.relationships.subtask"),
				metadata: {
					source: "tasknotes",
					kind: "project",
					parentPath: path,
					childPath: subtask.path,
				},
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

function getMenuItemCount(menu: Menu): number | null {
	const items = (menu as unknown as { items?: unknown[] }).items;
	return Array.isArray(items) ? items.length : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function defaultTranslate(key: string): string {
	const values: Record<string, string> = {
		"tasknotes.badges.due": "Due",
		"tasknotes.badges.scheduled": "Scheduled",
		"tasknotes.badges.recurrence": "Repeats",
		"tasknotes.badges.recurring": "Recurring",
		"tasknotes.badges.blocked": "Blocked",
		"tasknotes.badges.blocking": "Blocking",
		"tasknotes.badges.subtasks": "Subtasks",
		"tasknotes.badges.estimate": "Estimate",
		"tasknotes.badges.tracked": "Tracked",
		"tasknotes.relationships.blocks": "blocks",
		"tasknotes.relationships.subtask": "subtask",
	};
	return values[key] ?? key;
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

function createWikiLink(path: string): string {
	return `[[${path.replace(/\.md$/iu, "")}]]`;
}

function normalizeLinkText(value: string): string {
	return value
		.trim()
		.replace(/^\[\[/u, "")
		.replace(/\]\]$/u, "")
		.split("|")[0]
		.split("#")[0]
		.trim();
}

function taskReferencePathCandidates(path: string): string[] {
	const normalizedPath = path.trim().replace(/\\/gu, "/");
	if (!normalizedPath) return [];

	return /\.md$/iu.test(normalizedPath) ? [normalizedPath] : [normalizedPath, `${normalizedPath}.md`];
}

function dependencyReferencesSameTask(left: string, right: string): boolean {
	const leftCandidates = new Set(taskReferencePathCandidates(normalizeLinkText(left)));
	return taskReferencePathCandidates(normalizeLinkText(right)).some((candidate) =>
		leftCandidates.has(candidate)
	);
}
