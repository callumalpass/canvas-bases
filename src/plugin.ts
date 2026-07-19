import { Notice, Plugin, requireApiVersion } from "obsidian";
import type { BasesAllOptions, BasesViewRegistration } from "obsidian";
import { CANVAS_BASES_VIEW_TYPE } from "./constants";
import type {
	CanvasBasesGenerationSummary,
	CanvasBasesRelationship,
	CanvasBasesSettings,
	CanvasBasesViewSnapshot,
	MaterializeOptions,
} from "./types";
import { MaterializeCanvasModal } from "./ui/MaterializeCanvasModal";
import {
	DEFAULT_SETTINGS,
	buildDefaultMaterializeOptions,
	normalizeMaterializeOptions,
	normalizeSettings,
} from "./settings/defaults";
import { CanvasBasesSettingTab } from "./settings/settingsTab";
import {
	CanvasBasesView,
	buildCanvasBasesViewOptions,
} from "./bases/CanvasBasesView";
import {
	type ActiveBasesViewSource,
	getActiveBasesViewSource,
} from "./bases/activeBasesView";
import { materializeCanvas, openCanvas } from "./canvas/materializeCanvas";
import { collectRelationships } from "./canvas/relationships";
import { TaskNotesRuntime } from "./tasknotes/runtime";
import { createStarterFiles, ensureStarterFiles } from "./bootstrap/starterFiles";
import {
	createI18nService,
	type InterpolationValues,
	type TranslateFn,
} from "./i18n";
import type { I18nService } from "./i18n/I18nService";

type InternalPluginManager = {
	getEnabledPluginById?: (id: string) => {
		registrations?: Record<string, BasesViewRegistration>;
	};
};

type AppWithInternalPlugins = {
	internalPlugins?: InternalPluginManager;
};

interface CanvasBasesMaterializeSource {
	sourceLabel: string;
	getSnapshot(): CanvasBasesViewSnapshot | null;
	getMaterializeOptions(): MaterializeOptions;
	setMaterializeOptions(options: MaterializeOptions): Promise<void> | void;
	getCanvasPath(): string | null;
}

type TranslatePluralFn = (key: string, count: number, params?: InterpolationValues) => string;

export default class CanvasBasesPlugin extends Plugin {
	settings: CanvasBasesSettings = DEFAULT_SETTINGS;
	taskNotes!: TaskNotesRuntime;
	i18n!: I18nService;
	private views = new Set<CanvasBasesView>();
	private activeView: CanvasBasesView | null = null;
	private shouldCreateStarterFiles = false;
	private readonly translate: TranslateFn = (key, params) => this.t(key, params);
	private readonly translatePlural: TranslatePluralFn = (key, count, params) =>
		this.tp(key, count, params);

	async onload(): Promise<void> {
		await this.loadSettings();
		this.i18n = createI18nService({ initialLocale: this.settings.locale });
		this.taskNotes = new TaskNotesRuntime(this.app, this.translate, this.manifest.version);
		this.taskNotes.registerRuntimeProvider();
		this.registerInterval(window.setInterval(() => this.taskNotes.registerRuntimeProvider(), 5000));
		this.addSettingTab(new CanvasBasesSettingTab(this));
		this.registerCanvasBasesBasesView();
		this.registerCommands();
		await this.ensureStarterFiles();
	}

	onunload(): void {
		void this.taskNotes.dispose();
		this.unregisterCanvasBasesBasesView();
		this.views.clear();
		this.activeView = null;
	}

	async updateSettings(settings: Partial<CanvasBasesSettings>): Promise<void> {
		this.settings = normalizeSettings({
			...this.settings,
			...settings,
		});
		this.i18n.setLocale(this.settings.locale);
		await this.saveData(this.settings);
	}

	t(key: string, params?: InterpolationValues): string {
		return this.i18n.translate(key, params);
	}

	tp(key: string, count: number, params?: InterpolationValues): string {
		return this.i18n.translatePlural(key, count, params);
	}

	registerViewInstance(view: CanvasBasesView): void {
		this.views.add(view);
		this.setActiveView(view);
	}

	unregisterViewInstance(view: CanvasBasesView): void {
		this.views.delete(view);
		if (this.activeView === view) {
			this.activeView = getFirstCanvasBasesView(this.views);
		}
	}

	setActiveView(view: CanvasBasesView): void {
		this.activeView = view;
	}

	async configureAndMaterialize(view?: CanvasBasesView): Promise<void> {
		const source = this.getMaterializeSource(view);
		if (!source) {
			new Notice(this.t("notices.openBasesViewFirst"));
			return;
		}

		const snapshot = source.getSnapshot();
		if (!snapshot) {
			new Notice(this.t("notices.canvasBasesWaitingForBasesData"));
			return;
		}

		new MaterializeCanvasModal(
			this.app,
			snapshot,
			source.getMaterializeOptions(),
			this.translate,
			this.translatePlural,
			async (options) => {
				await source.setMaterializeOptions(options);
				const summary = await this.materialize(source, options);
				this.showMaterializedNotice(summary);
			}
		).open();
	}

