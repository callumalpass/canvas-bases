import type { TFile, Value } from "obsidian";

export type CanvasBasesLayout = "columns" | "rows" | "grid";

export type CanvasBasesEdgeMode = "none" | "wikilinks" | "properties" | "all";

export type CanvasBasesTaskNotesMode = "auto" | "off";

export type CanvasBasesTaskNotesRelationshipMode = "none" | "dependencies" | "all";

export interface CanvasBasesSettings {
	locale: string;
	starterFilesCreated: boolean;
	defaultCanvasFolder: string;
	defaultLayout: CanvasBasesLayout;
	defaultEdgeMode: CanvasBasesEdgeMode;
	defaultEdgeProperties: string;
	defaultShowBodyEditor: boolean;
	defaultTaskNotesMode: CanvasBasesTaskNotesMode;
	defaultTaskNotesShowBadges: boolean;
	defaultTaskNotesShowActions: boolean;
	defaultTaskNotesRelationships: CanvasBasesTaskNotesRelationshipMode;
	preservePositions: boolean;
	removeMissingNodes: boolean;
	nodeWidth: number;
	nodeHeight: number;
	linkedViews: Record<string, StoredMaterializeOptions>;
}

export interface MaterializeOptions {
	canvasPath: string;
	layout: CanvasBasesLayout;
	edgeMode: CanvasBasesEdgeMode;
	edgeProperties: string[];
	showBodyEditor: boolean;
	taskNotesMode: CanvasBasesTaskNotesMode;
	taskNotesShowBadges: boolean;
	taskNotesShowActions: boolean;
	taskNotesRelationships: CanvasBasesTaskNotesRelationshipMode;
	preservePositions: boolean;
	removeMissingNodes: boolean;
	nodeWidth: number;
	nodeHeight: number;
}

export type StoredMaterializeOptions = Partial<MaterializeOptions>;

export interface CanvasBasesNodePosition {
	x: number;
	y: number;
	width: number;
	height: number;
	color?: string;
}

export type CanvasBasesNodePositionMap = Record<string, CanvasBasesNodePosition>;

export interface CanvasBasesEntryPropertySnapshot {
	id: string;
	displayName: string;
	value: Value | null;
	text: string;
	isEmpty: boolean;
}

export interface CanvasBasesEntrySnapshot {
	path: string;
	name: string;
	file?: TFile;
	properties?: CanvasBasesEntryPropertySnapshot[];
	position?: CanvasBasesNodePosition;
	isManual?: boolean;
}

export interface CanvasBasesGroupSnapshot {
	id: string;
	label: string;
	property?: string;
	value?: string;
	isImplicit?: boolean;
	entries: CanvasBasesEntrySnapshot[];
	position?: CanvasBasesNodePosition;
}

export type CanvasBasesZoneOrigin = "bases" | "custom";

export type CanvasBasesZoneAction =
	| "set-property"
	| "task.complete"
	| "task.uncomplete"
	| "task.archive"
	| "task.unarchive"
	| "time.start"
	| "time.stop"
	| "pomodoro.start"
	| "pomodoro.assign"
	| "recurring.complete"
	| "recurring.skip";

export type CanvasBasesZoneUpdateMode =
	| "replace"
	| "append"
	| "appendUnique"
	| "remove"
	| "clear";

export type CanvasBasesZoneValueType =
	| "auto"
	| "string"
	| "number"
	| "boolean"
	| "date"
	| "list";

export interface CanvasBasesZoneConfig {
	origin: CanvasBasesZoneOrigin;
	id?: string;
	label?: string;
	action: CanvasBasesZoneAction;
	property: string;
	value: string;
	updateMode: CanvasBasesZoneUpdateMode;
	valueType: CanvasBasesZoneValueType;
	color?: string;
}

export interface CanvasBasesManualGroupSnapshot {
	id: string;
	label: string;
	position?: CanvasBasesNodePosition;
}

export interface CanvasBasesTextCardSnapshot {
	id: string;
	text: string;
	position?: CanvasBasesNodePosition;
}

export interface CanvasBasesViewSnapshot {
	viewName: string;
	groups: CanvasBasesGroupSnapshot[];
	manualEntries: CanvasBasesEntrySnapshot[];
	manualGroups: CanvasBasesManualGroupSnapshot[];
	textCards: CanvasBasesTextCardSnapshot[];
	totalEntries: number;
}

export interface CanvasBasesRelationship {
	sourcePath: string;
	targetPath: string;
	label?: string;
	metadata?: CanvasBasesRelationshipMetadata;
}

export type CanvasBasesRelationshipMetadata =
	| {
			source: "tasknotes";
			kind: "dependency";
			blockedPath: string;
			blockingPath: string;
			dependencyUid: string;
	  }
	| {
			source: "tasknotes";
			kind: "project";
			parentPath: string;
			childPath: string;
	  }
	| {
			source: "property";
			property: string;
	  }
	| {
			source: "wikilink";
	  };

export interface CanvasBasesGenerationSummary {
	canvasPath: string;
	nodeCount: number;
	groupCount: number;
	edgeCount: number;
}
