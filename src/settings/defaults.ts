import type {
	BaseboardEdgeMode,
	BaseboardLayout,
	BaseboardSettings,
	BaseboardTaskNotesMode,
	BaseboardTaskNotesRelationshipMode,
	MaterializeOptions,
	StoredMaterializeOptions,
} from "../types";

const LAYOUTS = new Set<BaseboardLayout>(["columns", "rows", "grid"]);
const EDGE_MODES = new Set<BaseboardEdgeMode>(["none", "wikilinks", "properties", "all"]);
const TASKNOTES_MODES = new Set<BaseboardTaskNotesMode>(["auto", "off"]);
const TASKNOTES_RELATIONSHIP_MODES = new Set<BaseboardTaskNotesRelationshipMode>([
	"none",
	"dependencies",
	"all",
]);

export const DEFAULT_SETTINGS: BaseboardSettings = {
	locale: "system",
	starterFilesCreated: false,
	defaultCanvasFolder: "Baseboards",
	defaultLayout: "columns",
	defaultEdgeMode: "none",
	defaultEdgeProperties: "",
	defaultShowBodyEditor: true,
	defaultTaskNotesMode: "auto",
	defaultTaskNotesShowBadges: true,
	defaultTaskNotesShowActions: true,
	defaultTaskNotesRelationships: "dependencies",
	preservePositions: true,
	removeMissingNodes: true,
	nodeWidth: 320,
	nodeHeight: 160,
	linkedViews: {},
};

export function normalizeSettings(
	input: Partial<BaseboardSettings> | null | undefined
): BaseboardSettings {
	const settings = input ?? {};

	return {
		locale: settings.locale?.trim() || DEFAULT_SETTINGS.locale,
		starterFilesCreated:
			settings.starterFilesCreated ?? DEFAULT_SETTINGS.starterFilesCreated,
		defaultCanvasFolder:
			settings.defaultCanvasFolder?.trim() || DEFAULT_SETTINGS.defaultCanvasFolder,
		defaultLayout: normalizeLayout(settings.defaultLayout, DEFAULT_SETTINGS.defaultLayout),
		defaultEdgeMode: normalizeEdgeMode(
			settings.defaultEdgeMode,
			DEFAULT_SETTINGS.defaultEdgeMode
		),
		defaultEdgeProperties: settings.defaultEdgeProperties?.trim() ?? "",
		defaultShowBodyEditor:
			settings.defaultShowBodyEditor ?? DEFAULT_SETTINGS.defaultShowBodyEditor,
		defaultTaskNotesMode: normalizeTaskNotesMode(
			settings.defaultTaskNotesMode,
			DEFAULT_SETTINGS.defaultTaskNotesMode
		),
		defaultTaskNotesShowBadges:
			settings.defaultTaskNotesShowBadges ?? DEFAULT_SETTINGS.defaultTaskNotesShowBadges,
		defaultTaskNotesShowActions:
			settings.defaultTaskNotesShowActions ?? DEFAULT_SETTINGS.defaultTaskNotesShowActions,
		defaultTaskNotesRelationships: normalizeTaskNotesRelationshipMode(
			settings.defaultTaskNotesRelationships,
			DEFAULT_SETTINGS.defaultTaskNotesRelationships
		),
		preservePositions: settings.preservePositions ?? DEFAULT_SETTINGS.preservePositions,
		removeMissingNodes: settings.removeMissingNodes ?? DEFAULT_SETTINGS.removeMissingNodes,
		nodeWidth: normalizeDimension(settings.nodeWidth, DEFAULT_SETTINGS.nodeWidth, 160, 520),
		nodeHeight: normalizeDimension(settings.nodeHeight, DEFAULT_SETTINGS.nodeHeight, 80, 320),
		linkedViews: normalizeLinkedViews(settings.linkedViews),
	};
}

export function normalizeLayout(
	value: unknown,
	fallback: BaseboardLayout = DEFAULT_SETTINGS.defaultLayout
): BaseboardLayout {
	return typeof value === "string" && LAYOUTS.has(value as BaseboardLayout)
		? (value as BaseboardLayout)
		: fallback;
}

export function normalizeEdgeMode(
	value: unknown,
	fallback: BaseboardEdgeMode = DEFAULT_SETTINGS.defaultEdgeMode
): BaseboardEdgeMode {
	return typeof value === "string" && EDGE_MODES.has(value as BaseboardEdgeMode)
		? (value as BaseboardEdgeMode)
		: fallback;
}

export function normalizeTaskNotesMode(
	value: unknown,
	fallback: BaseboardTaskNotesMode = DEFAULT_SETTINGS.defaultTaskNotesMode
): BaseboardTaskNotesMode {
	return typeof value === "string" && TASKNOTES_MODES.has(value as BaseboardTaskNotesMode)
		? (value as BaseboardTaskNotesMode)
		: fallback;
}

export function normalizeTaskNotesRelationshipMode(
	value: unknown,
	fallback: BaseboardTaskNotesRelationshipMode = DEFAULT_SETTINGS.defaultTaskNotesRelationships
): BaseboardTaskNotesRelationshipMode {
	return typeof value === "string" &&
		TASKNOTES_RELATIONSHIP_MODES.has(value as BaseboardTaskNotesRelationshipMode)
		? (value as BaseboardTaskNotesRelationshipMode)
		: fallback;
}

export function normalizeDimension(
	value: unknown,
	fallback: number,
	min: number,
	max: number
): number {
	const numericValue = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(numericValue)) return fallback;
	return Math.min(max, Math.max(min, Math.round(numericValue)));
}

