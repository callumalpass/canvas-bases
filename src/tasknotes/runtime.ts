import { TFile, type App, type EventRef, type Menu } from "obsidian";
import type {
	CanvasBasesRelationship,
	CanvasBasesTaskNotesRelationshipMode,
	CanvasBasesViewSnapshot,
	CanvasBasesZoneAction,
	CanvasBasesZoneUpdateMode,
	CanvasBasesZoneValueType,
} from "../types";
import type { TranslateFn } from "../i18n";
import { getSnapshotPaths } from "../bases/snapshotEntries";
import { applyActiveGroupUpdate } from "../bases/activeGroupUpdates";

export interface CanvasBasesTaskBadge {
	kind: CanvasBasesTaskPropertyKind;
	label: string;
	value: string;
	color?: string;
	tone?: "default" | "danger" | "muted" | "success" | "warning";
}

export type CanvasBasesTaskPropertyKind =
	| "activeTimeTracking"
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

export interface CanvasBasesTaskCard {
	path: string;
	title: string;
	status: CanvasBasesTaskBadge;
	priority: CanvasBasesTaskBadge;
	badges: CanvasBasesTaskBadge[];
	isArchived: boolean;
	isBlocked: boolean;
	isBlocking: boolean;
	isCompleted: boolean;
	isTracking: boolean;
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
		update?(
			path: string,
			patch: TaskNotesTaskPatch,
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
		patch?(
			path: string,
			patch: TaskNotesTaskPatch,
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
		complete?(
			path: string,
			options?: unknown,
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
		uncomplete?(
			path: string,
			options?: unknown,
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
		archive?(
			path: string,
			archived: boolean,
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
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
	settings?: {
		snapshot?(): { useFrontmatterMarkdownLinks?: boolean };
	};
	catalog?: {
		statuses(): TaskNotesStatusConfig[];
		priorities(): TaskNotesPriorityConfig[];
		fields?(): TaskNotesFieldDefinition[];
		writableFields?(): TaskNotesFieldDefinition[];
	};
	relationships?: {
		parents(path: string): Promise<TaskNotesTaskInfo[]>;
		dependencies(path: string): Promise<ResolvedTaskDependency[]>;
	};
	time?: {
		start?(
			path: string,
			options?: { description?: string },
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
		stop?(path: string, context?: TaskNotesMutationContext): Promise<TaskNotesTaskInfo>;
	};
	pomodoro?: {
		start?(
			options?: { taskPath?: string; duration?: number },
			context?: TaskNotesMutationContext
		): Promise<unknown>;
		assignTask?(path: string | null, context?: TaskNotesMutationContext): Promise<unknown>;
	};
	recurring?: {
		toggleCompleteInstance?(
			path: string,
			date?: string,
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
		toggleSkippedInstance?(
			path: string,
			date?: string,
			context?: TaskNotesMutationContext
		): Promise<TaskNotesTaskInfo>;
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
	writable?: boolean;
	source?: string;
	valueType?: string;
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
	timeEntries?: TaskNotesTimeEntry[];
	tags?: string[];
	contexts?: string[];
	projects?: string[];
	isBlocked?: boolean;
	isBlocking?: boolean;
	hasSubtasks?: boolean;
}

type TaskNotesTaskPatch = Record<string, unknown>;

export type CanvasBasesTaskNotesPropertyUpdateResult =
	| "not-task-field"
	| "unavailable"
	| "updated";

export type CanvasBasesTaskNotesZoneActionResult =
	| "not-task"
	| "unavailable"
	| "updated";

interface TaskNotesPropertyUpdateOptions {
	updateMode?: CanvasBasesZoneUpdateMode;
	valueType?: CanvasBasesZoneValueType;
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

interface TaskNotesTimeEntry {
	startTime: string;
	endTime?: string | null;
	description?: string | null;
}

type TaskNotesZoneAction = Exclude<CanvasBasesZoneAction, "set-property">;

const TASK_NOTES_ZONE_ACTIONS = [
	"task.complete",
	"task.uncomplete",
	"task.archive",
	"task.unarchive",
	"time.start",
	"time.stop",
	"pomodoro.start",
	"pomodoro.assign",
	"recurring.complete",
	"recurring.skip",
] as const satisfies readonly TaskNotesZoneAction[];

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

	getAvailableZoneActions(): TaskNotesZoneAction[] {
		const available = new Set<TaskNotesZoneAction>();
		const api = this.getApi();
		if (api?.tasks?.get && api.hasCapability("tasks.read")) {
			for (const action of TASK_NOTES_ZONE_ACTIONS) {
				if (this.isZoneActionAvailable(api, action)) available.add(action);
			}
		}

		return TASK_NOTES_ZONE_ACTIONS.filter((action) => available.has(action));
	}

	getPropertyKind(propertyId: string): CanvasBasesTaskPropertyKind | null {
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

	getWritablePropertyIds(): string[] {
		const api = this.getApi();
		if (!api?.catalog || !api.hasCapability("catalog.read")) return [];

		const properties = new Set<string>();
		for (const field of getWritableFields(api)) {
			if (field.id) properties.add(`task.${field.id}`);
			if (field.frontmatterKey) properties.add(`note.${field.frontmatterKey}`);
			for (const alias of field.aliases ?? []) {
				if (/^task\./iu.test(alias.trim())) properties.add(alias.trim());
			}
		}

		return [...properties].sort((left, right) => left.localeCompare(right));
	}

	async updateMappedProperty(
		path: string,
		propertyId: string,
		value: string,
		options: TaskNotesPropertyUpdateOptions = {}
	): Promise<CanvasBasesTaskNotesPropertyUpdateResult> {
		const api = this.getApi();
		const field = this.getWritableFieldForProperty(propertyId);
		if (!field) return "not-task-field";

		if (
			!api?.tasks?.get ||
			!api.hasCapability("tasks.read") ||
			!api.hasCapability("tasks.write") ||
			!(api.tasks.patch || api.tasks.update)
		) {
			return "unavailable";
		}

		const task = await api.tasks.get(path);
		if (!task) return "not-task-field";

		const nextValue = applyActiveGroupUpdate(
			getTaskFieldCurrentValue(task, field),
			value,
			{
				updateMode: options.updateMode ?? "replace",
				valueType: options.valueType ?? "auto",
				metadataType: field.valueType ?? null,
			}
		);
		const patch = buildTaskPatch(field, nextValue);
		const context = {
			source: "canvas-bases",
			reason: "active-group",
		};

		if (api.tasks.patch) {
			await api.tasks.patch(path, patch, context);
		} else if (api.tasks.update) {
			await api.tasks.update(path, patch, context);
		} else {
			return "unavailable";
		}
		return "updated";
	}

	async runZoneAction(
		path: string,
		action: CanvasBasesZoneAction
	): Promise<CanvasBasesTaskNotesZoneActionResult> {
		if (action === "set-property") return "unavailable";
		const api = this.getApi();
		if (!api?.tasks?.get || !api.hasCapability("tasks.read")) return "unavailable";

		const task = await api.tasks.get(path);
		if (!task) return "not-task";

		const context = {
			source: "canvas-bases",
			reason: "zone-action",
		};

		switch (action) {
			case "task.complete":
				if (!api.tasks.complete || !api.hasCapability("tasks.write")) return "unavailable";
				await api.tasks.complete(path, undefined, context);
				return "updated";
			case "task.uncomplete":
				if (!api.tasks.uncomplete || !api.hasCapability("tasks.write")) return "unavailable";
				await api.tasks.uncomplete(path, undefined, context);
				return "updated";
			case "task.archive":
				if (!api.tasks.archive || !api.hasCapability("tasks.write")) return "unavailable";
				await api.tasks.archive(path, true, context);
				return "updated";
			case "task.unarchive":
				if (!api.tasks.archive || !api.hasCapability("tasks.write")) return "unavailable";
				await api.tasks.archive(path, false, context);
				return "updated";
			case "time.start":
				if (!api.time?.start || !api.hasCapability("time.write")) return "unavailable";
				await api.time.start(path, undefined, context);
				return "updated";
			case "time.stop":
				if (!api.time?.stop || !api.hasCapability("time.write")) return "unavailable";
				await api.time.stop(path, context);
				return "updated";
			case "pomodoro.start":
				if (!api.pomodoro?.start || !api.hasCapability("pomodoro.write")) return "unavailable";
				await api.pomodoro.start({ taskPath: path }, context);
				return "updated";
			case "pomodoro.assign":
				if (!api.pomodoro?.assignTask || !api.hasCapability("pomodoro.write")) return "unavailable";
				await api.pomodoro.assignTask(path, context);
				return "updated";
			case "recurring.complete":
				if (
					!api.recurring?.toggleCompleteInstance ||
					!api.hasCapability("recurring.write")
				) {
					return "unavailable";
				}
				await api.recurring.toggleCompleteInstance(path, undefined, context);
				return "updated";
			case "recurring.skip":
				if (!api.recurring?.toggleSkippedInstance || !api.hasCapability("recurring.write")) {
					return "unavailable";
				}
				await api.recurring.toggleSkippedInstance(path, undefined, context);
				return "updated";
		}
	}

	private isZoneActionAvailable(
		api: TaskNotesRuntimeApiV1,
		action: TaskNotesZoneAction
	): boolean {
		switch (action) {
			case "task.complete":
				return Boolean(api.tasks?.complete && api.hasCapability("tasks.write"));
			case "task.uncomplete":
				return Boolean(api.tasks?.uncomplete && api.hasCapability("tasks.write"));
			case "task.archive":
			case "task.unarchive":
				return Boolean(api.tasks?.archive && api.hasCapability("tasks.write"));
			case "time.start":
				return Boolean(api.time?.start && api.hasCapability("time.write"));
			case "time.stop":
				return Boolean(api.time?.stop && api.hasCapability("time.write"));
			case "pomodoro.start":
				return Boolean(api.pomodoro?.start && api.hasCapability("pomodoro.write"));
			case "pomodoro.assign":
				return Boolean(api.pomodoro?.assignTask && api.hasCapability("pomodoro.write"));
			case "recurring.complete":
				return Boolean(
					api.recurring?.toggleCompleteInstance &&
						api.hasCapability("recurring.write")
				);
			case "recurring.skip":
				return Boolean(
					api.recurring?.toggleSkippedInstance &&
						api.hasCapability("recurring.write")
				);
		}
	}

	async getTaskCards(paths: string[]): Promise<Map<string, CanvasBasesTaskCard>> {
		const api = this.getApi();
		if (!api?.tasks || !api.hasCapability("tasks.read")) {
			return new Map();
		}

		const catalog = this.getCatalog(api);
		const cards = new Map<string, CanvasBasesTaskCard>();

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
		snapshot: CanvasBasesViewSnapshot,
		mode: CanvasBasesTaskNotesRelationshipMode
	): Promise<CanvasBasesRelationship[]> {
		const api = this.getApi();
		if (mode === "none" || !api?.relationships || !api.hasCapability("relationships.read")) {
			return [];
		}

		const visiblePaths = new Set(getSnapshotPaths(snapshot));
		const relationships: CanvasBasesRelationship[] = [];

		await Promise.all(
			[...visiblePaths].map(async (path) => {
				const dependencies = await readDependencies(api, path);
				relationships.push(...buildDependencyRelationships(path, dependencies, visiblePaths, this.t));
				if (mode === "all") {
					const parents = await readParents(api, path);
					relationships.push(...buildStructuralRelationships(path, parents, visiblePaths, this.t));
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
				source: "canvas-bases",
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
			source: "canvas-bases",
			reason: "link-control",
		});
		return true;
	}

	async addProject(childPath: string, parentPath: string): Promise<boolean> {
		const api = this.getApi();
		if (!api?.tasks?.addProject || !api.hasCapability("tasks.write")) return false;

		const parentFile = this.app.vault.getAbstractFileByPath(parentPath);
		if (!(parentFile instanceof TFile)) return false;

		// Match TaskNotes' frontmatter link policy, relative to the child note,
		// not the Base hosting the board. Obsidian handles ambiguous filenames.
		const projectReference = api.settings?.snapshot?.().useFrontmatterMarkdownLinks
			? this.app.fileManager.generateMarkdownLink(parentFile, childPath, "", "")
			: `[[${this.app.metadataCache.fileToLinktext(parentFile, childPath, true)}]]`;
		await api.tasks.addProject(childPath, projectReference, {
			source: "canvas-bases",
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
			source: "canvas-bases",
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
		this.app.workspace.trigger("file-menu", menu, file, "canvas-bases");
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

	private getWritableFieldForProperty(propertyId: string): TaskNotesFieldDefinition | null {
		const api = this.getApi();
		if (!api?.catalog || !api.hasCapability("catalog.read")) return null;

		const normalized = normalizePropertyId(propertyId);
		if (!normalized) return null;

		return getWritableFields(api).find((field) =>
			fieldMatchesProperty(field, propertyId, normalized)
		) ?? null;
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

async function readDependencies(
	api: TaskNotesRuntimeApiV1,
	path: string
): Promise<ResolvedTaskDependency[]> {
	try {
		return (await api.relationships?.dependencies(path)) ?? [];
	} catch {
		return [];
	}
}

async function readParents(api: TaskNotesRuntimeApiV1, path: string): Promise<TaskNotesTaskInfo[]> {
	try {
		return (await api.relationships?.parents(path)) ?? [];
	} catch {
		return [];
	}
}

function buildTaskCard(
	task: TaskNotesTaskInfo,
	catalog: TaskNotesCatalog,
	t: TranslateFn
): CanvasBasesTaskCard {
	const status = catalog.statuses.get(task.status);
	const priority = catalog.priorities.get(task.priority);
	const badges = buildTaskBadges(task, t);
	const isTracking = hasActiveTimeEntry(task);

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
		isTracking,
		hasSubtasks: Boolean(task.hasSubtasks),
	};
}

function buildTaskBadges(task: TaskNotesTaskInfo, t: TranslateFn): CanvasBasesTaskBadge[] {
	const badges: CanvasBasesTaskBadge[] = [];

	if (hasActiveTimeEntry(task)) {
		badges.push({
			kind: "activeTimeTracking",
			label: t("tasknotes.badges.tracking"),
			value: t("tasknotes.badges.active"),
			tone: "success",
		});
	}
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
	dependencies: ResolvedTaskDependency[],
	visiblePaths: Set<string>,
	t: TranslateFn
): CanvasBasesRelationship[] {
	const relationships: CanvasBasesRelationship[] = [];

	for (const dependency of dependencies) {
		const dependencyPath = dependency.path ?? dependency.task?.path;
		if (dependencyPath && visiblePaths.has(dependencyPath)) {
			const dependencyUid = dependency.dependency?.uid ?? createWikiLink(dependencyPath);
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

function buildStructuralRelationships(
	path: string,
	parents: TaskNotesTaskInfo[],
	visiblePaths: Set<string>,
	t: TranslateFn
): CanvasBasesRelationship[] {
	const relationships: CanvasBasesRelationship[] = [];

	for (const parent of parents) {
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

	return relationships;
}

function dedupeRelationships(
	relationships: CanvasBasesRelationship[]
): CanvasBasesRelationship[] {
	const seen = new Set<string>();
	const result: CanvasBasesRelationship[] = [];

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
		"tasknotes.badges.tracking": "Tracking",
		"tasknotes.badges.active": "Active",
		"tasknotes.relationships.blocks": "blocks",
		"tasknotes.relationships.subtask": "subtask",
	};
	return values[key] ?? key;
}

function hasActiveTimeEntry(task: TaskNotesTaskInfo): boolean {
	return (task.timeEntries ?? []).some((entry) => !entry.endTime);
}

function getTaskPropertyKindFromFieldId(id: string): CanvasBasesTaskPropertyKind | null {
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

function getTaskFieldCurrentValue(
	task: TaskNotesTaskInfo,
	field: TaskNotesFieldDefinition
): unknown {
	const taskRecord = task as unknown as Record<string, unknown>;

	if (!isUserField(field)) {
		return taskRecord[field.id];
	}

	const key = field.frontmatterKey ?? field.id.replace(/^user[:.]/iu, "");
	const customFrontmatter = taskRecord.customFrontmatter;
	if (isRecord(customFrontmatter) && key in customFrontmatter) {
		return customFrontmatter[key];
	}

	return taskRecord[key] ?? taskRecord[field.id];
}

function buildTaskPatch(field: TaskNotesFieldDefinition, value: unknown): TaskNotesTaskPatch {
	if (isUserField(field)) {
		const key = field.frontmatterKey ?? field.id.replace(/^user[:.]/iu, "");
		return {
			customFrontmatter: {
				[key]: typeof value === "undefined" ? null : value,
			},
		};
	}

	return {
		[field.id]: value,
	};
}

function getWritableFields(api: TaskNotesRuntimeApiV1): TaskNotesFieldDefinition[] {
	return api.catalog?.writableFields?.() ??
		api.catalog?.fields?.().filter((field) => field.writable !== false) ??
		[];
}

function fieldMatchesProperty(
	field: TaskNotesFieldDefinition,
	propertyId: string,
	normalizedPropertyId: string
): boolean {
	const propertyIds = isTaskPropertyId(propertyId)
		? [field.id, field.frontmatterKey, ...(field.aliases ?? [])]
		: [field.frontmatterKey];
	return propertyIds.some(
		(propertyId) =>
			typeof propertyId === "string" &&
			normalizePropertyId(propertyId) === normalizedPropertyId
	);
}

function isUserField(field: TaskNotesFieldDefinition): boolean {
	return field.source === "user" || /^user[:.]/iu.test(field.id);
}

function isTaskPropertyId(propertyId: string): boolean {
	return /^task\./iu.test(propertyId.trim());
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