	async materializeWithSavedOptions(view?: CanvasBasesView): Promise<void> {
		const source = this.getMaterializeSource(view);
		if (!source) {
			new Notice(this.t("notices.openBasesViewFirst"));
			return;
		}

		const snapshot = source.getSnapshot();
		if (!snapshot) {
			new Notice(this.t("notices.canvasBasesWaitingForBasesData"));
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

	async openLinkedCanvas(view?: CanvasBasesView): Promise<void> {
		const source = this.getMaterializeSource(view);
		if (!source) {
			new Notice(this.t("notices.openBasesViewFirst"));
			return;
		}

		const canvasPath = source.getCanvasPath();
		if (!canvasPath) {
			new Notice(this.t("notices.noLinkedCanvas", { source: source.sourceLabel }));
			return;
		}

		await openCanvas(this.app, canvasPath);
	}

	private async loadSettings(): Promise<void> {
		const storedSettings = (await this.loadData()) as Partial<CanvasBasesSettings> | null | undefined;
		this.shouldCreateStarterFiles = storedSettings == null;
		this.settings = normalizeSettings(storedSettings);
	}

	private registerCanvasBasesBasesView(): void {
		if (!requireApiVersion("1.10.1")) {
			new Notice(this.t("notices.obsidianVersionRequired"));
			return;
		}

		const registration: BasesViewRegistration = {
			name: this.t("common.appName"),
			icon: "layout-dashboard",
			factory: (controller, containerEl) => {
				return new CanvasBasesView(controller, containerEl, this);
			},
			options: (): BasesAllOptions[] => buildCanvasBasesViewOptions(this.translate),
		};

		this.registerBasesView(CANVAS_BASES_VIEW_TYPE, registration);
	}

	private unregisterCanvasBasesBasesView(): void {
		const internalPlugins = (this.app as unknown as AppWithInternalPlugins).internalPlugins;
		const basesPlugin = internalPlugins?.getEnabledPluginById?.("bases");
		if (basesPlugin?.registrations?.[CANVAS_BASES_VIEW_TYPE]) {
			delete basesPlugin.registrations[CANVAS_BASES_VIEW_TYPE];
		}
	}

	private registerCommands(): void {
		this.addCommand({
			id: "create-canvas-from-current-view",
			name: this.t("commands.createCanvasFromCurrentView"),
			callback: () => {
				void this.configureAndMaterialize();
			},
		});

		this.addCommand({
			id: "update-linked-canvas",
			name: this.t("commands.updateLinkedCanvas"),
			callback: () => {
				void this.materializeWithSavedOptions();
			},
		});

		this.addCommand({
			id: "open-linked-canvas",
			name: this.t("commands.openLinkedCanvas"),
			callback: () => {
				void this.openLinkedCanvas();
			},
		});

		this.addCommand({
			id: "create-starter-files",
			name: this.t("commands.createStarterFiles"),
			callback: () => {
				void this.createStarterFilesFromCommand();
			},
		});
	}

	private async ensureStarterFiles(): Promise<void> {
		await ensureStarterFiles({
			app: this.app,
			settings: this.settings,
			shouldCreateStarterFiles: this.shouldCreateStarterFiles,
			saveSettings: () => this.saveData(this.settings),
		});
	}

	private async createStarterFilesFromCommand(): Promise<void> {
		const result = await createStarterFiles(this.app, {
			openStartHere: true,
		});
		if (result === "blocked") {
			new Notice(this.t("notices.starterFilesBlocked"));
			return;
		}

		await this.updateSettings({ starterFilesCreated: true });
		new Notice(this.t("notices.starterFilesReady"));
	}

	private getActiveView(): CanvasBasesView | null {
		if (this.activeView && this.views.has(this.activeView)) {
			return this.activeView;
		}

		return getFirstCanvasBasesView(this.views);
	}

	private getMaterializeSource(view?: CanvasBasesView): CanvasBasesMaterializeSource | null {
		if (view) {
			return this.createCanvasBasesViewSource(view);
		}

		const activeCanvasBasesView = this.getActiveCanvasBasesViewFromWorkspace();
		if (activeCanvasBasesView) {
			return this.createCanvasBasesViewSource(activeCanvasBasesView);
		}

		const activeBasesView = getActiveBasesViewSource(this.app);
		if (activeBasesView) {
			return this.createGenericBasesViewSource(activeBasesView);
		}

		const fallbackView = this.getActiveView();
		return fallbackView ? this.createCanvasBasesViewSource(fallbackView) : null;
	}

	private createCanvasBasesViewSource(view: CanvasBasesView): CanvasBasesMaterializeSource {
		return {
			sourceLabel: view.getSnapshot()?.viewName ?? "Canvas Bases",
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
	): CanvasBasesMaterializeSource {
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

	private getActiveCanvasBasesViewFromWorkspace(): CanvasBasesView | null {
		const workspaceView = this.app.workspace.getMostRecentLeaf()?.view as
			| { controller?: { view?: unknown } }
			| undefined;
		const activeBasesView = workspaceView?.controller?.view;

		return activeBasesView instanceof CanvasBasesView ? activeBasesView : null;
	}

	private async materialize(
		source: CanvasBasesMaterializeSource,
		options = source.getMaterializeOptions()
	): Promise<CanvasBasesGenerationSummary> {
		const snapshot = source.getSnapshot();
		if (!snapshot) {
			throw new Error("Canvas Bases is waiting for Bases data.");
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
		snapshot: CanvasBasesViewSnapshot,
		options: MaterializeOptions
	): Promise<CanvasBasesRelationship[]> {
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

	private showMaterializedNotice(summary: CanvasBasesGenerationSummary): void {
		new Notice(
			this.t("notices.updatedCanvas", {
				path: summary.canvasPath,
				nodes: summary.nodeCount,
				edges: summary.edgeCount,
			})
		);
	}
}

function getFirstCanvasBasesView(views: Set<CanvasBasesView>): CanvasBasesView | null {
	for (const view of views) {
		return view;
	}

	return null;
}
