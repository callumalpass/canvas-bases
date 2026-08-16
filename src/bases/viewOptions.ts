import type { BasesAllOptions } from "obsidian";
import { VIEW_CONFIG_KEYS } from "../constants";
import type { TranslateFn } from "../i18n";
import type { CanvasBasesSettings } from "../types";

export function buildCanvasBasesViewOptions(
	t: TranslateFn,
	defaults: CanvasBasesSettings
): BasesAllOptions[] {
	return [
		{
			type: "group",
			displayName: t("basesOptions.canvas"),
			items: [
				{
					type: "text",
					key: VIEW_CONFIG_KEYS.canvasPath,
					displayName: t("basesOptions.canvasPath"),
					placeholder: "Canvas Bases/My View.canvas",
					default: "",
				},
				{
					type: "dropdown",
					key: VIEW_CONFIG_KEYS.layout,
					displayName: t("basesOptions.layout"),
					default: defaults.defaultLayout,
					options: {
						columns: t("options.layout.columns"),
						rows: t("options.layout.rows"),
						grid: t("options.layout.grid"),
					},
				},
				{
					type: "dropdown",
					key: VIEW_CONFIG_KEYS.edgeMode,
					displayName: t("basesOptions.edges"),
					default: defaults.defaultEdgeMode,
					options: {
						none: t("common.none"),
						wikilinks: t("options.edgeMode.wikilinks"),
						properties: t("options.edgeMode.properties"),
						all: t("options.edgeMode.all"),
					},
				},
				{
					type: "text",
					key: VIEW_CONFIG_KEYS.edgeProperties,
					displayName: t("basesOptions.linkProperties"),
					placeholder: "depends_on, related",
					default: defaults.defaultEdgeProperties,
				},
			],
		},
		{
			type: "group",
			displayName: t("basesOptions.cards"),
			items: [
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.showBodyEditor,
					displayName: t("basesOptions.showBodyEditor"),
					default: defaults.defaultShowBodyEditor,
				},
			],
		},
		{
			type: "group",
			displayName: t("basesOptions.tasknotes"),
			items: [
				{
					type: "dropdown",
					key: VIEW_CONFIG_KEYS.taskNotesMode,
					displayName: t("basesOptions.tasknotesIntegration"),
					default: defaults.defaultTaskNotesMode,
					options: {
						auto: t("common.automatic"),
						off: t("common.off"),
					},
				},
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.taskNotesShowBadges,
					displayName: t("basesOptions.showTaskBadges"),
					default: defaults.defaultTaskNotesShowBadges,
				},
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.taskNotesShowActions,
					displayName: t("basesOptions.showTaskActions"),
					default: defaults.defaultTaskNotesShowActions,
				},
				{
					type: "dropdown",
					key: VIEW_CONFIG_KEYS.taskNotesRelationships,
					displayName: t("basesOptions.taskRelationshipEdges"),
					default: defaults.defaultTaskNotesRelationships,
					options: {
						none: t("common.none"),
						dependencies: t("options.relationships.dependencies"),
						all: t("options.relationships.all"),
					},
				},
			],
		},
		{
			type: "group",
			displayName: t("basesOptions.manualCards"),
			items: [
				{
					type: "multitext",
					key: VIEW_CONFIG_KEYS.manualNotePaths,
					displayName: t("basesOptions.pinnedNotes"),
					default: [],
				},
			],
		},
		{
			type: "group",
			displayName: t("basesOptions.updateRules"),
			items: [
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.preservePositions,
					displayName: t("basesOptions.preservePositions"),
					default: defaults.preservePositions,
				},
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.removeMissingNodes,
					displayName: t("basesOptions.removeMissingNotes"),
					default: defaults.removeMissingNodes,
				},
				{
					type: "slider",
					key: VIEW_CONFIG_KEYS.nodeWidth,
					displayName: t("basesOptions.nodeWidth"),
					default: defaults.nodeWidth,
					min: 160,
					max: 520,
					step: 20,
				},
				{
					type: "slider",
					key: VIEW_CONFIG_KEYS.nodeHeight,
					displayName: t("basesOptions.nodeHeight"),
					default: defaults.nodeHeight,
					min: 80,
					max: 320,
					step: 10,
				},
			],
		},
	];
}
