import { PluginSettingTab, Setting } from "obsidian";
import type BaseboardPlugin from "../plugin";
import {
	DEFAULT_SETTINGS,
	normalizeDimension,
	normalizeEdgeMode,
	normalizeLayout,
	normalizeTaskNotesMode,
	normalizeTaskNotesRelationshipMode,
} from "./defaults";

export class BaseboardSettingTab extends PluginSettingTab {
	private readonly baseboardPlugin: BaseboardPlugin;

	constructor(plugin: BaseboardPlugin) {
		super(plugin.app, plugin);
		this.baseboardPlugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("baseboard-settings");

		new Setting(containerEl).setName("Defaults").setHeading();

		new Setting(containerEl)
			.setName("Default canvas folder")
			.setDesc("Folder used when a baseboard view has no canvas path yet.")
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.defaultCanvasFolder)
					.setValue(this.baseboardPlugin.settings.defaultCanvasFolder)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultCanvasFolder:
								value.trim() || DEFAULT_SETTINGS.defaultCanvasFolder,
						});
					});
			});

		new Setting(containerEl)
			.setName("Default layout")
			.setDesc("Initial layout used for new canvas snapshots.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("columns", "Grouped columns")
					.addOption("rows", "Grouped rows")
					.addOption("grid", "Grid")
					.setValue(this.baseboardPlugin.settings.defaultLayout)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultLayout: normalizeLayout(value),
						});
					});
			});

		new Setting(containerEl)
			.setName("Default edges")
			.setDesc("Initial edge source for new canvas snapshots.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", "None")
					.addOption("wikilinks", "Links within view")
					.addOption("properties", "Selected properties")
					.addOption("all", "Links and selected properties")
					.setValue(this.baseboardPlugin.settings.defaultEdgeMode)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultEdgeMode: normalizeEdgeMode(value),
						});
					});
			});

		new Setting(containerEl)
			.setName("Default edge properties")
			.setDesc("Comma-separated frontmatter properties used when property edges are enabled.")
			.addText((text) => {
				text.setPlaceholder("Depends_on, related")
					.setValue(this.baseboardPlugin.settings.defaultEdgeProperties)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultEdgeProperties: value.trim(),
						});
					});
			});

		new Setting(containerEl)
			.setName("Show body editor")
			.setDesc("Show editable note body text on live baseboard cards by default.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.baseboardPlugin.settings.defaultShowBodyEditor)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultShowBodyEditor: value,
						});
					});
			});

		new Setting(containerEl).setName("Tasknotes").setHeading();

		new Setting(containerEl)
			.setName("Tasknotes integration")
			.setDesc("Default tasknotes behavior for new baseboard views.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("auto", "Automatic")
					.addOption("off", "Off")
					.setValue(this.baseboardPlugin.settings.defaultTaskNotesMode)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultTaskNotesMode: normalizeTaskNotesMode(value),
						});
					});
			});

		new Setting(containerEl)
			.setName("Show task badges")
			.setDesc("Show tasknotes status, priority, due dates, and blockers on live cards by default.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.baseboardPlugin.settings.defaultTaskNotesShowBadges)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultTaskNotesShowBadges: value,
						});
					});
			});

		new Setting(containerEl)
			.setName("Show task actions")
			.setDesc("Use the tasknotes task menu from card actions by default.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.baseboardPlugin.settings.defaultTaskNotesShowActions)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultTaskNotesShowActions: value,
						});
					});
			});

		new Setting(containerEl)
			.setName("Task relationship edges")
			.setDesc("Default tasknotes relationship edges for generated canvases and live boards.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", "None")
					.addOption("dependencies", "Dependencies")
					.addOption("all", "Dependencies and subtasks")
					.setValue(this.baseboardPlugin.settings.defaultTaskNotesRelationships)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultTaskNotesRelationships: normalizeTaskNotesRelationshipMode(value),
						});
					});
			});

		new Setting(containerEl)
			.setName("Preserve positions")
			.setDesc("Keep existing baseboard node positions when updating a canvas.")
			.addToggle((toggle) => {
				toggle.setValue(this.baseboardPlugin.settings.preservePositions).onChange((value) => {
					void this.baseboardPlugin.updateSettings({ preservePositions: value });
				});
			});

		new Setting(containerEl)
			.setName("Remove missing notes")
			.setDesc("Remove baseboard nodes that no longer appear in the current base result.")
			.addToggle((toggle) => {
				toggle.setValue(this.baseboardPlugin.settings.removeMissingNodes).onChange((value) => {
					void this.baseboardPlugin.updateSettings({ removeMissingNodes: value });
				});
			});

		new Setting(containerEl)
			.setName("Node width")
			.setDesc("Default canvas file node width.")
			.addText((text) => {
				text.setPlaceholder(String(DEFAULT_SETTINGS.nodeWidth))
					.setValue(String(this.baseboardPlugin.settings.nodeWidth))
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							nodeWidth: normalizeDimension(
								value,
								DEFAULT_SETTINGS.nodeWidth,
								160,
								520
							),
						});
					});
			});

		new Setting(containerEl)
			.setName("Node height")
			.setDesc("Default canvas file node height.")
			.addText((text) => {
				text.setPlaceholder(String(DEFAULT_SETTINGS.nodeHeight))
					.setValue(String(this.baseboardPlugin.settings.nodeHeight))
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							nodeHeight: normalizeDimension(
								value,
								DEFAULT_SETTINGS.nodeHeight,
								80,
								320
							),
						});
					});
			});
	}
}