export function splitPropertyList(value: string): string[] {
	return value
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export function buildDefaultMaterializeOptions(
	settings: BaseboardSettings,
	viewName: string,
	configCanvasPath?: string
): MaterializeOptions {
	const canvasPath =
		configCanvasPath?.trim() ||
		`${settings.defaultCanvasFolder}/${sanitizeFileName(viewName || "Baseboard")}.canvas`;

	return {
		canvasPath,
		layout: settings.defaultLayout,
		edgeMode: settings.defaultEdgeMode,
		edgeProperties: splitPropertyList(settings.defaultEdgeProperties),
		showBodyEditor: settings.defaultShowBodyEditor,
		taskNotesMode: settings.defaultTaskNotesMode,
		taskNotesShowBadges: settings.defaultTaskNotesShowBadges,
		taskNotesShowActions: settings.defaultTaskNotesShowActions,
		taskNotesRelationships: settings.defaultTaskNotesRelationships,
		preservePositions: settings.preservePositions,
		removeMissingNodes: settings.removeMissingNodes,
		nodeWidth: settings.nodeWidth,
		nodeHeight: settings.nodeHeight,
	};
}

export function normalizeMaterializeOptions(
	input: StoredMaterializeOptions | null | undefined,
	defaults: MaterializeOptions
): MaterializeOptions {
	const edgeProperties = Array.isArray(input?.edgeProperties)
		? input.edgeProperties
				.map((entry) => entry.trim())
				.filter((entry) => entry.length > 0)
		: defaults.edgeProperties;

	return {
		canvasPath: input?.canvasPath?.trim() || defaults.canvasPath,
		layout: normalizeLayout(input?.layout, defaults.layout),
		edgeMode: normalizeEdgeMode(input?.edgeMode, defaults.edgeMode),
		edgeProperties,
		showBodyEditor: input?.showBodyEditor ?? defaults.showBodyEditor,
		taskNotesMode: normalizeTaskNotesMode(input?.taskNotesMode, defaults.taskNotesMode),
		taskNotesShowBadges: input?.taskNotesShowBadges ?? defaults.taskNotesShowBadges,
		taskNotesShowActions: input?.taskNotesShowActions ?? defaults.taskNotesShowActions,
		taskNotesRelationships: normalizeTaskNotesRelationshipMode(
			input?.taskNotesRelationships,
			defaults.taskNotesRelationships
		),
		preservePositions: input?.preservePositions ?? defaults.preservePositions,
		removeMissingNodes: input?.removeMissingNodes ?? defaults.removeMissingNodes,
		nodeWidth: normalizeDimension(input?.nodeWidth, defaults.nodeWidth, 160, 520),
		nodeHeight: normalizeDimension(input?.nodeHeight, defaults.nodeHeight, 80, 320),
	};
}

export function sanitizeFileName(value: string): string {
	return value
		.trim()
		.replace(/[\\/:*?"<>|#^[\]]/gu, "-")
		.replace(/\s+/gu, " ")
		.replace(/-+/gu, "-")
		.replace(/^\.+/u, "")
		.slice(0, 120)
		.trim() || "Baseboard";
}

export function normalizeCanvasPath(value: string): string {
	const trimmed = value.trim().replace(/^\/+/u, "");
	return trimmed.endsWith(".canvas") ? trimmed : `${trimmed}.canvas`;
}

function normalizeLinkedViews(
	value: unknown
): Record<string, StoredMaterializeOptions> {
	if (!isRecord(value)) return {};

	const linkedViews: Record<string, StoredMaterializeOptions> = {};
	for (const [key, options] of Object.entries(value)) {
		if (typeof key !== "string" || !isRecord(options)) continue;
		linkedViews[key] = normalizeStoredMaterializeOptions(options);
	}

	return linkedViews;
}

function normalizeStoredMaterializeOptions(
	input: Record<string, unknown>
): StoredMaterializeOptions {
	const options: StoredMaterializeOptions = {};

	if (typeof input.canvasPath === "string") {
		options.canvasPath = input.canvasPath;
	}
	if (typeof input.layout === "string") {
		options.layout = normalizeLayout(input.layout);
	}
	if (typeof input.edgeMode === "string") {
		options.edgeMode = normalizeEdgeMode(input.edgeMode);
	}
	if (Array.isArray(input.edgeProperties)) {
		options.edgeProperties = input.edgeProperties.filter(
			(entry): entry is string => typeof entry === "string"
		);
	}
	if (typeof input.showBodyEditor === "boolean") {
		options.showBodyEditor = input.showBodyEditor;
	}
	if (typeof input.taskNotesMode === "string") {
		options.taskNotesMode = normalizeTaskNotesMode(input.taskNotesMode);
	}
	if (typeof input.taskNotesShowBadges === "boolean") {
		options.taskNotesShowBadges = input.taskNotesShowBadges;
	}
	if (typeof input.taskNotesShowActions === "boolean") {
		options.taskNotesShowActions = input.taskNotesShowActions;
	}
	if (typeof input.taskNotesRelationships === "string") {
		options.taskNotesRelationships = normalizeTaskNotesRelationshipMode(
			input.taskNotesRelationships
		);
	}
	if (typeof input.preservePositions === "boolean") {
		options.preservePositions = input.preservePositions;
	}
	if (typeof input.removeMissingNodes === "boolean") {
		options.removeMissingNodes = input.removeMissingNodes;
	}
	if (typeof input.nodeWidth === "number" || typeof input.nodeWidth === "string") {
		options.nodeWidth = normalizeDimension(input.nodeWidth, DEFAULT_SETTINGS.nodeWidth, 160, 520);
	}
	if (typeof input.nodeHeight === "number" || typeof input.nodeHeight === "string") {
		options.nodeHeight = normalizeDimension(input.nodeHeight, DEFAULT_SETTINGS.nodeHeight, 80, 320);
	}

	return options;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
