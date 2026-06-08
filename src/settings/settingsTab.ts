import { Notice, PluginSettingTab, Setting } from "obsidian";
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
		this.renderSettings();
	}

	private renderSettings(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("baseboard-settings");

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.language.heading"))
			.setDesc(this.baseboardPlugin.t("settings.language.description"))
			.setHeading();

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.language.name"))
			.setDesc(this.baseboardPlugin.t("settings.language.dropdownDescription"))
			.addDropdown((dropdown) => {
				dropdown.addOption("system", this.baseboardPlugin.t("common.systemDefault"));
				for (const locale of this.baseboardPlugin.i18n.getAvailableLocales()) {
					dropdown.addOption(locale, this.baseboardPlugin.i18n.getNativeLanguageName(locale));
				}
				dropdown.setValue(this.baseboardPlugin.settings.locale).onChange((value) => {
					void this.baseboardPlugin.updateSettings({ locale: value }).then(() => {
						new Notice(this.baseboardPlugin.t("notices.languageChanged", {
							language:
								value === "system"
									? this.baseboardPlugin.t("common.systemDefault")
									: this.baseboardPlugin.i18n.getNativeLanguageName(value),
						}));
						this.renderSettings();
					});
				});
			});

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.defaults.heading"))
			.setHeading();

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.defaults.canvasFolder.name"))
			.setDesc(this.baseboardPlugin.t("settings.defaults.canvasFolder.description"))
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
			.setName(this.baseboardPlugin.t("settings.defaults.layout.name"))
			.setDesc(this.baseboardPlugin.t("settings.defaults.layout.description"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("columns", this.baseboardPlugin.t("options.layout.columns"))
					.addOption("rows", this.baseboardPlugin.t("options.layout.rows"))
					.addOption("grid", this.baseboardPlugin.t("options.layout.grid"))
					.setValue(this.baseboardPlugin.settings.defaultLayout)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultLayout: normalizeLayout(value),
						});
					});
			});

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.defaults.edges.name"))
			.setDesc(this.baseboardPlugin.t("settings.defaults.edges.description"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", this.baseboardPlugin.t("common.none"))
					.addOption("wikilinks", this.baseboardPlugin.t("options.edgeMode.wikilinks"))
					.addOption("properties", this.baseboardPlugin.t("options.edgeMode.properties"))
					.addOption("all", this.baseboardPlugin.t("options.edgeMode.all"))
					.setValue(this.baseboardPlugin.settings.defaultEdgeMode)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultEdgeMode: normalizeEdgeMode(value),
						});
					});
			});

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.defaults.edgeProperties.name"))
			.setDesc(this.baseboardPlugin.t("settings.defaults.edgeProperties.description"))
			.addText((text) => {
				text.setPlaceholder(this.baseboardPlugin.t("modal.linkProperties.placeholder"))
					.setValue(this.baseboardPlugin.settings.defaultEdgeProperties)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultEdgeProperties: value.trim(),
						});
					});
			});

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.defaults.bodyEditor.name"))
			.setDesc(this.baseboardPlugin.t("settings.defaults.bodyEditor.description"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.baseboardPlugin.settings.defaultShowBodyEditor)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultShowBodyEditor: value,
						});
					});
			});

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.tasknotes.heading"))
			.setHeading();

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.tasknotes.integration.name"))
			.setDesc(this.baseboardPlugin.t("settings.tasknotes.integration.description"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("auto", this.baseboardPlugin.t("common.automatic"))
					.addOption("off", this.baseboardPlugin.t("common.off"))
					.setValue(this.baseboardPlugin.settings.defaultTaskNotesMode)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultTaskNotesMode: normalizeTaskNotesMode(value),
						});
					});
			});

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.tasknotes.badges.name"))
			.setDesc(this.baseboardPlugin.t("settings.tasknotes.badges.description"))
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
			.setName(this.baseboardPlugin.t("settings.tasknotes.actions.name"))
			.setDesc(this.baseboardPlugin.t("settings.tasknotes.actions.description"))
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
			.setName(this.baseboardPlugin.t("settings.tasknotes.relationships.name"))
			.setDesc(this.baseboardPlugin.t("settings.tasknotes.relationships.description"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", this.baseboardPlugin.t("common.none"))
					.addOption("dependencies", this.baseboardPlugin.t("options.relationships.dependencies"))
					.addOption("all", this.baseboardPlugin.t("options.relationships.all"))
					.setValue(this.baseboardPlugin.settings.defaultTaskNotesRelationships)
					.onChange((value) => {
						void this.baseboardPlugin.updateSettings({
							defaultTaskNotesRelationships: normalizeTaskNotesRelationshipMode(value),
						});
					});
			});

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.updateRules.heading"))
			.setHeading();

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.updateRules.preservePositions.name"))
			.setDesc(this.baseboardPlugin.t("settings.updateRules.preservePositions.description"))
			.addToggle((toggle) => {
				toggle.setValue(this.baseboardPlugin.settings.preservePositions).onChange((value) => {
					void this.baseboardPlugin.updateSettings({ preservePositions: value });
				});
			});

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.updateRules.removeMissingNotes.name"))
			.setDesc(this.baseboardPlugin.t("settings.updateRules.removeMissingNotes.description"))
			.addToggle((toggle) => {
				toggle.setValue(this.baseboardPlugin.settings.removeMissingNodes).onChange((value) => {
					void this.baseboardPlugin.updateSettings({ removeMissingNodes: value });
				});
			});

		new Setting(containerEl)
			.setName(this.baseboardPlugin.t("settings.updateRules.nodeWidth.name"))
			.setDesc(this.baseboardPlugin.t("settings.updateRules.nodeWidth.description"))
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
			.setName(this.baseboardPlugin.t("settings.updateRules.nodeHeight.name"))
			.setDesc(this.baseboardPlugin.t("settings.updateRules.nodeHeight.description"))
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
