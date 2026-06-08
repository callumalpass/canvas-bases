import { Modal, Setting, Notice } from "obsidian";
import type { App } from "obsidian";
import type {
	BaseboardViewSnapshot,
	MaterializeOptions,
} from "../types";
import {
	normalizeCanvasPath,
	normalizeDimension,
	normalizeEdgeMode,
	normalizeLayout,
	normalizeTaskNotesRelationshipMode,
	splitPropertyList,
} from "../settings/defaults";
import type { InterpolationValues, TranslateFn } from "../i18n";

type SubmitHandler = (options: MaterializeOptions) => Promise<void>;
type TranslatePluralFn = (key: string, count: number, params?: InterpolationValues) => string;

export class MaterializeCanvasModal extends Modal {
	private options: MaterializeOptions;
	private readonly snapshot: BaseboardViewSnapshot;
	private readonly t: TranslateFn;
	private readonly tp: TranslatePluralFn;
	private readonly onSubmit: SubmitHandler;
	private submitButtonEl: HTMLButtonElement | null = null;

	constructor(
		app: App,
		snapshot: BaseboardViewSnapshot,
		options: MaterializeOptions,
		t: TranslateFn,
		tp: TranslatePluralFn,
		onSubmit: SubmitHandler
	) {
		super(app);
		this.snapshot = snapshot;
		this.options = { ...options };
		this.t = t;
		this.tp = tp;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("baseboard-modal");

		contentEl.createEl("h2", { text: this.t("modal.title") });
		this.renderSummary(contentEl);
		this.renderDestination(contentEl);
		this.renderLayout(contentEl);
		this.renderEdges(contentEl);
		this.renderUpdateRules(contentEl);
		this.renderActions(contentEl);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderSummary(containerEl: HTMLElement): void {
		const summaryEl = containerEl.createDiv({ cls: "baseboard-modal__summary" });
		summaryEl.createDiv({
			cls: "baseboard-modal__summary-title",
			text: this.snapshot.viewName,
		});
		summaryEl.createDiv({
			cls: "baseboard-modal__summary-meta",
			text: [
				this.tp("common.note", this.snapshot.totalEntries),
				this.tp("common.group", this.snapshot.groups.length),
				this.snapshot.textCards.length > 0
					? this.tp("common.card", this.snapshot.textCards.length)
					: null,
			]
				.filter((part): part is string => part !== null)
				.join(", "),
		});
	}

	private renderDestination(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(this.t("modal.canvasPath.name"))
			.setDesc(this.t("modal.canvasPath.description"))
			.addText((text) => {
				text.setValue(this.options.canvasPath).onChange((value) => {
					this.options = {
						...this.options,
						canvasPath: value,
					};
				});
			});
	}

	private renderLayout(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(this.t("modal.layout.name"))
			.setDesc(this.t("modal.layout.description"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("columns", this.t("options.layout.columns"))
					.addOption("rows", this.t("options.layout.rows"))
					.addOption("grid", this.t("options.layout.grid"))
					.setValue(this.options.layout)
					.onChange((value) => {
						this.options = {
							...this.options,
							layout: normalizeLayout(value),
						};
					});
			});

		new Setting(containerEl)
			.setName(this.t("modal.nodeSize.name"))
			.setDesc(this.t("modal.nodeSize.description"))
			.addText((text) => {
				text.setPlaceholder(this.t("modal.nodeSize.width"))
					.setValue(String(this.options.nodeWidth))
					.onChange((value) => {
						this.options = {
							...this.options,
							nodeWidth: normalizeDimension(value, this.options.nodeWidth, 160, 520),
						};
					});
			})
			.addText((text) => {
				text.setPlaceholder(this.t("modal.nodeSize.height"))
					.setValue(String(this.options.nodeHeight))
					.onChange((value) => {
						this.options = {
							...this.options,
							nodeHeight: normalizeDimension(value, this.options.nodeHeight, 80, 320),
						};
					});
			});
	}

	private renderEdges(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(this.t("modal.edges.name"))
			.setDesc(this.t("modal.edges.description"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", this.t("common.none"))
					.addOption("wikilinks", this.t("options.edgeMode.wikilinks"))
					.addOption("properties", this.t("options.edgeMode.properties"))
					.addOption("all", this.t("options.edgeMode.all"))
					.setValue(this.options.edgeMode)
					.onChange((value) => {
						this.options = {
							...this.options,
							edgeMode: normalizeEdgeMode(value),
						};
					});
			});

		new Setting(containerEl)
			.setName(this.t("modal.linkProperties.name"))
			.setDesc(this.t("modal.linkProperties.description"))
			.addText((text) => {
				text.setPlaceholder(this.t("modal.linkProperties.placeholder"))
					.setValue(this.options.edgeProperties.join(", "))
					.onChange((value) => {
						this.options = {
							...this.options,
							edgeProperties: splitPropertyList(value),
						};
					});
			});

		new Setting(containerEl)
			.setName(this.t("modal.taskRelationships.name"))
			.setDesc(this.t("modal.taskRelationships.description"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", this.t("common.none"))
					.addOption("dependencies", this.t("options.relationships.dependencies"))
					.addOption("all", this.t("options.relationships.all"))
					.setValue(this.options.taskNotesRelationships)
					.onChange((value) => {
						this.options = {
							...this.options,
							taskNotesRelationships: normalizeTaskNotesRelationshipMode(value),
						};
					});
			});
	}

	private renderUpdateRules(containerEl: HTMLElement): void {
		new Setting(containerEl).setName(this.t("settings.updateRules.heading")).setHeading();

		new Setting(containerEl)
			.setName(this.t("settings.updateRules.preservePositions.name"))
			.setDesc(this.t("modal.preservePositions.description"))
			.addToggle((toggle) => {
				toggle.setValue(this.options.preservePositions).onChange((value) => {
					this.options = {
						...this.options,
						preservePositions: value,
					};
				});
			});

		new Setting(containerEl)
			.setName(this.t("settings.updateRules.removeMissingNotes.name"))
			.setDesc(this.t("settings.updateRules.removeMissingNotes.description"))
			.addToggle((toggle) => {
				toggle.setValue(this.options.removeMissingNodes).onChange((value) => {
					this.options = {
						...this.options,
						removeMissingNodes: value,
					};
				});
			});
	}

	private renderActions(containerEl: HTMLElement): void {
		const actionsEl = containerEl.createDiv({ cls: "baseboard-modal__actions" });
		const cancelButton = actionsEl.createEl("button", { text: this.t("common.cancel") });
		cancelButton.onClickEvent(() => this.close());

		this.submitButtonEl = actionsEl.createEl("button", {
			cls: "mod-cta",
			text: this.t("modal.createCanvas"),
		});
		this.submitButtonEl.onClickEvent(() => {
			void this.handleSubmit();
		});
	}

	private async handleSubmit(): Promise<void> {
		const canvasPath = normalizeCanvasPath(this.options.canvasPath);
		if (!canvasPath || canvasPath === ".canvas") {
			new Notice(this.t("notices.chooseCanvasPath"));
			return;
		}

		this.submitButtonEl?.setAttr("disabled", "true");
		this.options = {
			...this.options,
			canvasPath,
			layout: normalizeLayout(this.options.layout),
			edgeMode: normalizeEdgeMode(this.options.edgeMode),
			taskNotesRelationships: normalizeTaskNotesRelationshipMode(
				this.options.taskNotesRelationships
			),
		};

		try {
			await this.onSubmit(this.options);
			this.close();
		} finally {
			this.submitButtonEl?.removeAttribute("disabled");
		}
	}
}
