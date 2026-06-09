import { Notice, PluginSettingTab, Setting } from "obsidian";
import type CanvasBasesPlugin from "../plugin";
import {
	DEFAULT_SETTINGS,
	normalizeDimension,
	normalizeEdgeMode,
	normalizeLayout,
	normalizeTaskNotesMode,
	normalizeTaskNotesRelationshipMode,
} from "./defaults";

export class CanvasBasesSettingTab extends PluginSettingTab {
	private readonly canvasBasesPlugin: CanvasBasesPlugin;

	constructor(plugin: CanvasBasesPlugin) {
		super(plugin.app, plugin);
		this.canvasBasesPlugin = plugin;
	}

	display(): void {
		this.renderSettings();
	}

	private renderSettings(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("canvas-bases-settings");

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.language.heading"))
			.setDesc(this.canvasBasesPlugin.t("settings.language.description"))
			.setHeading();

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.language.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.language.dropdownDescription"))
			.addDropdown((dropdown) => {
				dropdown.addOption("system", this.canvasBasesPlugin.t("common.systemDefault"));
				for (const locale of this.canvasBasesPlugin.i18n.getAvailableLocales()) {
					dropdown.addOption(locale, this.canvasBasesPlugin.i18n.getNativeLanguageName(locale));
				}
				dropdown.setValue(this.canvasBasesPlugin.settings.locale).onChange((value) => {
					void this.canvasBasesPlugin.updateSettings({ locale: value }).then(() => {
						new Notice(this.canvasBasesPlugin.t("notices.languageChanged", {
							language:
								value === "system"
									? this.canvasBasesPlugin.t("common.systemDefault")
									: this.canvasBasesPlugin.i18n.getNativeLanguageName(value),
						}));
						this.renderSettings();
					});
				});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.defaults.heading"))
			.setHeading();

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.defaults.canvasFolder.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.defaults.canvasFolder.description"))
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.defaultCanvasFolder)
					.setValue(this.canvasBasesPlugin.settings.defaultCanvasFolder)
					.onChange((value) => {
						void this.canvasBasesPlugin.updateSettings({
							defaultCanvasFolder:
								value.trim() || DEFAULT_SETTINGS.defaultCanvasFolder,
						});
					});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.defaults.layout.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.defaults.layout.description"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("columns", this.canvasBasesPlugin.t("options.layout.columns"))
					.addOption("rows", this.canvasBasesPlugin.t("options.layout.rows"))
					.addOption("grid", this.canvasBasesPlugin.t("options.layout.grid"))
					.setValue(this.canvasBasesPlugin.settings.defaultLayout)
					.onChange((value) => {
						void this.canvasBasesPlugin.updateSettings({
							defaultLayout: normalizeLayout(value),
						});
					});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.defaults.edges.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.defaults.edges.description"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", this.canvasBasesPlugin.t("common.none"))
					.addOption("wikilinks", this.canvasBasesPlugin.t("options.edgeMode.wikilinks"))
					.addOption("properties", this.canvasBasesPlugin.t("options.edgeMode.properties"))
					.addOption("all", this.canvasBasesPlugin.t("options.edgeMode.all"))
					.setValue(this.canvasBasesPlugin.settings.defaultEdgeMode)
					.onChange((value) => {
						void this.canvasBasesPlugin.updateSettings({
							defaultEdgeMode: normalizeEdgeMode(value),
						});
					});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.defaults.edgeProperties.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.defaults.edgeProperties.description"))
			.addText((text) => {
				text.setPlaceholder(this.canvasBasesPlugin.t("modal.linkProperties.placeholder"))
					.setValue(this.canvasBasesPlugin.settings.defaultEdgeProperties)
					.onChange((value) => {
						void this.canvasBasesPlugin.updateSettings({
							defaultEdgeProperties: value.trim(),
						});
					});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.defaults.bodyEditor.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.defaults.bodyEditor.description"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.canvasBasesPlugin.settings.defaultShowBodyEditor)
					.onChange((value) => {
						void this.canvasBasesPlugin.updateSettings({
							defaultShowBodyEditor: value,
						});
					});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.tasknotes.heading"))
			.setHeading();

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.tasknotes.integration.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.tasknotes.integration.description"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("auto", this.canvasBasesPlugin.t("common.automatic"))
					.addOption("off", this.canvasBasesPlugin.t("common.off"))
					.setValue(this.canvasBasesPlugin.settings.defaultTaskNotesMode)
					.onChange((value) => {
						void this.canvasBasesPlugin.updateSettings({
							defaultTaskNotesMode: normalizeTaskNotesMode(value),
						});
					});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.tasknotes.badges.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.tasknotes.badges.description"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.canvasBasesPlugin.settings.defaultTaskNotesShowBadges)
					.onChange((value) => {
						void this.canvasBasesPlugin.updateSettings({
							defaultTaskNotesShowBadges: value,
						});
					});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.tasknotes.actions.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.tasknotes.actions.description"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.canvasBasesPlugin.settings.defaultTaskNotesShowActions)
					.onChange((value) => {
						void this.canvasBasesPlugin.updateSettings({
							defaultTaskNotesShowActions: value,
						});
					});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.tasknotes.relationships.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.tasknotes.relationships.description"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", this.canvasBasesPlugin.t("common.none"))
					.addOption("dependencies", this.canvasBasesPlugin.t("options.relationships.dependencies"))
					.addOption("all", this.canvasBasesPlugin.t("options.relationships.all"))
					.setValue(this.canvasBasesPlugin.settings.defaultTaskNotesRelationships)
					.onChange((value) => {
						void this.canvasBasesPlugin.updateSettings({
							defaultTaskNotesRelationships: normalizeTaskNotesRelationshipMode(value),
						});
					});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.updateRules.heading"))
			.setHeading();

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.updateRules.preservePositions.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.updateRules.preservePositions.description"))
			.addToggle((toggle) => {
				toggle.setValue(this.canvasBasesPlugin.settings.preservePositions).onChange((value) => {
					void this.canvasBasesPlugin.updateSettings({ preservePositions: value });
				});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.updateRules.removeMissingNotes.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.updateRules.removeMissingNotes.description"))
			.addToggle((toggle) => {
				toggle.setValue(this.canvasBasesPlugin.settings.removeMissingNodes).onChange((value) => {
					void this.canvasBasesPlugin.updateSettings({ removeMissingNodes: value });
				});
			});

		new Setting(containerEl)
			.setName(this.canvasBasesPlugin.t("settings.updateRules.nodeWidth.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.updateRules.nodeWidth.description"))
			.addText((text) => {
				text.setPlaceholder(String(DEFAULT_SETTINGS.nodeWidth))
					.setValue(String(this.canvasBasesPlugin.settings.nodeWidth))
					.onChange((value) => {
						void this.canvasBasesPlugin.updateSettings({
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
			.setName(this.canvasBasesPlugin.t("settings.updateRules.nodeHeight.name"))
			.setDesc(this.canvasBasesPlugin.t("settings.updateRules.nodeHeight.description"))
			.addText((text) => {
				text.setPlaceholder(String(DEFAULT_SETTINGS.nodeHeight))
					.setValue(String(this.canvasBasesPlugin.settings.nodeHeight))
					.onChange((value) => {
						void this.canvasBasesPlugin.updateSettings({
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
