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

type SubmitHandler = (options: MaterializeOptions) => Promise<void>;

export class MaterializeCanvasModal extends Modal {
	private options: MaterializeOptions;
	private readonly snapshot: BaseboardViewSnapshot;
	private readonly onSubmit: SubmitHandler;
	private submitButtonEl: HTMLButtonElement | null = null;

	constructor(
		app: App,
		snapshot: BaseboardViewSnapshot,
		options: MaterializeOptions,
		onSubmit: SubmitHandler
	) {
		super(app);
		this.snapshot = snapshot;
		this.options = { ...options };
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("baseboard-modal");

		contentEl.createEl("h2", { text: "Create canvas from view" });
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
				formatCount(this.snapshot.totalEntries, "note"),
				formatCount(this.snapshot.groups.length, "group"),
				this.snapshot.textCards.length > 0
					? formatCount(this.snapshot.textCards.length, "card")
					: null,
			]
				.filter((part): part is string => part !== null)
				.join(", "),
		});
	}

	private renderDestination(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Canvas path")
			.setDesc("Vault path for the generated JSON canvas file.")
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
			.setName("Layout")
			.setDesc("How base groups are arranged in the generated canvas.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("columns", "Grouped columns")
					.addOption("rows", "Grouped rows")
					.addOption("grid", "Grid")
					.setValue(this.options.layout)
					.onChange((value) => {
						this.options = {
							...this.options,
							layout: normalizeLayout(value),
						};
					});
			});

		new Setting(containerEl)
			.setName("Node size")
			.setDesc("Width and height for new canvas file nodes.")
			.addText((text) => {
				text.setPlaceholder("Width")
					.setValue(String(this.options.nodeWidth))
					.onChange((value) => {
						this.options = {
							...this.options,
							nodeWidth: normalizeDimension(value, this.options.nodeWidth, 160, 520),
						};
					});
			})
			.addText((text) => {
				text.setPlaceholder("Height")
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
			.setName("Edges")
			.setDesc("Draw edges only when both notes are in this base result.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", "None")
					.addOption("wikilinks", "Links within view")
					.addOption("properties", "Selected properties")
					.addOption("all", "Links and selected properties")
					.setValue(this.options.edgeMode)
					.onChange((value) => {
						this.options = {
							...this.options,
							edgeMode: normalizeEdgeMode(value),
						};
					});
			});

		new Setting(containerEl)
			.setName("Link properties")
			.setDesc("Comma-separated frontmatter properties used for property edges.")
			.addText((text) => {
				text.setPlaceholder("Depends_on, related")
					.setValue(this.options.edgeProperties.join(", "))
					.onChange((value) => {
						this.options = {
							...this.options,
							edgeProperties: splitPropertyList(value),
						};
					});
			});

		new Setting(containerEl)
			.setName("Task relationship edges")
			.setDesc("Add task relationship edges to the generated canvas.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", "None")
					.addOption("dependencies", "Dependencies")
					.addOption("all", "Dependencies and subtasks")
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
		new Setting(containerEl).setName("Update rules").setHeading();

		new Setting(containerEl)
			.setName("Preserve positions")
			.setDesc("Keep positions for baseboard nodes already present in the canvas.")
			.addToggle((toggle) => {
				toggle.setValue(this.options.preservePositions).onChange((value) => {
					this.options = {
						...this.options,
						preservePositions: value,
					};
				});
			});

		new Setting(containerEl)
			.setName("Remove missing notes")
			.setDesc("Remove baseboard nodes that no longer appear in the current base result.")
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
		const cancelButton = actionsEl.createEl("button", { text: "Cancel" });
		cancelButton.onClickEvent(() => this.close());

		this.submitButtonEl = actionsEl.createEl("button", {
			cls: "mod-cta",
			text: "Create canvas",
		});
		this.submitButtonEl.onClickEvent(() => {
			void this.handleSubmit();
		});
	}

	private async handleSubmit(): Promise<void> {
		const canvasPath = normalizeCanvasPath(this.options.canvasPath);
		if (!canvasPath || canvasPath === ".canvas") {
			new Notice("Choose a canvas path.");
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

function formatCount(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
