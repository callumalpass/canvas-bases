import type { TFile, Value } from "obsidian";

export type BaseboardLayout = "columns" | "rows" | "grid";

export type BaseboardEdgeMode = "none" | "wikilinks" | "properties" | "all";

export type BaseboardTaskNotesMode = "auto" | "off";

export type BaseboardTaskNotesRelationshipMode = "none" | "dependencies" | "all";

export interface BaseboardSettings {
	locale: string;
	starterFilesCreated: boolean;
	defaultCanvasFolder: string;
	defaultLayout: BaseboardLayout;
	defaultEdgeMode: BaseboardEdgeMode;
	defaultEdgeProperties: string;
	defaultShowBodyEditor: boolean;
	defaultTaskNotesMode: BaseboardTaskNotesMode;
	defaultTaskNotesShowBadges: boolean;
	defaultTaskNotesShowActions: boolean;
	defaultTaskNotesRelationships: BaseboardTaskNotesRelationshipMode;
	preservePositions: boolean;
	removeMissingNodes: boolean;
	nodeWidth: number;
	nodeHeight: number;
	linkedViews: Record<string, StoredMaterializeOptions>;
}

export interface MaterializeOptions {
	canvasPath: string;
	layout: BaseboardLayout;
	edgeMode: BaseboardEdgeMode;
	edgeProperties: string[];
	showBodyEditor: boolean;
	taskNotesMode: BaseboardTaskNotesMode;
	taskNotesShowBadges: boolean;
	taskNotesShowActions: boolean;
	taskNotesRelationships: BaseboardTaskNotesRelationshipMode;
	preservePositions: boolean;
	removeMissingNodes: boolean;
	nodeWidth: number;
	nodeHeight: number;
}

export type StoredMaterializeOptions = Partial<MaterializeOptions>;

export interface BaseboardNodePosition {
	x: number;
	y: number;
	width: number;
	height: number;
}

export type BaseboardNodePositionMap = Record<string, BaseboardNodePosition>;

export interface BaseboardEntryPropertySnapshot {
	id: string;
	displayName: string;
	value: Value | null;
	text: string;
	isEmpty: boolean;
}

export interface BaseboardEntrySnapshot {
	path: string;
	name: string;
	file?: TFile;
	properties?: BaseboardEntryPropertySnapshot[];
	position?: BaseboardNodePosition;
	isManual?: boolean;
}

export interface BaseboardGroupSnapshot {
	id: string;
	label: string;
	entries: BaseboardEntrySnapshot[];
	position?: BaseboardNodePosition;
}

export interface BaseboardManualGroupSnapshot {
	id: string;
	label: string;
	position?: BaseboardNodePosition;
}

export interface BaseboardTextCardSnapshot {
	id: string;
	text: string;
	position?: BaseboardNodePosition;
}

export interface BaseboardViewSnapshot {
	viewName: string;
	groups: BaseboardGroupSnapshot[];
	manualEntries: BaseboardEntrySnapshot[];
	manualGroups: BaseboardManualGroupSnapshot[];
	textCards: BaseboardTextCardSnapshot[];
	totalEntries: number;
}

export interface BaseboardRelationship {
	sourcePath: string;
	targetPath: string;
	label?: string;
	metadata?: BaseboardRelationshipMetadata;
}

export type BaseboardRelationshipMetadata =
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

export interface BaseboardGenerationSummary {
	canvasPath: string;
	nodeCount: number;
	groupCount: number;
	edgeCount: number;
}
