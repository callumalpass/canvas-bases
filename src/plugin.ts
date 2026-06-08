import { Notice, Plugin, requireApiVersion } from "obsidian";
import type { BasesAllOptions, BasesViewRegistration } from "obsidian";
import { BASEBOARD_VIEW_TYPE } from "./constants";
import type {
	BaseboardGenerationSummary,
	BaseboardRelationship,
	BaseboardSettings,
	BaseboardViewSnapshot,
	MaterializeOptions,
} from "./types";
import { MaterializeCanvasModal } from "./ui/MaterializeCanvasModal";
import {
	DEFAULT_SETTINGS,
	buildDefaultMaterializeOptions,
	normalizeMaterializeOptions,
	normalizeSettings,
} from "./settings/defaults";
import { BaseboardSettingTab } from "./settings/settingsTab";
import {
	BaseboardView,
	buildBaseboardViewOptions,
} from "./bases/BaseboardView";
import {
	type ActiveBasesViewSource,
	getActiveBasesViewSource,
} from "./bases/activeBasesView";
import { materializeCanvas, openCanvas } from "./canvas/materializeCanvas";
import { collectRelationships } from "./canvas/relationships";
import { TaskNotesRuntime } from "./tasknotes/runtime";

type InternalPluginManager = {
	getEnabledPluginById?: (id: string) => {
		registrations?: Record<string, BasesViewRegistration>;
	};
};

type AppWithInternalPlugins = {
	internalPlugins?: InternalPluginManager;
};

interface BaseboardMaterializeSource {
	sourceLabel: string;
	getSnapshot(): BaseboardViewSnapshot | null;
	getMaterializeOptions(): MaterializeOptions;
	setMaterializeOptions(options: MaterializeOptions): Promise<void> | void;
	getCanvasPath(): string | null;
}

export default class BaseboardPlugin extends Plugin {
	settings: BaseboardSettings = DEFAULT_SETTINGS;
	taskNotes!: TaskNotesRuntime;
	private views = new Set<BaseboardView>();
	private activeView: BaseboardView | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.taskNotes = new TaskNotesRuntime(this.app);
		this.addSettingTab(new BaseboardSettingTab(this));
		this.registerBaseboardBasesView();
		this.registerCommands();
	}

	onunload(): void {
		this.unregisterBaseboardBasesView();
		this.views.clear();
		this.activeView = null;
	}

	async updateSettings(settings: Partial<BaseboardSettings>): Promise<void> {
		this.settings = normalizeSettings({
			...this.settings,
			...settings,
		});
		await this.saveData(this.settings);
	}

	registerViewInstance(view: BaseboardView): void {
		this.views.add(view);
		this.setActiveView(view);
	}

	unregisterViewInstance(view: BaseboardView): void {
		this.views.delete(view);
		if (this.activeView === view) {
			this.activeView = this.views.values().next().value ?? null;
		}
	}

	setActiveView(view: BaseboardView): void {
		this.activeView = view;
	}

	async configureAndMaterialize(view?: BaseboardView): Promise<void> {
		const source = this.getMaterializeSource(view);
		if (!source) {
			new Notice("Open a bases view first.");
			return;
		}

		const snapshot = source.getSnapshot();
		if (!snapshot) {
			new Notice("Baseboard is waiting for bases data.");
			return;
		}

		new MaterializeCanvasModal(
			this.app,
			snapshot,
			source.getMaterializeOptions(),
			async (options) => {
				await source.setMaterializeOptions(options);
				const summary = await this.materialize(source, options);
				this.showMaterializedNotice(summary);
			}
		).open();
	}

	async materializeWithSavedOptions(view?: BaseboardView): Promise<void> {
		const source = this.getMaterializeSource(view);
		if (!source) {
			new Notice("Open a bases view first.");
			return;
		}

		const snapshot = source.getSnapshot();
		if (!snapshot) {
			new Notice("Baseboard is waiting for bases data.");
			return;
		}

		const canvasPath = source.getCanvasPath();
		if (!canvasPath) {
			await this.configureAndMaterialize(view);
			return;
		}

		const summary = await this.materialize(source, source.getMaterializeOptions());
		this.showMaterializedNotice(summary);
	}

	async openLinkedCanvas(view?: BaseboardView): Promise<void> {
		const source = this.getMaterializeSource(view);
		if (!source) {
			new Notice("Open a bases view first.");
			return;
		}

		const canvasPath = source.getCanvasPath();
		if (!canvasPath) {
			new Notice(`${source.sourceLabel} has no linked canvas yet.`);
			return;
		}

		await openCanvas(this.app, canvasPath);
	}

	private async loadSettings(): Promise<void> {
		this.settings = normalizeSettings((await this.loadData()) as Partial<BaseboardSettings>);
	}

	private registerBaseboardBasesView(): void {
		if (!requireApiVersion("1.10.1")) {
			new Notice("Baseboard requires Obsidian 1.10.1 or newer.");
			return;
		}

		const registration: BasesViewRegistration = {
			name: "Baseboard",
			icon: "layout-dashboard",
			factory: (controller, containerEl) => {
				return new BaseboardView(controller, containerEl, this);
			},
			options: (): BasesAllOptions[] => buildBaseboardViewOptions(),
		};

		this.registerBasesView(BASEBOARD_VIEW_TYPE, registration);
	}

	private unregisterBaseboardBasesView(): void {
		const internalPlugins = (this.app as unknown as AppWithInternalPlugins).internalPlugins;
		const basesPlugin = internalPlugins?.getEnabledPluginById?.("bases");
		if (basesPlugin?.registrations?.[BASEBOARD_VIEW_TYPE]) {
			delete basesPlugin.registrations[BASEBOARD_VIEW_TYPE];
		}
	}

	private registerCommands(): void {
		this.addCommand({
			id: "create-canvas-from-current-view",
			name: "Create canvas from current bases view",
			callback: () => {
				void this.configureAndMaterialize();
			},
		});

		this.addCommand({
			id: "update-linked-canvas",
			name: "Update linked canvas",
			callback: () => {
				void this.materializeWithSavedOptions();
			},
		});

		this.addCommand({
			id: "open-linked-canvas",
			name: "Open linked canvas",
			callback: () => {
				void this.openLinkedCanvas();
			},
		});
	}

	private getActiveView(): BaseboardView | null {
		if (this.activeView && this.views.has(this.activeView)) {
			return this.activeView;
		}

		return this.views.values().next().value ?? null;
	}

	private getMaterializeSource(view?: BaseboardView): BaseboardMaterializeSource | null {
		if (view) {
			return this.createBaseboardViewSource(view);
		}

		const activeBaseboardView = this.getActiveBaseboardViewFromWorkspace();
		if (activeBaseboardView) {
			return this.createBaseboardViewSource(activeBaseboardView);
		}

		const activeBasesView = getActiveBasesViewSource(this.app);
		if (activeBasesView) {
			return this.createGenericBasesViewSource(activeBasesView);
		}

		const fallbackView = this.getActiveView();
		return fallbackView ? this.createBaseboardViewSource(fallbackView) : null;
	}

	private createBaseboardViewSource(view: BaseboardView): BaseboardMaterializeSource {
		return {
			sourceLabel: view.getSnapshot()?.viewName ?? "Baseboard",
			getSnapshot: () => view.getMaterializationSnapshot(),
			getMaterializeOptions: () => view.getMaterializeOptions(),
			setMaterializeOptions: (options) => {
				view.setMaterializeOptions(options);
			},
			getCanvasPath: () => view.getCanvasPath(),
		};
	}

	private createGenericBasesViewSource(
		source: ActiveBasesViewSource
	): BaseboardMaterializeSource {
		return {
			sourceLabel: source.sourceLabel,
			getSnapshot: () => source.snapshot,
			getMaterializeOptions: () => this.getGenericViewOptions(source),
			setMaterializeOptions: (options) => this.setGenericViewOptions(source, options),
			getCanvasPath: () => this.getGenericCanvasPath(source),
		};
	}

	private getGenericViewOptions(source: ActiveBasesViewSource): MaterializeOptions {
		const defaults = buildDefaultMaterializeOptions(
			this.settings,
			source.defaultCanvasName
		);
		return normalizeMaterializeOptions(
			this.settings.linkedViews[source.sourceKey],
			defaults
		);
	}

	private getGenericCanvasPath(source: ActiveBasesViewSource): string | null {
		const canvasPath = this.settings.linkedViews[source.sourceKey]?.canvasPath;
		return canvasPath?.trim() || null;
	}

	private async setGenericViewOptions(
		source: ActiveBasesViewSource,
		options: MaterializeOptions
	): Promise<void> {
		await this.updateSettings({
			linkedViews: {
				...this.settings.linkedViews,
				[source.sourceKey]: options,
			},
		});
	}

	private getActiveBaseboardViewFromWorkspace(): BaseboardView | null {
		const workspaceView = this.app.workspace.getMostRecentLeaf()?.view as
			| { controller?: { view?: unknown } }
			| undefined;
		const activeBasesView = workspaceView?.controller?.view;

		return activeBasesView instanceof BaseboardView ? activeBasesView : null;
	}

	private async materialize(
		source: BaseboardMaterializeSource,
		options = source.getMaterializeOptions()
	): Promise<BaseboardGenerationSummary> {
		const snapshot = source.getSnapshot();
		if (!snapshot) {
			throw new Error("Baseboard is waiting for Bases data.");
		}

		const relationships = await this.collectRelationships(snapshot, options);

		return materializeCanvas({
			app: this.app,
			snapshot,
			options,
			relationships,
		});
	}

	private async collectRelationships(
		snapshot: BaseboardViewSnapshot,
		options: MaterializeOptions
	): Promise<BaseboardRelationship[]> {
		const relationships = collectRelationships(this.app, snapshot, options);
		if (options.taskNotesRelationships === "none") {
			return relationships;
		}

		return [
			...relationships,
			...(await this.taskNotes.collectRelationships(
				snapshot,
				options.taskNotesRelationships
			)),
		];
	}

	private showMaterializedNotice(summary: BaseboardGenerationSummary): void {
		new Notice(
			`Updated ${summary.canvasPath}: ${summary.nodeCount} nodes, ${summary.edgeCount} edges.`
		);
	}
}
