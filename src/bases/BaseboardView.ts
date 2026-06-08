import {
	BasesView,
	ButtonComponent,
	FuzzySuggestModal,
	Keymap,
	Menu,
	Notice,
	TFile,
	debounce,
	setIcon,
	setTooltip,
} from "obsidian";
import type {
	App,
	BasesAllOptions,
	BasesViewConfig,
	QueryController,
} from "obsidian";
import type BaseboardPlugin from "../plugin";
import { BASEBOARD_VIEW_TYPE, VIEW_CONFIG_KEYS } from "../constants";
import type {
	BaseboardEntryPropertySnapshot,
	BaseboardEntrySnapshot,
	BaseboardNodePosition,
	BaseboardNodePositionMap,
	BaseboardRelationship,
	BaseboardTextCardSnapshot,
	BaseboardViewSnapshot,
	MaterializeOptions,
} from "../types";
import { buildBaseboardSnapshot } from "./snapshot";
import type { BasesViewAction } from "./actions";
import {
	buildBaseboardCanvas,
	getFileNodeId,
	getRelationshipEdgeId,
	getTextCardNodeId,
	initializeTextCardPositions,
} from "../canvas/canvasBuilder";
import type {
	CanvasEdge,
	CanvasFileNode,
	CanvasGroupNode,
	CanvasNode,
	CanvasTextNode,
} from "../canvas/jsonCanvas";
import { collectRelationships } from "../canvas/relationships";
import { buildBaseboardEdgeGeometry } from "./edgeGeometry";
import {
	applyManualViewItems,
	normalizeManualNotePaths,
	normalizeTextCards,
	setManualNotePaths,
	setTextCards,
} from "./manualItems";
import {
	DEFAULT_VIRTUALIZATION_OVERSCAN,
	DEFAULT_VIRTUALIZATION_THRESHOLD,
	filterEdgesForVisibleNodes,
	selectVirtualizedCanvasNodes,
	type CanvasViewportMetrics,
} from "./virtualization";
import {
	buildDefaultMaterializeOptions,
	normalizeDimension,
	normalizeEdgeMode,
	normalizeLayout,
	normalizeTaskNotesMode,
	normalizeTaskNotesRelationshipMode,
	splitPropertyList,
} from "../settings/defaults";
import type { BaseboardTaskCard, BaseboardTaskPropertyKind } from "../tasknotes/runtime";
import type { InterpolationValues, TranslateFn } from "../i18n";
import {
	createBaseboardInlineMarkdownEditor,
	type BaseboardInlineMarkdownEditor,
} from "../editor/inlineMarkdownEditor";

const MIN_CANVAS_WIDTH = 1200;
const MIN_CANVAS_HEIGHT = 760;
const CANVAS_PADDING = 220;
const MIN_NODE_COORDINATE = 0;
const MIN_FILE_NODE_WIDTH = 160;
const MIN_FILE_NODE_HEIGHT = 80;
const MIN_GROUP_NODE_WIDTH = 220;
const MIN_GROUP_NODE_HEIGHT = 120;
const MIN_TEXT_NODE_WIDTH = 160;
const MIN_TEXT_NODE_HEIGHT = 100;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const FIT_VIEW_PADDING = 48;
const FRONT_CARD_Z_INDEX = "20";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

type CanvasRenderableNode = CanvasFileNode | CanvasGroupNode | CanvasTextNode;
type CanvasNodeKind = "file" | "group" | "text";

let nextEdgeMarkerId = 0;

interface DragState {
	pointerId: number;
	startClientX: number;
	startClientY: number;
	nodes: Array<{
		id: string;
		element: HTMLElement | null;
		startPosition: BaseboardNodePosition;
	}>;
}

interface ResizeState {
	pointerId: number;
	startClientX: number;
	startClientY: number;
	id: string;
	element: HTMLElement;
	startPosition: BaseboardNodePosition;
	minWidth: number;
	minHeight: number;
}

interface PanState {
	pointerId: number;
	startClientX: number;
	startClientY: number;
	startScrollLeft: number;
	startScrollTop: number;
	viewportEl: HTMLElement;
}

interface LinkDragState {
	pointerId: number;
	sourcePath: string;
	sourceElement: HTMLElement;
	sourcePoint: LinkPoint;
	previewEl: SVGSVGElement;
	previewPathEl: SVGPathElement;
	targetElement: HTMLElement | null;
	targetPath: string | null;
}

interface LinkPoint {
	x: number;
	y: number;
}

interface CanvasViewportState {
	scrollLeft: number;
	scrollTop: number;
}

interface RenderedBaseboardEdge {
	edge: CanvasEdge;
	groupEl: SVGGElement;
	pathEl: SVGPathElement;
	labelGroupEl: SVGGElement | null;
	labelRectEl: SVGRectElement | null;
	labelTextEl: SVGTextElement | null;
}

interface CanvasRenderState {
	allNodes: CanvasRenderableNode[];
	allEdges: CanvasEdge[];
	groupEntries: Map<string, string[]>;
	entriesByPath: Map<string, BaseboardEntrySnapshot>;
	filePathsByNodeId: Map<string, string>;
	textCardsByNodeId: Map<string, BaseboardTextCardSnapshot>;
	nodePositions: Map<string, BaseboardNodePosition>;
	planeEl: HTMLElement;
	bounds: { width: number; height: number };
	taskCards: Map<string, BaseboardTaskCard>;
	edgeRelationships: Map<string, BaseboardRelationship>;
}

interface InlineEditorState {
	path: string;
	editor: BaseboardInlineMarkdownEditor;
	statusEl: HTMLElement;
	original: string;
}

export class BaseboardView extends BasesView {
	readonly type = BASEBOARD_VIEW_TYPE;
	private readonly plugin: BaseboardPlugin;
	private readonly edgeMarkerId = `baseboard-edge-arrow-${nextEdgeMarkerId++}`;
	private readonly containerEl: HTMLElement;
	private rootEl: HTMLElement | null = null;
	private dragState: DragState | null = null;
	private resizeState: ResizeState | null = null;
	private panState: PanState | null = null;
	private linkDragState: LinkDragState | null = null;
	private canvasViewportEl: HTMLElement | null = null;
	private canvasWorldEl: HTMLElement | null = null;
	private canvasPlaneEl: HTMLElement | null = null;
	private zoomLabelEl: HTMLElement | null = null;
	private edgeLayerEl: SVGSVGElement | null = null;
	private canvasNodeElements = new Map<string, HTMLElement>();
	private inlineEditors = new Map<string, InlineEditorState>();
	private renderedEdges: RenderedBaseboardEdge[] = [];
	private frontCardEl: HTMLElement | null = null;
	private canvasBounds: { width: number; height: number } | null = null;
	private canvasRenderState: CanvasRenderState | null = null;
	private taskEdgeCache: {
		key: string;
		edges: CanvasEdge[];
		relationships: BaseboardRelationship[];
	} | null = null;
	private zoom = 1;
	private renderFrame: number | null = null;
	private virtualRenderFrame: number | null = null;
	private dragMoveHandler: ((event: PointerEvent) => void) | null = null;
	private dragEndHandler: ((event: PointerEvent) => void) | null = null;
	private resizeMoveHandler: ((event: PointerEvent) => void) | null = null;
	private resizeEndHandler: ((event: PointerEvent) => void) | null = null;
	private panMoveHandler: ((event: PointerEvent) => void) | null = null;
	private panEndHandler: ((event: PointerEvent) => void) | null = null;
	private linkMoveHandler: ((event: PointerEvent) => void) | null = null;
	private linkEndHandler: ((event: PointerEvent) => void) | null = null;
	private renderToken = 0;

	constructor(controller: QueryController, containerEl: HTMLElement, plugin: BaseboardPlugin) {
		super(controller);
		this.plugin = plugin;
		this.containerEl = containerEl;
	}

	private t(key: string, params?: InterpolationValues): string {
		return this.plugin.t(key, params);
	}

	private tp(key: string, count: number, params?: InterpolationValues): string {
		return this.plugin.tp(key, count, params);
	}

	onload(): void {
		this.plugin.registerViewInstance(this);
		this.setupRoot();
		const refreshFromMetadata = debounce((file: TFile) => {
			if (this.hasVisibleFile(file.path)) {
				this.scheduleRender();
			}
		}, 150, true);
		this.registerEvent(this.app.metadataCache.on("changed", refreshFromMetadata));
		for (const eventRef of this.plugin.taskNotes.registerTaskEvents(() => this.scheduleRender())) {
			this.registerEvent(eventRef);
		}
		this.scheduleRender();
	}

	onunload(): void {
		this.cancelScheduledWork();
		this.clearDragListeners();
		this.plugin.unregisterViewInstance(this);
	}

	onDataUpdated(): void {
		this.scheduleRender();
	}

	focus(): void {
		this.plugin.setActiveView(this);
		if (!this.rootEl) return;
		const activeElement = this.rootEl.ownerDocument.activeElement;
		if (activeElement instanceof HTMLElement && this.rootEl.contains(activeElement)) return;

		this.rootEl.focus({ preventScroll: true });
	}

	getSnapshot(): BaseboardViewSnapshot | null {
		if (!this.data || !this.config) return null;
		const snapshot = applyManualViewItems(
			this.app,
			buildBaseboardSnapshot(this.data, this.config),
			this.config
		);
		return applyStoredNodePositions(
			snapshot,
			this.getNodePositions()
		);
	}

	getMaterializationSnapshot(): BaseboardViewSnapshot | null {
		const snapshot = this.getSnapshot();
		if (!snapshot) return snapshot;

		return applyStoredNodePositions(
			snapshot,
			{
				...this.getNodePositions(),
				...Object.fromEntries(this.getRenderedNodePositions()),
			}
		);
	}

	getMaterializeOptions(): MaterializeOptions {
		const defaults = buildDefaultMaterializeOptions(
			this.plugin.settings,
			this.config?.name ?? this.t("common.appName"),
			this.config ? getStringConfig(this.config, VIEW_CONFIG_KEYS.canvasPath) ?? undefined : undefined
		);

		if (!this.config) return defaults;

		return {
			...defaults,
			layout: normalizeLayout(getStringConfig(this.config, VIEW_CONFIG_KEYS.layout), defaults.layout),
			edgeMode: normalizeEdgeMode(
				getStringConfig(this.config, VIEW_CONFIG_KEYS.edgeMode),
				defaults.edgeMode
			),
			edgeProperties: splitPropertyList(
				getStringConfig(this.config, VIEW_CONFIG_KEYS.edgeProperties) ??
					this.plugin.settings.defaultEdgeProperties
			),
			showBodyEditor: getBooleanConfig(
				this.config,
				VIEW_CONFIG_KEYS.showBodyEditor,
				defaults.showBodyEditor
			),
			taskNotesMode: normalizeTaskNotesMode(
				getStringConfig(this.config, VIEW_CONFIG_KEYS.taskNotesMode),
				defaults.taskNotesMode
			),
			taskNotesShowBadges: getBooleanConfig(
				this.config,
				VIEW_CONFIG_KEYS.taskNotesShowBadges,
				defaults.taskNotesShowBadges
			),
			taskNotesShowActions: getBooleanConfig(
				this.config,
				VIEW_CONFIG_KEYS.taskNotesShowActions,
				defaults.taskNotesShowActions
			),
			taskNotesRelationships: normalizeTaskNotesRelationshipMode(
				getStringConfig(this.config, VIEW_CONFIG_KEYS.taskNotesRelationships),
				defaults.taskNotesRelationships
			),
			preservePositions: getBooleanConfig(
				this.config,
				VIEW_CONFIG_KEYS.preservePositions,
				defaults.preservePositions
			),
			removeMissingNodes: getBooleanConfig(
				this.config,
				VIEW_CONFIG_KEYS.removeMissingNodes,
				defaults.removeMissingNodes
			),
			nodeWidth: normalizeDimension(
				this.config.get(VIEW_CONFIG_KEYS.nodeWidth),
				defaults.nodeWidth,
				160,
				520
			),
			nodeHeight: normalizeDimension(
				this.config.get(VIEW_CONFIG_KEYS.nodeHeight),
				defaults.nodeHeight,
				80,
				320
			),
		};
	}

	setMaterializeOptions(options: MaterializeOptions): void {
		if (!this.config) return;

		this.config.set(VIEW_CONFIG_KEYS.canvasPath, options.canvasPath);
		this.config.set(VIEW_CONFIG_KEYS.layout, options.layout);
		this.config.set(VIEW_CONFIG_KEYS.edgeMode, options.edgeMode);
		this.config.set(VIEW_CONFIG_KEYS.edgeProperties, options.edgeProperties.join(", "));
		this.config.set(VIEW_CONFIG_KEYS.showBodyEditor, options.showBodyEditor);
		this.config.set(VIEW_CONFIG_KEYS.taskNotesMode, options.taskNotesMode);
		this.config.set(VIEW_CONFIG_KEYS.taskNotesShowBadges, options.taskNotesShowBadges);
		this.config.set(VIEW_CONFIG_KEYS.taskNotesShowActions, options.taskNotesShowActions);
		this.config.set(VIEW_CONFIG_KEYS.taskNotesRelationships, options.taskNotesRelationships);
		this.config.set(VIEW_CONFIG_KEYS.preservePositions, options.preservePositions);
		this.config.set(VIEW_CONFIG_KEYS.removeMissingNodes, options.removeMissingNodes);
		this.config.set(VIEW_CONFIG_KEYS.nodeWidth, options.nodeWidth);
		this.config.set(VIEW_CONFIG_KEYS.nodeHeight, options.nodeHeight);
		this.scheduleRender();
	}

	getCanvasPath(): string | null {
		if (!this.config) return null;

		const configuredPath = getStringConfig(this.config, VIEW_CONFIG_KEYS.canvasPath);
		return configuredPath?.trim() || null;
	}

	getViewActions(): BasesViewAction[] {
		return [
			{
				name: this.t("modal.title"),
				icon: "lucide-layout-dashboard",
				callback: () => {
					void this.plugin.configureAndMaterialize(this);
				},
			},
			{
				name: this.t("commands.updateLinkedCanvas"),
				icon: "lucide-refresh-cw",
				callback: () => {
					void this.plugin.materializeWithSavedOptions(this);
				},
			},
			{
				name: this.t("commands.openLinkedCanvas"),
				icon: "lucide-panel-top-open",
				callback: () => {
					void this.plugin.openLinkedCanvas(this);
				},
			},
		];
	}

	private setupRoot(): void {
		this.containerEl.empty();
		this.rootEl = this.containerEl.createDiv({
			cls: "baseboard-view",
			attr: {
				tabindex: "-1",
			},
		});
		this.registerDomEvent(this.rootEl, "focusin", () => {
			this.plugin.setActiveView(this);
		});
		this.registerDomEvent(this.rootEl, "pointerdown", () => {
			this.plugin.setActiveView(this);
		});
	}

	private scheduleRender(): void {
		if (this.renderFrame !== null) return;

		this.renderFrame = this.requestViewAnimationFrame(() => {
			this.renderFrame = null;
			this.render();
		});
	}

	private scheduleVirtualCanvasRender(): void {
		if (!this.canvasRenderState || this.virtualRenderFrame !== null) return;

		this.virtualRenderFrame = this.requestViewAnimationFrame(() => {
			this.virtualRenderFrame = null;
			this.renderVirtualCanvas();
		});
	}

	private cancelScheduledWork(): void {
		this.cancelRenderFrame();
		this.cancelVirtualRenderFrame();
	}

	private cancelRenderFrame(): void {
		if (this.renderFrame === null) return;

		this.cancelViewAnimationFrame(this.renderFrame);
		this.renderFrame = null;
	}

	private cancelVirtualRenderFrame(): void {
		if (this.virtualRenderFrame === null) return;

		this.cancelViewAnimationFrame(this.virtualRenderFrame);
		this.virtualRenderFrame = null;
	}

	private requestViewAnimationFrame(callback: FrameRequestCallback): number {
		const viewWindow = this.rootEl?.ownerDocument.defaultView ?? window;
		return viewWindow.requestAnimationFrame(callback);
	}

	private cancelViewAnimationFrame(handle: number): void {
		const viewWindow = this.rootEl?.ownerDocument.defaultView ?? window;
		viewWindow.cancelAnimationFrame(handle);
	}

	private render(): void {
		if (!this.rootEl) {
			this.setupRoot();
		}

		const rootEl = this.rootEl;
		if (!rootEl) return;

		const viewportState = this.captureViewportState();
		this.cancelVirtualRenderFrame();
		this.clearCanvasReferences();
		rootEl.empty();
		const snapshot = this.getSnapshot();

		this.renderToolbar(rootEl, snapshot);

		if (!snapshot || (snapshot.totalEntries === 0 && snapshot.textCards.length === 0)) {
			this.renderEmpty(rootEl);
			return;
		}

		this.renderCanvas(rootEl, snapshot, viewportState);
	}

	private renderToolbar(
		containerEl: HTMLElement,
		snapshot: BaseboardViewSnapshot | null
	): void {
		const toolbarEl = containerEl.createDiv({ cls: "baseboard-view__toolbar" });
		const summaryEl = toolbarEl.createDiv({ cls: "baseboard-view__summary" });
		summaryEl.createDiv({
			cls: "baseboard-view__title",
			text: snapshot?.viewName || this.t("common.appName"),
		});
		summaryEl.createDiv({
			cls: "baseboard-view__meta",
			text: snapshot ? this.formatSnapshotMeta(snapshot) : this.t("view.waitingForBasesData"),
		});

		const actionsEl = toolbarEl.createDiv({ cls: "baseboard-view__actions" });
		this.addToolbarButton(actionsEl, {
			icon: "lucide-file-plus",
			label: this.t("view.toolbar.pinNote"),
			onClick: () => this.openManualNotePicker(),
			isPrimary: false,
		});
		this.addToolbarButton(actionsEl, {
			icon: "lucide-sticky-note",
			label: this.t("view.toolbar.addCard"),
			onClick: () => this.addTextCard(),
			isPrimary: false,
		});
		this.addToolbarButton(actionsEl, {
			icon: "lucide-layout-dashboard",
			label: this.t("view.toolbar.createCanvas"),
			onClick: () => this.plugin.configureAndMaterialize(this),
			isPrimary: !this.getCanvasPath(),
		});
		this.addToolbarButton(actionsEl, {
			icon: "lucide-refresh-cw",
			label: this.t("view.toolbar.updateCanvas"),
			onClick: () => this.plugin.materializeWithSavedOptions(this),
			isPrimary: Boolean(this.getCanvasPath()),
		});
		this.addToolbarButton(actionsEl, {
			icon: "lucide-panel-top-open",
			label: this.t("view.toolbar.openCanvas"),
			onClick: () => this.plugin.openLinkedCanvas(this),
			isPrimary: false,
		});
		this.addToolbarButton(actionsEl, {
			icon: "lucide-rotate-ccw",
			label: this.t("view.toolbar.resetLayout"),
			onClick: () => this.resetLayout(),
			isPrimary: false,
		});
	}

	private addToolbarButton(
		containerEl: HTMLElement,
		{
			icon,
			label,
			onClick,
			isPrimary,
		}: {
			icon: string;
			label: string;
			onClick: () => Promise<void>;
			isPrimary: boolean;
		}
	): void {
		new ButtonComponent(containerEl)
			.setButtonText(label)
			.setClass(isPrimary ? "baseboard-view__button--primary" : "baseboard-view__button")
			.onClick((event) => {
				if (Keymap.isModEvent(event)) return;
				void onClick();
			})
			.then((button) => {
				button.buttonEl.addClass("baseboard-view__button");
				setIcon(button.buttonEl.createSpan({ cls: "baseboard-view__button-icon" }), icon);
				setTooltip(button.buttonEl, label);
			});
	}

	private renderEmpty(containerEl: HTMLElement): void {
		const emptyEl = containerEl.createDiv({ cls: "baseboard-view__empty" });
		emptyEl.createDiv({
			cls: "baseboard-view__empty-title",
			text: this.t("view.empty.title"),
		});
		emptyEl.createDiv({
			cls: "baseboard-view__empty-text",
			text: this.t("view.empty.body"),
		});
	}

	private formatSnapshotMeta(snapshot: BaseboardViewSnapshot): string {
		return [
			this.tp("common.note", snapshot.totalEntries),
			this.tp("common.group", snapshot.groups.length),
			snapshot.textCards.length > 0
				? this.tp("common.card", snapshot.textCards.length)
				: null,
		]
			.filter((part): part is string => part !== null)
			.join(", ");
	}

	private async openManualNotePicker(): Promise<void> {
		if (!this.config) return;

		const visiblePaths = new Set(
			this.getSnapshot()?.groups.flatMap((group) =>
				group.entries.map((entry) => entry.path)
			) ?? []
		);
		const pinnedPaths = this.getManualNotePaths();
		const unavailablePaths = new Set([...visiblePaths, ...pinnedPaths]);

		new ManualNoteSuggestModal(this.app, unavailablePaths, this.t.bind(this), (file) => {
			this.addManualNote(file.path);
		}).open();
	}

	private async addTextCard(): Promise<void> {
		if (!this.config) return;

		const options = this.getMaterializeOptions();
		const card: BaseboardTextCardSnapshot = {
			id: createTextCardId(),
			text: "",
		};
		const cards = [...normalizeTextCards(this.config.get(VIEW_CONFIG_KEYS.textCards)), card];
		const positions = this.getNodePositions();
		positions[getTextCardNodeId(card.id)] = this.getNewCardPosition(
			Math.max(220, options.nodeWidth),
			Math.max(120, options.nodeHeight)
		);

		setTextCards(this.config, cards);
		this.setNodePositions(positions);
		this.scheduleRender();
	}

	private addManualNote(path: string): void {
		if (!this.config) return;

		const paths = this.getManualNotePaths();
		if (paths.includes(path)) return;

		setManualNotePaths(this.config, [...paths, path]);
		this.scheduleRender();
	}

	private removeManualNote(path: string): void {
		if (!this.config) return;

		setManualNotePaths(
			this.config,
			this.getManualNotePaths().filter((entry) => entry !== path)
		);
		this.scheduleRender();
	}

	private updateTextCardText(id: string, text: string): void {
		if (!this.config) return;

		const cards = normalizeTextCards(this.config.get(VIEW_CONFIG_KEYS.textCards));
		setTextCards(
			this.config,
			cards.map((card) => (card.id === id ? { ...card, text } : card))
		);
	}

	private removeTextCard(id: string): void {
		if (!this.config) return;

		setTextCards(
			this.config,
			normalizeTextCards(this.config.get(VIEW_CONFIG_KEYS.textCards)).filter(
				(card) => card.id !== id
			)
		);
		const positions = this.getNodePositions();
		delete positions[getTextCardNodeId(id)];
		this.setNodePositions(positions);
		this.scheduleRender();
	}

	private getManualNotePaths(): string[] {
		if (!this.config) return [];

		return normalizeManualNotePaths(this.config.get(VIEW_CONFIG_KEYS.manualNotePaths));
	}

	private getNewCardPosition(width: number, height: number): BaseboardNodePosition {
		const viewportEl = this.canvasViewportEl;
		if (!viewportEl) {
			return { x: CANVAS_PADDING, y: CANVAS_PADDING, width, height };
		}

		return {
			x: clampCoordinate(
				(viewportEl.scrollLeft + viewportEl.clientWidth / 2) / this.zoom - width / 2
			),
			y: clampCoordinate(
				(viewportEl.scrollTop + viewportEl.clientHeight / 2) / this.zoom - height / 2
			),
			width,
			height,
		};
	}

	private renderCanvas(
		containerEl: HTMLElement,
		snapshot: BaseboardViewSnapshot,
		initialViewportState: CanvasViewportState | null
	): void {
		this.edgeLayerEl = null;
		this.renderedEdges = [];
		this.canvasNodeElements = new Map();
		this.canvasRenderState = null;
		const renderToken = ++this.renderToken;
		const options = {
			...this.getMaterializeOptions(),
			preservePositions: true,
		};
		const initializedTextCards = initializeTextCardPositions(
			snapshot,
			options,
			this.getNodePositions()
		);
		if (initializedTextCards.changed) {
			this.setNodePositions(initializedTextCards.positions);
			snapshot = initializedTextCards.snapshot;
		}

		const relationships = collectRelationships(this.app, snapshot, options);
		const genericEdgeRelationships = buildEdgeRelationshipMap(relationships);
		const canvas = buildBaseboardCanvas(
			snapshot,
			options,
			relationships,
			{}
		);
		const genericEdges = canvas.edges ?? [];
		const taskEdgeCacheKey = getTaskEdgeCacheKey(snapshot, options);
		const cachedTaskEdges =
			this.plugin.taskNotes.isAvailable() &&
			taskEdgeCacheKey &&
			this.taskEdgeCache?.key === taskEdgeCacheKey
				? this.taskEdgeCache.edges
				: [];
		const cachedTaskRelationships =
			this.plugin.taskNotes.isAvailable() &&
			taskEdgeCacheKey &&
			this.taskEdgeCache?.key === taskEdgeCacheKey
				? this.taskEdgeCache.relationships
				: [];
		const initialEdges = mergeCanvasEdges(genericEdges, cachedTaskEdges);
		const initialEdgeRelationships = mergeEdgeRelationshipMaps(
			genericEdgeRelationships,
			buildEdgeRelationshipMap(cachedTaskRelationships)
		);
		const nodes = (canvas.nodes ?? []).filter(isRenderableCanvasNode);
		const nodePositions = new Map(
			nodes.map((node) => [node.id, getCanvasNodePosition(node)])
		);
		const groupEntries = new Map(
			snapshot.groups.map((group) => [
				group.id,
				group.entries.map((entry) => getFileNodeId(entry.path)),
			])
		);
		const entriesByPath = new Map(
			snapshot.groups.flatMap((group) =>
				group.entries.map((entry) => [entry.path, entry] as const)
			)
		);
		const textCardsByNodeId = new Map(
			snapshot.textCards.map((card) => [getTextCardNodeId(card.id), card] as const)
		);
		const filePathsByNodeId = new Map(
			nodes
				.filter((node): node is CanvasFileNode => node.type === "file")
				.map((node) => [node.id, node.file] as const)
		);

		const bounds = getCanvasBounds(nodes);
		const viewportEl = containerEl.createDiv({ cls: "baseboard-canvas-viewport" });
		const worldEl = viewportEl.createDiv({ cls: "baseboard-canvas-world" });
		const planeEl = worldEl.createDiv({ cls: "baseboard-canvas-plane" });
		this.canvasViewportEl = viewportEl;
		this.canvasWorldEl = worldEl;
		this.canvasPlaneEl = planeEl;
		this.canvasBounds = bounds;
		planeEl.style.setProperty("width", `${bounds.width}px`);
		planeEl.style.setProperty("height", `${bounds.height}px`);

		this.restoreViewportState(initialViewportState);
		this.canvasRenderState = {
			allNodes: nodes,
			allEdges: initialEdges,
			groupEntries,
			entriesByPath,
			filePathsByNodeId,
			textCardsByNodeId,
			nodePositions,
			planeEl,
			bounds,
			taskCards: new Map(),
			edgeRelationships: initialEdgeRelationships,
		};
		this.renderVirtualCanvas();
		this.renderCanvasControls(containerEl);
		this.registerPanHandlers(viewportEl);
		this.registerDomEvent(viewportEl, "scroll", () => {
			this.scheduleVirtualCanvasRender();
		});
		this.applyZoom();
		void this.hydrateTaskNotes(
			snapshot,
			options,
			renderToken,
			planeEl,
			genericEdges,
			genericEdgeRelationships,
			bounds
		);
	}

	private renderVirtualCanvas(): void {
		if (!this.canvasRenderState || !this.canvasViewportEl) return;

		const state = this.canvasRenderState;
		const selection = selectVirtualizedCanvasNodes(
			state.allNodes,
			this.getViewportMetrics(this.canvasViewportEl),
			{
				zoom: this.zoom,
				overscan: DEFAULT_VIRTUALIZATION_OVERSCAN,
				threshold: DEFAULT_VIRTUALIZATION_THRESHOLD,
				alwaysRenderNodeIds: this.getAlwaysRenderNodeIds(),
			}
		);
		const nextNodeIds = new Set(selection.nodes.map((node) => node.id));

		for (const [nodeId, element] of [...this.canvasNodeElements]) {
			if (nextNodeIds.has(nodeId)) continue;

			this.destroyInlineEditor(nodeId, true);
			element.remove();
			this.canvasNodeElements.delete(nodeId);
		}

		for (const node of selection.nodes) {
			const existingEl = this.canvasNodeElements.get(node.id);
			if (existingEl) {
				setNodeGeometry(
					existingEl,
					state.nodePositions.get(node.id) ?? getCanvasNodePosition(node)
				);
				continue;
			}

			const nodeEl = this.renderCanvasNode(
				state.planeEl,
				applyCanvasNodePosition(node, state.nodePositions.get(node.id)),
				state
			);
			this.canvasNodeElements.set(node.id, nodeEl);
			this.registerCanvasNodeInteraction(node.id, nodeEl, state);
		}

		this.replaceEdgeLayer(
			state.planeEl,
			filterEdgesForVisibleNodes(
				state.allEdges,
				selection.visibleNodeIds,
				selection.shouldVirtualize
			),
			state.bounds
		);
		this.hydrateVisibleTaskCards();
	}

	private renderCanvasNode(
		containerEl: HTMLElement,
		node: CanvasRenderableNode,
		state: CanvasRenderState
	): HTMLElement {
		if (node.type === "group") {
			return this.renderGroupNode(containerEl, node, state.groupEntries.get(node.id) ?? []);
		}

		if (node.type === "file") {
			return this.renderFileNode(containerEl, node, state.entriesByPath.get(node.file));
		}

		return this.renderTextNode(containerEl, node, state.textCardsByNodeId.get(node.id));
	}

	private registerCanvasNodeInteraction(
		nodeId: string,
		element: HTMLElement,
		state: CanvasRenderState
	): void {
		const childNodeIds = state.groupEntries.get(nodeId) ?? [];
		const dragNodeIds = childNodeIds.length > 0 ? [nodeId, ...childNodeIds] : [nodeId];
		const kind = getCanvasNodeKind(element);

		this.addElementEvent(element, "pointerdown", (event) => {
			if (kind === "file" || kind === "text") {
				this.bringCardToFront(event, element);
			}
			this.startDrag(event, dragNodeIds, this.canvasNodeElements, state.nodePositions);
		});

		const handleEl = element.querySelector(".baseboard-canvas-resize-handle");
		if (!(handleEl instanceof HTMLElement) || !kind) return;

		this.addElementEvent(handleEl, "pointerdown", (event) => {
			this.startResize(event, nodeId, kind, element, state.nodePositions);
		});
	}

	private bringCardToFront(event: PointerEvent, element: HTMLElement): void {
		if (event.button !== 0) return;
		if (isNodeControlTarget(event.target)) return;

		if (this.frontCardEl && this.frontCardEl !== element) {
			this.frontCardEl.style.removeProperty("z-index");
		}

		this.frontCardEl = element;
		element.style.setProperty("z-index", FRONT_CARD_Z_INDEX);
	}

	private getViewportMetrics(viewportEl: HTMLElement): CanvasViewportMetrics {
		return {
			scrollLeft: viewportEl.scrollLeft,
			scrollTop: viewportEl.scrollTop,
			clientWidth: viewportEl.clientWidth,
			clientHeight: viewportEl.clientHeight,
		};
	}

	private getAlwaysRenderNodeIds(): Set<string> {
		const nodeIds = new Set<string>();
		for (const node of this.dragState?.nodes ?? []) {
			nodeIds.add(node.id);
		}
		if (this.resizeState) {
			nodeIds.add(this.resizeState.id);
		}
		if (this.linkDragState) {
			nodeIds.add(getFileNodeId(this.linkDragState.sourcePath));
			if (this.linkDragState.targetPath) {
				nodeIds.add(getFileNodeId(this.linkDragState.targetPath));
			}
		}

		return nodeIds;
	}

	private hydrateVisibleTaskCards(): void {
		if (!this.canvasRenderState || this.canvasRenderState.taskCards.size === 0) return;

		for (const [nodeId] of this.canvasNodeElements) {
			const path = this.canvasRenderState.filePathsByNodeId.get(nodeId);
			if (!path) continue;

			const taskCard = this.canvasRenderState.taskCards.get(path);
			if (taskCard) {
				this.applyTaskCard(taskCard, this.canvasRenderState.entriesByPath.get(path));
			}
		}
	}

	private renderGroupNode(
		containerEl: HTMLElement,
		node: CanvasGroupNode,
		childNodeIds: string[]
	): HTMLElement {
		const groupEl = containerEl.createDiv({ cls: "baseboard-canvas-group" });
		groupEl.setAttr("data-baseboard-node-id", node.id);
		groupEl.setAttr("data-baseboard-node-kind", "group");
		setNodeGeometry(groupEl, node);

		const headerEl = groupEl.createDiv({ cls: "baseboard-canvas-group__header" });
		headerEl.createDiv({ cls: "baseboard-canvas-group__title", text: node.label });
		headerEl.createDiv({
			cls: "baseboard-canvas-group__count",
			text: String(childNodeIds.length),
		});
		setTooltip(headerEl, this.t("view.tooltips.dragGroup"));
		this.addResizeHandle(groupEl, this.t("view.tooltips.resizeGroup"));

		return groupEl;
	}

	private renderFileNode(
		containerEl: HTMLElement,
		node: CanvasFileNode,
		entry: BaseboardEntrySnapshot | undefined
	): HTMLElement {
		const fileEl = containerEl.createDiv({
			cls: "baseboard-canvas-file",
			attr: {
				tabindex: "0",
			},
		});
		fileEl.setAttr("data-baseboard-node-id", node.id);
		fileEl.setAttr("data-baseboard-node-kind", "file");
		setNodeGeometry(fileEl, node);
		setTooltip(fileEl, this.t("view.tooltips.dragNote"));
		const showBodyEditor = this.getMaterializeOptions().showBodyEditor;
		fileEl.toggleClass("is-body-editor-hidden", !showBodyEditor);

		const headerEl = fileEl.createDiv({ cls: "baseboard-canvas-file__header" });
		setIcon(headerEl.createSpan({ cls: "baseboard-canvas-file__icon" }), "lucide-file-text");
		headerEl.createDiv({
			cls: "baseboard-canvas-file__title",
			text: node.file.split("/").pop()?.replace(/\.md$/u, "") || node.file,
		});
		if (entry?.isManual) {
			headerEl.createDiv({
				cls: "baseboard-canvas-file__manual-badge",
				text: this.t("view.card.pinned"),
			});
		}
		this.renderCardLinkHandle(headerEl, node.file, fileEl);
		this.renderCardActionButton(headerEl, this.t("view.card.noteActions"), (event) => {
			void this.openFileCardMenu(event, node.file, entry);
		});
		fileEl.createDiv({
			cls: "baseboard-canvas-file__path",
			text: node.file,
		});
		this.renderCardProperties(fileEl, entry);
		if (showBodyEditor) {
			this.renderInlineEditor(fileEl, node.id, node.file);
		}

		this.addElementEvent(fileEl, "dblclick", (event) => {
			event.preventDefault();
			void this.app.workspace.openLinkText(node.file, "", Keymap.isModEvent(event));
		});
		this.addElementEvent(fileEl, "contextmenu", (event) => {
			event.preventDefault();
			void this.openFileCardMenu(event, node.file, entry);
		});
		fileEl.onkeydown = (event) => {
			if (event.key !== "Enter") return;
			event.preventDefault();
			void this.app.workspace.openLinkText(node.file, "", Keymap.isModEvent(event));
		};
		this.addResizeHandle(fileEl, this.t("view.tooltips.resizeCard"));

		return fileEl;
	}

	private renderCardLinkHandle(
		containerEl: HTMLElement,
		path: string,
		cardEl: HTMLElement
	): void {
		const buttonEl = containerEl.createEl("button", {
			cls: "baseboard-canvas-link-handle",
			attr: {
				"aria-label": this.t("view.card.linkFromNote"),
				type: "button",
			},
		});
		setIcon(buttonEl, "lucide-link-2");
		setTooltip(buttonEl, this.t("view.tooltips.dragToLinkNotes"));
		this.addElementEvent(buttonEl, "pointerdown", (event) => {
			this.startLinkDrag(event, path, cardEl);
		});
		this.addElementEvent(buttonEl, "click", (event) => {
			event.preventDefault();
			event.stopPropagation();
		});
	}

	private renderTextNode(
		containerEl: HTMLElement,
		node: CanvasTextNode,
		card: BaseboardTextCardSnapshot | undefined
	): HTMLElement {
		const textEl = containerEl.createDiv({
			cls: "baseboard-canvas-text-card",
			attr: {
				tabindex: "0",
			},
		});
		textEl.setAttr("data-baseboard-node-id", node.id);
		textEl.setAttr("data-baseboard-node-kind", "text");
		setNodeGeometry(textEl, node);
		setTooltip(textEl, this.t("view.tooltips.dragCard"));

		const headerEl = textEl.createDiv({ cls: "baseboard-canvas-text-card__header" });
		setIcon(headerEl.createSpan({ cls: "baseboard-canvas-text-card__icon" }), "lucide-sticky-note");
		headerEl.createDiv({
			cls: "baseboard-canvas-text-card__title",
			text: this.t("view.card.textCardTitle"),
		});
		this.renderCardActionButton(headerEl, this.t("view.card.cardActions"), (event) => {
			this.openTextCardMenu(event, card);
		});

		const editorEl = textEl.createEl("textarea", {
			cls: "baseboard-canvas-text-card__editor",
			attr: {
				"aria-label": this.t("view.card.editCard"),
				placeholder: this.t("view.card.writeNote"),
				spellcheck: "true",
			},
		});
		editorEl.value = card?.text ?? node.text;

		this.addElementEvent(editorEl, "pointerdown", (event) => {
			event.stopPropagation();
		});
		this.addElementEvent(editorEl, "dblclick", (event) => {
			event.stopPropagation();
		});
		this.addElementEvent(editorEl, "input", () => {
			editorEl.toggleClass("is-dirty", editorEl.value !== (card?.text ?? node.text));
		});
		this.addElementEvent(editorEl, "blur", () => {
			if (!card) return;
			this.updateTextCardText(card.id, editorEl.value);
			editorEl.removeClass("is-dirty");
		});
		this.addElementEvent(textEl, "contextmenu", (event) => {
			event.preventDefault();
			this.openTextCardMenu(event, card);
		});
		this.addResizeHandle(textEl, this.t("view.tooltips.resizeCard"));

		return textEl;
	}

	private renderCardActionButton(
		containerEl: HTMLElement,
		label: string,
		onClick: (event: MouseEvent) => void
	): void {
		const buttonEl = containerEl.createEl("button", {
			cls: "baseboard-canvas-card-action",
			attr: {
				"aria-label": label,
				type: "button",
			},
		});
		setIcon(buttonEl, "lucide-more-horizontal");
		setTooltip(buttonEl, label);
		this.addElementEvent(buttonEl, "pointerdown", (event) => {
			event.stopPropagation();
		});
		this.addElementEvent(buttonEl, "click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			onClick(event);
		});
	}

	private async openFileCardMenu(
		event: MouseEvent,
		path: string,
		entry: BaseboardEntrySnapshot | undefined
	): Promise<void> {
		const menu = new Menu();
		const options = this.getMaterializeOptions();
		let taskActionsAdded = false;
		if (options.taskNotesMode !== "off" && options.taskNotesShowActions) {
			taskActionsAdded = await this.plugin.taskNotes.populateTaskMenu(menu, path, () =>
				this.scheduleRender()
			);
			if (!taskActionsAdded) {
				const shown = await this.plugin.taskNotes.showTaskMenu(path, event, () =>
					this.scheduleRender()
				);
				if (shown) return;
			}
		}
		if (taskActionsAdded) {
			menu.addSeparator();
		}

		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.openNote"))
				.setIcon("lucide-file-text")
				.onClick(() => {
					void this.app.workspace.openLinkText(path, "", Keymap.isModEvent(event));
				});
		});

		if (entry?.isManual) {
			menu.addSeparator();
			menu.addItem((item) => {
				item
					.setTitle(this.t("view.menu.unpinFromBoard"))
					.setIcon("lucide-pin-off")
					.onClick(() => {
						this.removeManualNote(path);
					});
			});
		}

		menu.showAtMouseEvent(event);
	}

	private openTextCardMenu(
		event: MouseEvent,
		card: BaseboardTextCardSnapshot | undefined
	): void {
		const menu = new Menu();
		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.removeCard"))
				.setIcon("lucide-trash-2")
				.setWarning(true)
				.setDisabled(!card)
				.onClick(() => {
					if (card) this.removeTextCard(card.id);
				});
		});
		menu.showAtMouseEvent(event);
	}

	private openLinkCreationMenu(
		event: MouseEvent,
		sourcePath: string,
		targetPath: string
	): void {
		const sourceName = formatPathName(sourcePath);
		const targetName = formatPathName(targetPath);
		const menu = new Menu();

		if (this.plugin.taskNotes.getTaskLinkingEnabled()) {
			const sourceBlocksTarget = this.t("view.menu.sourceBlocksTarget", {
				source: sourceName,
				target: targetName,
			});
			const targetBlocksSource = this.t("view.menu.targetBlocksSource", {
				source: sourceName,
				target: targetName,
			});
			const targetSubtaskOfSource = this.t("view.menu.targetSubtaskOfSource", {
				source: sourceName,
				target: targetName,
			});
			const sourceSubtaskOfTarget = this.t("view.menu.sourceSubtaskOfTarget", {
				source: sourceName,
				target: targetName,
			});
			menu.addItem((item) => {
				item
					.setTitle(sourceBlocksTarget)
					.setIcon("lucide-arrow-right")
					.onClick(() => {
						void this.addTaskDependency(
							targetPath,
							sourcePath,
							sourceBlocksTarget
						);
					});
			});
			menu.addItem((item) => {
				item
					.setTitle(targetBlocksSource)
					.setIcon("lucide-arrow-left")
					.onClick(() => {
						void this.addTaskDependency(
							sourcePath,
							targetPath,
							targetBlocksSource
						);
					});
			});
			menu.addSeparator();
			menu.addItem((item) => {
				item
					.setTitle(targetSubtaskOfSource)
					.setIcon("lucide-git-branch")
					.onClick(() => {
						void this.addTaskProject(
							targetPath,
							sourcePath,
							targetSubtaskOfSource
						);
					});
			});
			menu.addItem((item) => {
				item
					.setTitle(sourceSubtaskOfTarget)
					.setIcon("lucide-git-branch")
					.onClick(() => {
						void this.addTaskProject(
							sourcePath,
							targetPath,
							sourceSubtaskOfTarget
						);
					});
			});
			menu.addSeparator();
		}

		for (const property of this.getConfiguredLinkProperties().slice(0, 6)) {
			menu.addItem((item) => {
				item
					.setTitle(this.t("view.menu.addPropertyLink", {
						property,
						source: sourceName,
						target: targetName,
					}))
					.setIcon("lucide-link")
					.onClick(() => {
						void this.addPropertyLink(sourcePath, targetPath, property);
					});
			});
		}
		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.chooseProperty"))
				.setIcon("lucide-list-plus")
				.onClick(() => {
					this.openPropertyLinkPicker(sourcePath, targetPath);
				});
		});

		menu.showAtMouseEvent(event);
	}

	private openEdgeMenu(event: MouseEvent, relationship: BaseboardRelationship): void {
		const menu = new Menu();
		const sourceName = formatPathName(relationship.sourcePath);
		const targetName = formatPathName(relationship.targetPath);

		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.openPath", { name: sourceName }))
				.setIcon("lucide-file-text")
				.onClick(() => {
					void this.app.workspace.openLinkText(
						relationship.sourcePath,
						"",
						Keymap.isModEvent(event)
					);
				});
		});
		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.openPath", { name: targetName }))
				.setIcon("lucide-file-text")
				.onClick(() => {
					void this.app.workspace.openLinkText(
						relationship.targetPath,
						"",
						Keymap.isModEvent(event)
					);
				});
		});

		if (isRemovableRelationship(relationship)) {
			menu.addSeparator();
		}

		const metadata = relationship.metadata;
		if (metadata?.source === "tasknotes" && metadata.kind === "dependency") {
			menu.addItem((item) => {
				item
					.setTitle(this.t("view.menu.removeDependency"))
					.setIcon("lucide-unlink")
					.setWarning(true)
					.onClick(() => {
						void this.removeTaskDependency(metadata.blockedPath, metadata.dependencyUid);
					});
			});
		}

		if (metadata?.source === "tasknotes" && metadata.kind === "project") {
			menu.addItem((item) => {
				item
					.setTitle(this.t("view.menu.removeProjectRelationship"))
					.setIcon("lucide-unlink")
					.setWarning(true)
					.onClick(() => {
						void this.removeTaskProject(metadata.childPath, metadata.parentPath);
					});
			});
		}

		if (metadata?.source === "property") {
			menu.addItem((item) => {
				item
					.setTitle(this.t("view.menu.removePropertyLink", {
						property: metadata.property,
					}))
					.setIcon("lucide-unlink")
					.setWarning(true)
					.onClick(() => {
						void this.removePropertyLink(
							relationship.sourcePath,
							relationship.targetPath,
							metadata.property
						);
					});
			});
		}

		menu.showAtMouseEvent(event);
	}

	private async addTaskDependency(
		blockedPath: string,
		blockingPath: string,
		label: string
	): Promise<void> {
		await this.runLinkMutation(
			async () => this.plugin.taskNotes.addDependency(blockedPath, blockingPath),
			this.t("notices.addedDependency", { label }),
			() => this.ensureTaskRelationshipRendering("dependency")
		);
	}

	private async removeTaskDependency(
		blockedPath: string,
		dependencyUid: string
	): Promise<void> {
		await this.runLinkMutation(
			async () => this.plugin.taskNotes.removeDependency(blockedPath, dependencyUid),
			this.t("notices.removedDependency"),
			() => {
				this.removeRelationshipsFromLiveView((relationship) =>
					isTaskDependencyRelationship(relationship, blockedPath, dependencyUid)
				);
			}
		);
	}

	private async addTaskProject(
		childPath: string,
		parentPath: string,
		label: string
	): Promise<void> {
		await this.runLinkMutation(
			async () => this.plugin.taskNotes.addProject(childPath, parentPath),
			this.t("notices.addedProjectRelationship", { label }),
			() => this.ensureTaskRelationshipRendering("project")
		);
	}

	private async removeTaskProject(childPath: string, parentPath: string): Promise<void> {
		await this.runLinkMutation(
			async () => this.plugin.taskNotes.removeProject(childPath, parentPath),
			this.t("notices.removedProjectRelationship"),
			() => {
				this.removeRelationshipsFromLiveView((relationship) =>
					isTaskProjectRelationship(relationship, childPath, parentPath)
				);
			}
		);
	}

	private async runLinkMutation(
		mutation: () => Promise<boolean>,
		successMessage: string,
		onSuccess?: () => void
	): Promise<void> {
		try {
			const changed = await mutation();
			if (!changed) {
				new Notice(this.t("notices.linkActionUnavailable"));
				return;
			}

			onSuccess?.();
			this.taskEdgeCache = null;
			this.scheduleRender();
			new Notice(successMessage);
		} catch (error) {
			new Notice(this.t("notices.couldNotUpdateLink", { message: getErrorMessage(error) }));
		}
	}

	private removeRelationshipsFromLiveView(
		matchesRelationship: (relationship: BaseboardRelationship) => boolean
	): void {
		const edgeIds = new Set<string>();
		for (const relationship of this.taskEdgeCache?.relationships ?? []) {
			if (matchesRelationship(relationship)) {
				edgeIds.add(getRelationshipEdgeId(relationship));
			}
		}
		for (const relationship of this.canvasRenderState?.edgeRelationships.values() ?? []) {
			if (matchesRelationship(relationship)) {
				edgeIds.add(getRelationshipEdgeId(relationship));
			}
		}

		if (edgeIds.size === 0) return;

		if (this.taskEdgeCache) {
			this.taskEdgeCache = {
				...this.taskEdgeCache,
				edges: this.taskEdgeCache.edges.filter((edge) => !edgeIds.has(edge.id)),
				relationships: this.taskEdgeCache.relationships.filter(
					(relationship) => !matchesRelationship(relationship)
				),
			};
		}

		if (!this.canvasRenderState) return;

		this.canvasRenderState.allEdges = this.canvasRenderState.allEdges.filter(
			(edge) => !edgeIds.has(edge.id)
		);
		for (const edgeId of edgeIds) {
			this.canvasRenderState.edgeRelationships.delete(edgeId);
		}
		this.renderVirtualCanvas();
	}

	private openPropertyLinkPicker(sourcePath: string, targetPath: string): void {
		const properties = this.getAvailableLinkProperties();
		if (properties.length === 0) {
			new Notice(this.t("notices.noVisibleLinkProperties"));
			return;
		}

		new PropertyLinkSuggestModal(this.app, properties, this.t.bind(this), (property) => {
			void this.addPropertyLink(sourcePath, targetPath, property);
		}).open();
	}

	private getConfiguredLinkProperties(): string[] {
		return this.getMaterializeOptions().edgeProperties
			.map(toFrontmatterPropertyName)
			.filter((property): property is string => property !== null);
	}

	private getAvailableLinkProperties(): string[] {
		const properties = new Set<string>(this.getConfiguredLinkProperties());
		for (const group of this.getSnapshot()?.groups ?? []) {
			for (const entry of group.entries) {
				for (const property of entry.properties ?? []) {
					const propertyName = toFrontmatterPropertyName(property.id);
					if (propertyName) properties.add(propertyName);
				}
			}
		}

		return [...properties].sort((a, b) => a.localeCompare(b));
	}

	private async addPropertyLink(
		sourcePath: string,
		targetPath: string,
		property: string
	): Promise<void> {
		const propertyName = toFrontmatterPropertyName(property);
		if (!propertyName) {
			new Notice(this.t("notices.chooseLinkProperty"));
			return;
		}

		const file = this.app.vault.getAbstractFileByPath(sourcePath);
		if (!(file instanceof TFile)) {
			new Notice(this.t("notices.couldNotFind", { path: sourcePath }));
			return;
		}

		try {
			const link = createNoteWikiLink(targetPath);
			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter[propertyName] = appendPropertyLinkValue(
					frontmatter[propertyName],
					link,
					(value) => this.valueReferencesPath(value, sourcePath, targetPath)
				);
			});
			this.ensurePropertyEdgeRendering(propertyName);
			this.scheduleRender();
			new Notice(this.t("notices.addedPropertyLink", {
				property: propertyName,
				source: formatPathName(sourcePath),
				target: formatPathName(targetPath),
			}));
		} catch (error) {
			new Notice(this.t("notices.couldNotAddPropertyLink", { message: getErrorMessage(error) }));
		}
	}

	private async removePropertyLink(
		sourcePath: string,
		targetPath: string,
		property: string
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(sourcePath);
		if (!(file instanceof TFile)) {
			new Notice(this.t("notices.couldNotFind", { path: sourcePath }));
			return;
		}

		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				const nextValue = removePropertyLinkValue(
					frontmatter[property],
					(value) => this.valueReferencesPath(value, sourcePath, targetPath)
				);
				if (typeof nextValue === "undefined") {
					delete frontmatter[property];
				} else {
					frontmatter[property] = nextValue;
				}
			});
			this.scheduleRender();
			new Notice(this.t("notices.removedPropertyLink", { property }));
		} catch (error) {
			new Notice(this.t("notices.couldNotRemovePropertyLink", { message: getErrorMessage(error) }));
		}
	}

	private valueReferencesPath(value: unknown, sourcePath: string, targetPath: string): boolean {
		return extractReferenceCandidates(value).some((reference) =>
			this.referenceMatchesPath(reference, sourcePath, targetPath)
		);
	}

	private referenceMatchesPath(reference: string, sourcePath: string, targetPath: string): boolean {
		const linkPath = normalizeLinkText(reference);
		if (!linkPath) return false;

		const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);
		if (resolvedFile?.path === targetPath) return true;

		return taskReferencePathCandidates(linkPath).some((candidate) => candidate === targetPath);
	}

	private ensureTaskRelationshipRendering(kind: "dependency" | "project"): void {
		if (!this.config) return;

		if (getStringConfig(this.config, VIEW_CONFIG_KEYS.taskNotesMode) === "off") {
			this.config.set(VIEW_CONFIG_KEYS.taskNotesMode, "auto");
		}

		const mode = normalizeTaskNotesRelationshipMode(
			getStringConfig(this.config, VIEW_CONFIG_KEYS.taskNotesRelationships),
			this.plugin.settings.defaultTaskNotesRelationships
		);
		if (kind === "dependency" && mode === "none") {
			this.config.set(VIEW_CONFIG_KEYS.taskNotesRelationships, "dependencies");
		}
		if (kind === "project" && mode !== "all") {
			this.config.set(VIEW_CONFIG_KEYS.taskNotesRelationships, "all");
		}
	}

	private ensurePropertyEdgeRendering(property: string): void {
		if (!this.config) return;

		const properties = new Set(this.getConfiguredLinkProperties());
		properties.add(property);
		this.config.set(VIEW_CONFIG_KEYS.edgeProperties, [...properties].join(", "));

		const mode = normalizeEdgeMode(
			getStringConfig(this.config, VIEW_CONFIG_KEYS.edgeMode),
			this.plugin.settings.defaultEdgeMode
		);
		if (mode === "none") {
			this.config.set(VIEW_CONFIG_KEYS.edgeMode, "properties");
		} else if (mode === "wikilinks") {
			this.config.set(VIEW_CONFIG_KEYS.edgeMode, "all");
		}
	}

	private renderCardProperties(
		containerEl: HTMLElement,
		entry: BaseboardEntrySnapshot | undefined
	): void {
		if (!entry || !entry.properties || entry.properties.length === 0) return;

		const propertiesEl = containerEl.createDiv({
			cls: "baseboard-canvas-file__properties",
		});
		this.addElementEvent(propertiesEl, "pointerdown", (event) => {
			event.stopPropagation();
		});
		this.addElementEvent(propertiesEl, "dblclick", (event) => {
			event.stopPropagation();
		});

		for (const property of entry.properties) {
			const taskPropertyKind = this.plugin.taskNotes.getPropertyKind(property.id);
			const propertyEl = propertiesEl.createDiv({
				cls: "baseboard-canvas-file-property",
			});
			if (taskPropertyKind) {
				propertyEl.addClass("is-tasknotes-property");
				propertyEl.setAttr("data-baseboard-task-property-kind", taskPropertyKind);
			}
			propertyEl.toggleClass("is-empty", property.isEmpty);
			setTooltip(propertyEl, `${property.displayName}: ${property.text}`);
			propertyEl.createDiv({
				cls: "baseboard-canvas-file-property__label",
				text: property.displayName,
			});
			const valueEl = propertyEl.createDiv({
				cls: "baseboard-canvas-file-property__value",
			});
			valueEl.toggleClass("is-empty", property.isEmpty);
			this.renderPropertyValue(valueEl, property);
		}
	}

	private renderPropertyValue(
		containerEl: HTMLElement,
		property: BaseboardEntryPropertySnapshot
	): void {
		if (!property.value || property.isEmpty) {
			containerEl.setText(property.text);
			return;
		}

		try {
			property.value.renderTo(containerEl, { hoverPopover: null });
		} catch {
			containerEl.setText(property.text);
		}
		setTooltip(containerEl, property.text);
	}

	private renderEdgeLayer(
		containerEl: HTMLElement,
		edges: CanvasEdge[],
		bounds: { width: number; height: number }
	): void {
		const svgEl = createSvgElement("svg");
		svgEl.addClass("baseboard-canvas-edges");
		setSvgAttributes(svgEl, {
			"aria-hidden": "true",
			focusable: "false",
			width: String(bounds.width),
			height: String(bounds.height),
			viewBox: `0 0 ${bounds.width} ${bounds.height}`,
		});

		const defsEl = createSvgElement("defs");
		const markerEl = createSvgElement("marker");
		setSvgAttributes(markerEl, {
			id: this.edgeMarkerId,
			markerWidth: "10",
			markerHeight: "10",
			refX: "8.5",
			refY: "5",
			orient: "auto",
			markerUnits: "strokeWidth",
		});
		const markerPathEl = createSvgElement("path");
		markerPathEl.addClass("baseboard-canvas-edge__arrow");
		markerPathEl.setAttribute("d", "M 0 0 L 9 5 L 0 10 z");
		markerEl.appendChild(markerPathEl);
		defsEl.appendChild(markerEl);
		svgEl.appendChild(defsEl);

		for (const edge of edges) {
			const groupEl = createSvgElement("g");
			groupEl.addClass("baseboard-canvas-edge");
			groupEl.setAttribute("data-baseboard-edge-id", edge.id);
			const relationship = this.canvasRenderState?.edgeRelationships.get(edge.id);
			if (relationship && isRemovableRelationship(relationship)) {
				groupEl.addClass("is-actionable");
				groupEl.addEventListener("contextmenu", (event) => {
					event.preventDefault();
					event.stopPropagation();
					this.openEdgeMenu(event, relationship);
				});
			}

			const pathEl = createSvgElement("path");
			pathEl.addClass("baseboard-canvas-edge__path");
			pathEl.setAttribute("marker-end", `url(#${this.edgeMarkerId})`);
			groupEl.appendChild(pathEl);

			let labelGroupEl: SVGGElement | null = null;
			let labelRectEl: SVGRectElement | null = null;
			let labelTextEl: SVGTextElement | null = null;
			if (edge.label) {
				labelGroupEl = createSvgElement("g");
				labelGroupEl.addClass("baseboard-canvas-edge-label");
				labelRectEl = createSvgElement("rect");
				labelRectEl.addClass("baseboard-canvas-edge-label__background");
				labelTextEl = createSvgElement("text");
				labelTextEl.addClass("baseboard-canvas-edge-label__text");
				labelTextEl.textContent = edge.label;
				labelGroupEl.appendChild(labelRectEl);
				labelGroupEl.appendChild(labelTextEl);
				groupEl.appendChild(labelGroupEl);
			}

			svgEl.appendChild(groupEl);
			this.renderedEdges.push({
				edge,
				groupEl,
				pathEl,
				labelGroupEl,
				labelRectEl,
				labelTextEl,
			});
		}

		containerEl.appendChild(svgEl);
		this.edgeLayerEl = svgEl;
	}

	private updateEdgeLayerGeometry(): void {
		if (!this.edgeLayerEl || this.renderedEdges.length === 0) return;

		const nodePositions = this.getRenderedNodePositions();
		for (const renderedEdge of this.renderedEdges) {
			const geometry = buildBaseboardEdgeGeometry(renderedEdge.edge, nodePositions);
			renderedEdge.groupEl.classList.toggle("is-hidden", geometry === null);
			if (!geometry) continue;

			renderedEdge.pathEl.setAttribute("d", geometry.path);
			if (
				geometry.label &&
				renderedEdge.labelGroupEl &&
				renderedEdge.labelRectEl &&
				renderedEdge.labelTextEl
			) {
				setSvgAttributes(renderedEdge.labelRectEl, {
					x: String(geometry.label.x),
					y: String(geometry.label.y),
					width: String(geometry.label.width),
					height: String(geometry.label.height),
					rx: "6",
				});
				setSvgAttributes(renderedEdge.labelTextEl, {
					x: String(geometry.label.textX),
					y: String(geometry.label.textY),
				});
				renderedEdge.labelGroupEl.classList.remove("is-hidden");
			} else {
				renderedEdge.labelGroupEl?.classList.add("is-hidden");
			}
		}
	}

	private async hydrateTaskNotes(
		snapshot: BaseboardViewSnapshot,
		options: MaterializeOptions,
		renderToken: number,
		planeEl: HTMLElement,
		genericEdges: CanvasEdge[],
		genericEdgeRelationships: Map<string, BaseboardRelationship>,
		bounds: { width: number; height: number }
	): Promise<void> {
		if (options.taskNotesMode === "off") return;

		const paths = snapshot.groups.flatMap((group) => group.entries.map((entry) => entry.path));
		const entriesByPath = new Map(
			snapshot.groups.flatMap((group) =>
				group.entries.map((entry) => [entry.path, entry] as const)
			)
		);
		if (
			options.taskNotesShowBadges &&
			paths.length > 0 &&
			this.plugin.taskNotes.getTaskCardsEnabled()
		) {
			const taskCards = await this.plugin.taskNotes.getTaskCards(paths);
			if (!this.isCurrentRender(renderToken)) return;

			if (this.canvasRenderState?.planeEl === planeEl) {
				this.canvasRenderState.taskCards = taskCards;
				this.hydrateVisibleTaskCards();
			} else {
				for (const taskCard of taskCards.values()) {
					this.applyTaskCard(taskCard, entriesByPath.get(taskCard.path));
				}
			}
		}

		if (
			options.taskNotesRelationships === "none" ||
			!this.plugin.taskNotes.isAvailable()
		) {
			this.taskEdgeCache = null;
			return;
		}

		const taskEdgeCacheKey = getTaskEdgeCacheKey(snapshot, options);
		const taskRelationships = await this.plugin.taskNotes.collectRelationships(
			snapshot,
			options.taskNotesRelationships
		);
		if (!this.isCurrentRender(renderToken)) return;

		const taskCanvas = buildBaseboardCanvas(snapshot, options, taskRelationships, {});
		const taskEdges = taskCanvas.edges ?? [];
		const taskEdgeRelationships = buildEdgeRelationshipMap(taskRelationships);
		this.taskEdgeCache = taskEdgeCacheKey
			? { key: taskEdgeCacheKey, edges: taskEdges, relationships: taskRelationships }
			: null;
		const mergedEdges = mergeCanvasEdges(genericEdges, taskEdges);
		const mergedEdgeRelationships = mergeEdgeRelationshipMaps(
			genericEdgeRelationships,
			taskEdgeRelationships
		);
		if (this.canvasRenderState?.planeEl === planeEl) {
			this.canvasRenderState.allEdges = mergedEdges;
			this.canvasRenderState.edgeRelationships = mergedEdgeRelationships;
			this.renderVirtualCanvas();
			return;
		}

		this.replaceEdgeLayer(planeEl, mergedEdges, bounds);
	}

	private applyTaskCard(
		taskCard: BaseboardTaskCard,
		entry: BaseboardEntrySnapshot | undefined
	): void {
		const cardEl = this.canvasNodeElements.get(getFileNodeId(taskCard.path));
		if (!cardEl) return;
		const visibleKinds = this.getVisibleTaskPropertyKinds(entry);

		cardEl.addClass("is-tasknotes-task");
		cardEl.toggleClass("is-tasknotes-completed", taskCard.isCompleted);
		cardEl.toggleClass("is-tasknotes-archived", taskCard.isArchived);
		cardEl.toggleClass("is-tasknotes-blocked", taskCard.isBlocked);
		cardEl.toggleClass("is-tasknotes-blocking", taskCard.isBlocking);
		if (taskCard.status.color) {
			cardEl.style.setProperty("--baseboard-task-status-color", taskCard.status.color);
		}

		const titleEl = cardEl.querySelector(".baseboard-canvas-file__title");
		if (titleEl instanceof HTMLElement) {
			titleEl.setText(taskCard.title);
		}

		cardEl.querySelector(".baseboard-canvas-task")?.remove();
		const pathEl = cardEl.querySelector(".baseboard-canvas-file__path");
		if (!(pathEl instanceof HTMLElement)) return;

		const taskEl = createDiv({ cls: "baseboard-canvas-task" });
		const primaryEl = taskEl.createDiv({ cls: "baseboard-canvas-task__primary" });
		const renderedKinds = new Set<BaseboardTaskPropertyKind>();

		if (visibleKinds.has("status")) {
			this.renderTaskBadge(primaryEl, taskCard.status, "status");
			renderedKinds.add("status");
		}
		if (visibleKinds.has("priority")) {
			this.renderTaskBadge(primaryEl, taskCard.priority, "priority");
			renderedKinds.add("priority");
		}

		const detailBadges = taskCard.badges.filter((badge) => visibleKinds.has(badge.kind));
		if (detailBadges.length > 0) {
			const badgesEl = taskEl.createDiv({ cls: "baseboard-canvas-task__badges" });
			for (const badge of detailBadges) {
				this.renderTaskBadge(badgesEl, badge, "detail");
				renderedKinds.add(badge.kind);
			}
		}

		if (renderedKinds.size === 0) return;

		this.removeGenericTaskProperties(cardEl, renderedKinds);
		pathEl.insertAdjacentElement("afterend", taskEl);
	}

	private renderTaskBadge(
		containerEl: HTMLElement,
		badge: BaseboardTaskCard["status"],
		kind: "detail" | "priority" | "status"
	): void {
		const badgeEl = containerEl.createDiv({
			cls: `baseboard-canvas-task-badge baseboard-canvas-task-badge--${kind}`,
		});
		badgeEl.setAttr("data-baseboard-task-property-kind", badge.kind);
		if (badge.tone) {
			badgeEl.addClass(`is-${badge.tone}`);
		}
		if (badge.color) {
			badgeEl.style.setProperty("--baseboard-task-badge-color", badge.color);
		}
		setTooltip(badgeEl, `${badge.label}: ${badge.value}`);
		badgeEl.createSpan({
			cls: "baseboard-canvas-task-badge__label",
			text: badge.label,
		});
		if (badge.value !== badge.label) {
			badgeEl.createSpan({
				cls: "baseboard-canvas-task-badge__value",
				text: badge.value,
			});
		}
	}

	private getVisibleTaskPropertyKinds(
		entry: BaseboardEntrySnapshot | undefined
	): Set<BaseboardTaskPropertyKind> {
		const kinds = new Set<BaseboardTaskPropertyKind>();
		for (const property of entry?.properties ?? []) {
			const kind = this.plugin.taskNotes.getPropertyKind(property.id);
			if (kind) kinds.add(kind);
		}

		return kinds;
	}

	private removeGenericTaskProperties(
		cardEl: HTMLElement,
		kinds: Set<BaseboardTaskPropertyKind>
	): void {
		const propertiesEl = cardEl.querySelector(".baseboard-canvas-file__properties");
		if (!(propertiesEl instanceof HTMLElement)) return;

		for (const propertyEl of propertiesEl.querySelectorAll(".baseboard-canvas-file-property")) {
			if (!propertyEl.instanceOf(HTMLElement)) continue;
			const kind = propertyEl.dataset.baseboardTaskPropertyKind as
				| BaseboardTaskPropertyKind
				| undefined;
			if (kind && kinds.has(kind)) {
				propertyEl.remove();
			}
		}

		if (propertiesEl.querySelector(".baseboard-canvas-file-property") === null) {
			propertiesEl.remove();
		}
	}

	private replaceEdgeLayer(
		planeEl: HTMLElement,
		edges: CanvasEdge[],
		bounds: { width: number; height: number }
	): void {
		this.edgeLayerEl?.remove();
		this.edgeLayerEl = null;
		this.renderedEdges = [];
		this.renderEdgeLayer(planeEl, edges, bounds);
		this.updateEdgeLayerGeometry();
	}

	private isCurrentRender(renderToken: number): boolean {
		return this.renderToken === renderToken && Boolean(this.rootEl?.isConnected);
	}

	private getRenderedNodePositions(): Map<string, BaseboardNodePosition> {
		const positions = new Map<string, BaseboardNodePosition>();
		for (const [nodeId, element] of this.canvasNodeElements) {
			const position = getElementNodePosition(element);
			if (position) positions.set(nodeId, position);
		}

		return positions;
	}

	private captureViewportState(): CanvasViewportState | null {
		const viewportEl = this.canvasViewportEl;
		if (!viewportEl?.isConnected) return null;

		return {
			scrollLeft: viewportEl.scrollLeft,
			scrollTop: viewportEl.scrollTop,
		};
	}

	private restoreViewportState(state: CanvasViewportState | null): void {
		if (!state || !this.canvasViewportEl) return;

		this.canvasViewportEl.scrollLeft = state.scrollLeft;
		this.canvasViewportEl.scrollTop = state.scrollTop;
	}

	private clearCanvasReferences(): void {
		this.destroyAllInlineEditors(true);
		this.frontCardEl = null;
		this.edgeLayerEl = null;
		this.renderedEdges = [];
		this.canvasNodeElements = new Map();
		this.canvasViewportEl = null;
		this.canvasWorldEl = null;
		this.canvasPlaneEl = null;
		this.zoomLabelEl = null;
		this.canvasBounds = null;
		this.canvasRenderState = null;
	}

	private renderInlineEditor(containerEl: HTMLElement, nodeId: string, path: string): void {
		const editorShellEl = containerEl.createDiv({ cls: "baseboard-canvas-file__editor-shell" });
		const statusEl = containerEl.createDiv({ cls: "baseboard-canvas-file__status" });

		this.addElementEvent(editorShellEl, "pointerdown", (event) => {
			event.stopPropagation();
		});
		this.addElementEvent(editorShellEl, "dblclick", (event) => {
			event.stopPropagation();
		});
		this.addElementEvent(editorShellEl, "keydown", (event) => {
			event.stopPropagation();
		});

		void this.mountInlineEditor(editorShellEl, nodeId, path, statusEl);
	}

	private async mountInlineEditor(
		containerEl: HTMLElement,
		nodeId: string,
		path: string,
		statusEl: HTMLElement
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			this.renderInlineEditorFallback(containerEl, path, statusEl, "", true);
			statusEl.setText(this.t("view.editor.missing"));
			return;
		}

		let content: string;
		try {
			content = await this.app.vault.read(file);
		} catch (error) {
			if (containerEl.isConnected) {
				const fallbackEl = this.renderInlineEditorFallback(containerEl, path, statusEl, "", true);
				fallbackEl.setAttr("placeholder", this.t("view.editor.unableToLoad"));
				statusEl.setText(this.t("view.editor.error"));
			}
			throw error;
		}

		if (!containerEl.isConnected) return;

		try {
			const editorContainerEl = containerEl.createDiv({
				cls: "baseboard-canvas-file__markdown-editor",
				attr: {
					"aria-label": this.t("view.editor.editPath", { path }),
				},
			});
			let creationOriginal = content;
			const editor = await createBaseboardInlineMarkdownEditor(this.app, editorContainerEl, {
				value: content,
				placeholder: "",
				file,
				onChange: (value) => {
					const original = this.inlineEditors.get(nodeId)?.original ?? creationOriginal;
					const isDirty = value !== original;
					editorContainerEl.toggleClass("is-dirty", isDirty);
					containerEl.toggleClass("is-dirty", isDirty);
					statusEl.setText(isDirty ? this.t("view.editor.unsaved") : "");
				},
				onSubmit: () => {
					void this.saveInlineEditorState(nodeId);
				},
				onEscape: () => {
					const state = this.inlineEditors.get(nodeId);
					if (!state) return;
					state.editor.setValue(state.original);
					editorContainerEl.removeClass("is-dirty");
					containerEl.removeClass("is-dirty");
					statusEl.setText("");
					state.editor.blur();
				},
				onBlur: () => {
					void this.saveInlineEditorState(nodeId);
				},
			});

			creationOriginal = content;
			this.inlineEditors.set(nodeId, {
				path,
				editor,
				statusEl,
				original: content,
			});
			statusEl.setText("");
		} catch {
			if (containerEl.isConnected) {
				containerEl.empty();
				this.renderInlineEditorFallback(containerEl, path, statusEl, content);
				statusEl.setText("");
			}
		}
	}

	private renderInlineEditorFallback(
		containerEl: HTMLElement,
		path: string,
		statusEl: HTMLElement,
		value: string,
		disabled = false
	): HTMLTextAreaElement {
		const editorEl = containerEl.createEl("textarea", {
			cls: "baseboard-canvas-file__editor",
			attr: {
				"aria-label": this.t("view.editor.editPath", { path }),
				spellcheck: "false",
			},
		});
		editorEl.value = value;
		editorEl.dataset.baseboardOriginal = value;
		editorEl.disabled = disabled;
		if (disabled) {
			editorEl.setAttr("placeholder", this.t("view.editor.missingFile"));
		}

		this.addElementEvent(editorEl, "pointerdown", (event) => {
			event.stopPropagation();
		});
		this.addElementEvent(editorEl, "dblclick", (event) => {
			event.stopPropagation();
		});
		this.addElementEvent(editorEl, "input", () => {
			const original = editorEl.dataset.baseboardOriginal ?? "";
			const isDirty = editorEl.value !== original;
			editorEl.toggleClass("is-dirty", isDirty);
			containerEl.toggleClass("is-dirty", isDirty);
			statusEl.setText(isDirty ? this.t("view.editor.unsaved") : "");
		});
		this.addElementEvent(editorEl, "keydown", (event) => {
			event.stopPropagation();
			if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
				event.preventDefault();
				void this.saveInlineEditor(path, editorEl, statusEl);
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				editorEl.value = editorEl.dataset.baseboardOriginal ?? editorEl.value;
				editorEl.removeClass("is-dirty");
				containerEl.removeClass("is-dirty");
				statusEl.setText("");
				editorEl.blur();
			}
		});
		this.addElementEvent(editorEl, "blur", () => {
			void this.saveInlineEditor(path, editorEl, statusEl);
		});

		return editorEl;
	}

	private async loadInlineEditor(
		path: string,
		editorEl: HTMLTextAreaElement,
		statusEl: HTMLElement
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			editorEl.setAttr("placeholder", this.t("view.editor.missingFile"));
			statusEl.setText(this.t("view.editor.missing"));
			return;
		}

		try {
			const content = await this.app.vault.read(file);
			if (!editorEl.isConnected) return;
			editorEl.value = content;
			editorEl.dataset.baseboardOriginal = content;
			editorEl.disabled = false;
			editorEl.setAttr("placeholder", "");
			statusEl.setText("");
		} catch (error) {
			editorEl.setAttr("placeholder", this.t("view.editor.unableToLoad"));
			statusEl.setText(this.t("view.editor.error"));
			throw error;
		}
	}

	private async saveInlineEditor(
		path: string,
		editorEl: HTMLTextAreaElement,
		statusEl: HTMLElement
	): Promise<void> {
		if (editorEl.disabled) return;

		const original = editorEl.dataset.baseboardOriginal ?? "";
		if (editorEl.value === original) return;

		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			statusEl.setText(this.t("view.editor.missing"));
			return;
		}

		statusEl.setText(this.t("view.editor.saving"));
		await this.app.vault.modify(file, editorEl.value);
		editorEl.dataset.baseboardOriginal = editorEl.value;
		editorEl.removeClass("is-dirty");
		editorEl.parentElement?.removeClass("is-dirty");
		statusEl.setText(this.t("view.editor.saved"));

		window.setTimeout(() => {
			if (statusEl.isConnected && statusEl.getText() === this.t("view.editor.saved")) {
				statusEl.setText("");
			}
		}, 1500);
	}

	private saveInlineEditorState(nodeId: string): Promise<void> {
		const state = this.inlineEditors.get(nodeId);
		if (!state) return Promise.resolve();

		return this.saveInlineEditorValue(nodeId, state.editor.getValue());
	}

	private async saveInlineEditorValue(nodeId: string, value: string): Promise<void> {
		const state = this.inlineEditors.get(nodeId);
		if (!state || value === state.original) return;

		const file = this.app.vault.getAbstractFileByPath(state.path);
		if (!(file instanceof TFile)) {
			state.statusEl.setText(this.t("view.editor.missing"));
			return;
		}

		state.statusEl.setText(this.t("view.editor.saving"));
		await this.app.vault.modify(file, value);
		state.original = value;
		state.statusEl.setText(this.t("view.editor.saved"));
		const editorEl = state.statusEl.parentElement?.querySelector(
			".baseboard-canvas-file__markdown-editor"
		);
		if (editorEl instanceof HTMLElement) {
			editorEl.removeClass("is-dirty");
		}
		state.statusEl.parentElement
			?.querySelector(".baseboard-canvas-file__editor-shell")
			?.removeClass("is-dirty");

		window.setTimeout(() => {
			if (state.statusEl.isConnected && state.statusEl.getText() === this.t("view.editor.saved")) {
				state.statusEl.setText("");
			}
		}, 1500);
	}

	private destroyInlineEditor(nodeId: string, saveDirty: boolean): void {
		const state = this.inlineEditors.get(nodeId);
		if (!state) return;

		const value = state.editor.getValue();
		if (saveDirty && value !== state.original) {
			void this.saveInlineEditorValue(nodeId, value);
		}
		state.editor.destroy();
		this.inlineEditors.delete(nodeId);
	}

	private destroyAllInlineEditors(saveDirty: boolean): void {
		for (const nodeId of [...this.inlineEditors.keys()]) {
			this.destroyInlineEditor(nodeId, saveDirty);
		}
	}

	private renderCanvasControls(containerEl: HTMLElement): void {
		const controlsEl = containerEl.createDiv({ cls: "baseboard-canvas-controls" });
		this.addCanvasControlButton(controlsEl, "lucide-minus", this.t("view.tooltips.zoomOut"), () => {
			this.setZoom(this.zoom - ZOOM_STEP);
		});
		this.zoomLabelEl = controlsEl.createDiv({ cls: "baseboard-canvas-zoom-label" });
		this.addCanvasControlButton(controlsEl, "lucide-plus", this.t("view.tooltips.zoomIn"), () => {
			this.setZoom(this.zoom + ZOOM_STEP);
		});
		this.addCanvasControlButton(controlsEl, "lucide-maximize", this.t("view.tooltips.fitView"), () => {
			this.fitCanvasToViewport();
		});
		this.addCanvasControlButton(controlsEl, "lucide-locate-fixed", this.t("view.tooltips.resetView"), () => {
			this.resetCanvasView();
		});
	}

	private addCanvasControlButton(
		containerEl: HTMLElement,
		icon: string,
		label: string,
		onClick: () => void
	): void {
		const buttonEl = containerEl.createEl("button", {
			cls: "baseboard-canvas-control-button",
			attr: {
				"aria-label": label,
				type: "button",
			},
		});
		setIcon(buttonEl, icon);
		setTooltip(buttonEl, label);
		this.registerDomEvent(buttonEl, "pointerdown", (event) => {
			event.stopPropagation();
		});
		this.registerDomEvent(buttonEl, "click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			onClick();
		});
	}

	private addElementEvent<K extends keyof HTMLElementEventMap>(
		element: HTMLElement,
		type: K,
		listener: (event: HTMLElementEventMap[K]) => void
	): void {
		element.addEventListener(type, listener);
	}

	private addResizeHandle(containerEl: HTMLElement, tooltip: string): void {
		const handleEl = containerEl.createDiv({
			cls: "baseboard-canvas-resize-handle",
			attr: {
				"aria-label": tooltip,
			},
		});
		setTooltip(handleEl, tooltip);
	}

	private startLinkDrag(event: PointerEvent, sourcePath: string, sourceElement: HTMLElement): void {
		if (event.button !== 0 || !this.canvasPlaneEl || !this.canvasBounds) return;

		const sourcePoint = getElementCenter(sourceElement);
		if (!sourcePoint) return;

		event.preventDefault();
		event.stopPropagation();
		this.clearDragListeners();

		const previewEl = createSvgElement("svg");
		previewEl.addClass("baseboard-canvas-link-preview");
		setSvgAttributes(previewEl, {
			width: String(this.canvasBounds.width),
			height: String(this.canvasBounds.height),
			viewBox: `0 0 ${this.canvasBounds.width} ${this.canvasBounds.height}`,
		});
		const previewPathEl = createSvgElement("path");
		previewPathEl.addClass("baseboard-canvas-link-preview__path");
		previewEl.appendChild(previewPathEl);
		this.canvasPlaneEl.appendChild(previewEl);

		sourceElement.addClass("is-linking");
		this.linkDragState = {
			pointerId: event.pointerId,
			sourcePath,
			sourceElement,
			sourcePoint,
			previewEl,
			previewPathEl,
			targetElement: null,
			targetPath: null,
		};
		this.updateLinkPreview(event);
		this.updateLinkDragTarget(event);

		this.linkMoveHandler = (moveEvent) => this.handleLinkMove(moveEvent);
		this.linkEndHandler = (endEvent) => this.handleLinkEnd(endEvent);
		window.addEventListener("pointermove", this.linkMoveHandler);
		window.addEventListener("pointerup", this.linkEndHandler);
		window.addEventListener("pointercancel", this.linkEndHandler);
	}

	private handleLinkMove(event: PointerEvent): void {
		if (!this.linkDragState || event.pointerId !== this.linkDragState.pointerId) return;

		event.preventDefault();
		this.updateLinkPreview(event);
		this.updateLinkDragTarget(event);
	}

	private handleLinkEnd(event: PointerEvent): void {
		if (!this.linkDragState || event.pointerId !== this.linkDragState.pointerId) return;

		event.preventDefault();
		const sourcePath = this.linkDragState.sourcePath;
		const targetPath = this.linkDragState.targetPath;
		this.clearDragListeners();

		if (!targetPath || targetPath === sourcePath) return;

		this.openLinkCreationMenu(event, sourcePath, targetPath);
	}

	private updateLinkPreview(event: PointerEvent): void {
		if (!this.linkDragState) return;

		const targetPoint = this.getPlanePoint(event.clientX, event.clientY);
		if (!targetPoint) return;

		const source = this.linkDragState.sourcePoint;
		const controlOffset = Math.max(48, Math.abs(targetPoint.x - source.x) * 0.4);
		this.linkDragState.previewPathEl.setAttribute(
			"d",
			`M ${source.x} ${source.y} C ${source.x + controlOffset} ${source.y}, ${
				targetPoint.x - controlOffset
			} ${targetPoint.y}, ${targetPoint.x} ${targetPoint.y}`
		);
	}

	private updateLinkDragTarget(event: PointerEvent): void {
		if (!this.linkDragState) return;

		const target = this.getFileTargetAtPoint(event.clientX, event.clientY);
		const targetPath = target?.path === this.linkDragState.sourcePath ? null : target?.path ?? null;
		const targetElement = targetPath ? target?.element ?? null : null;

		if (this.linkDragState.targetElement !== targetElement) {
			this.linkDragState.targetElement?.removeClass("is-link-target");
			targetElement?.addClass("is-link-target");
		}

		this.linkDragState.targetElement = targetElement;
		this.linkDragState.targetPath = targetPath;
	}

	private getPlanePoint(clientX: number, clientY: number): LinkPoint | null {
		if (!this.canvasViewportEl) return null;

		const rect = this.canvasViewportEl.getBoundingClientRect();
		return {
			x: (this.canvasViewportEl.scrollLeft + clientX - rect.left) / this.zoom,
			y: (this.canvasViewportEl.scrollTop + clientY - rect.top) / this.zoom,
		};
	}

	private getFileTargetAtPoint(
		clientX: number,
		clientY: number
	): { element: HTMLElement; path: string } | null {
		const element = this.rootEl?.ownerDocument.elementFromPoint(clientX, clientY);
		const fileEl = element instanceof HTMLElement
			? element.closest(".baseboard-canvas-file")
			: null;
		if (!(fileEl instanceof HTMLElement)) return null;

		const nodeId = fileEl.getAttribute("data-baseboard-node-id");
		const path = nodeId ? this.canvasRenderState?.filePathsByNodeId.get(nodeId) : null;
		return path ? { element: fileEl, path } : null;
	}

	private startDrag(
		event: PointerEvent,
		nodeIds: string[],
		nodeElements: Map<string, HTMLElement>,
		nodePositions: Map<string, BaseboardNodePosition>
	): void {
		if (event.button !== 0) return;
		if (isNodeControlTarget(event.target)) return;

		const nodes = nodeIds
			.map((id) => {
				const element = nodeElements.get(id) ?? null;
				const startPosition = element
					? getElementNodePosition(element) ?? nodePositions.get(id)
					: nodePositions.get(id);
				if (!startPosition) return null;
				return { id, element, startPosition };
			})
			.filter((node): node is DragState["nodes"][number] => node !== null);

		if (nodes.length === 0) return;

		event.preventDefault();
		this.clearDragListeners();
		this.dragState = {
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			nodes,
		};

		for (const node of nodes) {
			node.element?.addClass("is-dragging");
		}

		this.dragMoveHandler = (moveEvent) => this.handleDragMove(moveEvent);
		this.dragEndHandler = (endEvent) => this.handleDragEnd(endEvent);
		window.addEventListener("pointermove", this.dragMoveHandler);
		window.addEventListener("pointerup", this.dragEndHandler);
		window.addEventListener("pointercancel", this.dragEndHandler);
	}

	private startResize(
		event: PointerEvent,
		nodeId: string,
		kind: CanvasNodeKind,
		element: HTMLElement,
		nodePositions: Map<string, BaseboardNodePosition>
	): void {
		if (event.button !== 0) return;

		const startPosition = getElementNodePosition(element) ?? nodePositions.get(nodeId);
		if (!startPosition) return;

		event.preventDefault();
		event.stopPropagation();
		this.clearDragListeners();

		const { minWidth, minHeight } = getResizeMinimums(kind);
		this.resizeState = {
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			id: nodeId,
			element,
			startPosition,
			minWidth,
			minHeight,
		};
		element.addClass("is-resizing");

		this.resizeMoveHandler = (moveEvent) => this.handleResizeMove(moveEvent);
		this.resizeEndHandler = (endEvent) => this.handleResizeEnd(endEvent);
		window.addEventListener("pointermove", this.resizeMoveHandler);
		window.addEventListener("pointerup", this.resizeEndHandler);
		window.addEventListener("pointercancel", this.resizeEndHandler);
	}

	private registerPanHandlers(viewportEl: HTMLElement): void {
		this.registerDomEvent(viewportEl, "pointerdown", (event) => {
			this.startPan(event, viewportEl);
		});
		this.registerDomEvent(viewportEl, "wheel", (event) => {
			if (!Keymap.isModEvent(event)) return;
			event.preventDefault();
			const direction = event.deltaY > 0 ? -1 : 1;
			this.setZoom(this.zoom + direction * ZOOM_STEP, {
				clientX: event.clientX,
				clientY: event.clientY,
			});
		});
	}

	private startPan(event: PointerEvent, viewportEl: HTMLElement): void {
		if (event.button !== 0 || isBoardInteractiveTarget(event.target)) return;

		event.preventDefault();
		this.clearDragListeners();
		this.panState = {
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startScrollLeft: viewportEl.scrollLeft,
			startScrollTop: viewportEl.scrollTop,
			viewportEl,
		};
		viewportEl.addClass("is-panning");
		this.panMoveHandler = (moveEvent) => this.handlePanMove(moveEvent);
		this.panEndHandler = (endEvent) => this.handlePanEnd(endEvent);
		window.addEventListener("pointermove", this.panMoveHandler);
		window.addEventListener("pointerup", this.panEndHandler);
		window.addEventListener("pointercancel", this.panEndHandler);
	}

	private handleDragMove(event: PointerEvent): void {
		if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;

		const deltaX = event.clientX - this.dragState.startClientX;
		const deltaY = event.clientY - this.dragState.startClientY;

		for (const node of this.dragState.nodes) {
			if (node.element) {
				setNodeGeometry(node.element, {
					...node.startPosition,
					x: clampCoordinate(node.startPosition.x + deltaX),
					y: clampCoordinate(node.startPosition.y + deltaY),
				});
			}
		}
		this.updateEdgeLayerGeometry();
	}

	private handleDragEnd(event: PointerEvent): void {
		if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;

		const deltaX = event.clientX - this.dragState.startClientX;
		const deltaY = event.clientY - this.dragState.startClientY;
		const nodePositions = this.getNodePositions();

		for (const node of this.dragState.nodes) {
			const nextPosition = {
				...node.startPosition,
				x: clampCoordinate(node.startPosition.x + deltaX),
				y: clampCoordinate(node.startPosition.y + deltaY),
			};
			nodePositions[node.id] = nextPosition;
			this.canvasRenderState?.nodePositions.set(node.id, nextPosition);
			node.element?.removeClass("is-dragging");
			if (node.element) {
				setNodeGeometry(node.element, nextPosition);
			}
		}

		this.setNodePositions(nodePositions);
		this.updateEdgeLayerGeometry();
		this.clearDragListeners();
	}

	private handleResizeMove(event: PointerEvent): void {
		if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) return;

		const nextPosition = this.getResizedPosition(
			event.clientX - this.resizeState.startClientX,
			event.clientY - this.resizeState.startClientY
		);
		setNodeGeometry(this.resizeState.element, nextPosition);
		this.updateEdgeLayerGeometry();
	}

	private handleResizeEnd(event: PointerEvent): void {
		if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) return;

		const nextPosition = this.getResizedPosition(
			event.clientX - this.resizeState.startClientX,
			event.clientY - this.resizeState.startClientY
		);
		const nodePositions = this.getNodePositions();
		nodePositions[this.resizeState.id] = nextPosition;
		this.canvasRenderState?.nodePositions.set(this.resizeState.id, nextPosition);
		this.resizeState.element.removeClass("is-resizing");
		setNodeGeometry(this.resizeState.element, nextPosition);
		this.setNodePositions(nodePositions);
		this.updateEdgeLayerGeometry();
		this.clearDragListeners();
	}

	private getResizedPosition(deltaX: number, deltaY: number): BaseboardNodePosition {
		if (!this.resizeState) {
			throw new Error("Baseboard resize state is not active.");
		}

		return {
			...this.resizeState.startPosition,
			width: Math.max(
				this.resizeState.minWidth,
				Math.round(this.resizeState.startPosition.width + deltaX)
			),
			height: Math.max(
				this.resizeState.minHeight,
				Math.round(this.resizeState.startPosition.height + deltaY)
			),
		};
	}

	private handlePanMove(event: PointerEvent): void {
		if (!this.panState || event.pointerId !== this.panState.pointerId) return;

		this.panState.viewportEl.scrollLeft =
			this.panState.startScrollLeft - (event.clientX - this.panState.startClientX);
		this.panState.viewportEl.scrollTop =
			this.panState.startScrollTop - (event.clientY - this.panState.startClientY);
		this.scheduleVirtualCanvasRender();
	}

	private handlePanEnd(event: PointerEvent): void {
		if (!this.panState || event.pointerId !== this.panState.pointerId) return;

		this.panState.viewportEl.removeClass("is-panning");
		this.clearDragListeners();
	}

	private setZoom(
		nextZoom: number,
		anchor?: { clientX: number; clientY: number }
	): void {
		const viewportEl = this.canvasViewportEl;
		const previousZoom = this.zoom;
		const zoom = clampZoom(nextZoom);
		if (zoom === previousZoom) return;

		let contentX: number | null = null;
		let contentY: number | null = null;
		let anchorX = 0;
		let anchorY = 0;

		if (viewportEl) {
			const rect = viewportEl.getBoundingClientRect();
			anchorX = anchor ? anchor.clientX - rect.left : viewportEl.clientWidth / 2;
			anchorY = anchor ? anchor.clientY - rect.top : viewportEl.clientHeight / 2;
			contentX = (viewportEl.scrollLeft + anchorX) / previousZoom;
			contentY = (viewportEl.scrollTop + anchorY) / previousZoom;
		}

		this.zoom = zoom;
		this.applyZoom();

		if (viewportEl && contentX !== null && contentY !== null) {
			viewportEl.scrollLeft = contentX * zoom - anchorX;
			viewportEl.scrollTop = contentY * zoom - anchorY;
		}
		this.scheduleVirtualCanvasRender();
	}

	private fitCanvasToViewport(): void {
		if (!this.canvasViewportEl || !this.canvasBounds) return;

		const widthRatio =
			(this.canvasViewportEl.clientWidth - FIT_VIEW_PADDING) / this.canvasBounds.width;
		const heightRatio =
			(this.canvasViewportEl.clientHeight - FIT_VIEW_PADDING) / this.canvasBounds.height;
		this.zoom = clampZoom(Math.min(widthRatio, heightRatio, 1));
		this.applyZoom();
		this.canvasViewportEl.scrollLeft = 0;
		this.canvasViewportEl.scrollTop = 0;
		this.scheduleVirtualCanvasRender();
	}

	private resetCanvasView(): void {
		this.zoom = 1;
		this.applyZoom();
		if (!this.canvasViewportEl) return;

		this.canvasViewportEl.scrollLeft = 0;
		this.canvasViewportEl.scrollTop = 0;
		this.scheduleVirtualCanvasRender();
	}

	private applyZoom(): void {
		if (!this.canvasWorldEl || !this.canvasPlaneEl || !this.canvasBounds) return;

		this.canvasWorldEl.style.setProperty(
			"width",
			`${Math.ceil(this.canvasBounds.width * this.zoom)}px`
		);
		this.canvasWorldEl.style.setProperty(
			"height",
			`${Math.ceil(this.canvasBounds.height * this.zoom)}px`
		);
		this.canvasPlaneEl.style.setProperty("transform", `scale(${this.zoom})`);
		this.zoomLabelEl?.setText(`${Math.round(this.zoom * 100)}%`);
	}

	private async resetLayout(): Promise<void> {
		if (!this.config) return;

		this.config.set(VIEW_CONFIG_KEYS.nodePositions, null);
		this.scheduleRender();
	}

	private getNodePositions(): BaseboardNodePositionMap {
		if (!this.config) return {};

		return normalizeNodePositions(this.config.get(VIEW_CONFIG_KEYS.nodePositions));
	}

	private setNodePositions(positions: BaseboardNodePositionMap): void {
		if (!this.config) return;

		this.config.set(VIEW_CONFIG_KEYS.nodePositions, positions);
	}

	private hasVisibleFile(path: string): boolean {
		const snapshot = this.getSnapshot();
		if (!snapshot) return false;

		return snapshot.groups.some((group) =>
			group.entries.some((entry) => entry.path === path)
		);
	}

	private clearDragListeners(): void {
		if (this.dragMoveHandler) {
			window.removeEventListener("pointermove", this.dragMoveHandler);
			this.dragMoveHandler = null;
		}
		if (this.dragEndHandler) {
			window.removeEventListener("pointerup", this.dragEndHandler);
			window.removeEventListener("pointercancel", this.dragEndHandler);
			this.dragEndHandler = null;
		}
		if (this.resizeMoveHandler) {
			window.removeEventListener("pointermove", this.resizeMoveHandler);
			this.resizeMoveHandler = null;
		}
		if (this.resizeEndHandler) {
			window.removeEventListener("pointerup", this.resizeEndHandler);
			window.removeEventListener("pointercancel", this.resizeEndHandler);
			this.resizeEndHandler = null;
		}
		if (this.panMoveHandler) {
			window.removeEventListener("pointermove", this.panMoveHandler);
			this.panMoveHandler = null;
		}
		if (this.panEndHandler) {
			window.removeEventListener("pointerup", this.panEndHandler);
			window.removeEventListener("pointercancel", this.panEndHandler);
			this.panEndHandler = null;
		}
		if (this.linkMoveHandler) {
			window.removeEventListener("pointermove", this.linkMoveHandler);
			this.linkMoveHandler = null;
		}
		if (this.linkEndHandler) {
			window.removeEventListener("pointerup", this.linkEndHandler);
			window.removeEventListener("pointercancel", this.linkEndHandler);
			this.linkEndHandler = null;
		}
		for (const node of this.dragState?.nodes ?? []) {
			node.element?.removeClass("is-dragging");
		}
		this.resizeState?.element.removeClass("is-resizing");
		this.panState?.viewportEl.removeClass("is-panning");
		this.linkDragState?.sourceElement.removeClass("is-linking");
		this.linkDragState?.targetElement?.removeClass("is-link-target");
		this.linkDragState?.previewEl.remove();
		this.dragState = null;
		this.resizeState = null;
		this.panState = null;
		this.linkDragState = null;
	}

	notifyUnavailable(): void {
		new Notice(this.t("notices.openBaseboardViewFirst"));
	}
}

class PropertyLinkSuggestModal extends FuzzySuggestModal<string> {
	private readonly properties: string[];
	private readonly onChoose: (property: string) => void;

	constructor(app: App, properties: string[], t: TranslateFn, onChoose: (property: string) => void) {
		super(app);
		this.properties = properties;
		this.onChoose = onChoose;
		this.setPlaceholder(t("view.suggest.propertyPlaceholder"));
		this.emptyStateText = t("view.suggest.noMatchingProperties");
	}

	getItems(): string[] {
		return this.properties;
	}

	getItemText(item: string): string {
		return item;
	}

	onChooseItem(item: string): void {
		this.onChoose(item);
	}
}

class ManualNoteSuggestModal extends FuzzySuggestModal<TFile> {
	private readonly appRef: App;
	private readonly unavailablePaths: Set<string>;
	private readonly onChoose: (file: TFile) => void;

	constructor(app: App, unavailablePaths: Set<string>, t: TranslateFn, onChoose: (file: TFile) => void) {
		super(app);
		this.appRef = app;
		this.unavailablePaths = unavailablePaths;
		this.onChoose = onChoose;
		this.setPlaceholder(t("view.suggest.notePlaceholder"));
		this.emptyStateText = t("view.suggest.noMatchingNotes");
	}

	getItems(): TFile[] {
		return this.appRef.vault
			.getMarkdownFiles()
			.filter((file) => !this.unavailablePaths.has(file.path));
	}

	getItemText(item: TFile): string {
		return item.path;
	}

	onChooseItem(item: TFile): void {
		this.onChoose(item);
	}
}

export function buildBaseboardViewOptions(t: TranslateFn): BasesAllOptions[] {
	return [
		{
			type: "group",
			displayName: t("basesOptions.canvas"),
			items: [
				{
					type: "text",
					key: VIEW_CONFIG_KEYS.canvasPath,
					displayName: t("basesOptions.canvasPath"),
					placeholder: "Baseboards/My View.canvas",
					default: "",
				},
				{
					type: "dropdown",
					key: VIEW_CONFIG_KEYS.layout,
					displayName: t("basesOptions.layout"),
					default: "columns",
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
					default: "none",
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
					default: "",
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
					default: true,
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
					default: "auto",
					options: {
						auto: t("common.automatic"),
						off: t("common.off"),
					},
				},
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.taskNotesShowBadges,
					displayName: t("basesOptions.showTaskBadges"),
					default: true,
				},
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.taskNotesShowActions,
					displayName: t("basesOptions.showTaskActions"),
					default: true,
				},
				{
					type: "dropdown",
					key: VIEW_CONFIG_KEYS.taskNotesRelationships,
					displayName: t("basesOptions.taskRelationshipEdges"),
					default: "dependencies",
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
					default: true,
				},
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.removeMissingNodes,
					displayName: t("basesOptions.removeMissingNotes"),
					default: true,
				},
				{
					type: "slider",
					key: VIEW_CONFIG_KEYS.nodeWidth,
					displayName: t("basesOptions.nodeWidth"),
					default: 260,
					min: 160,
					max: 520,
					step: 20,
				},
				{
					type: "slider",
					key: VIEW_CONFIG_KEYS.nodeHeight,
					displayName: t("basesOptions.nodeHeight"),
					default: 110,
					min: 80,
					max: 320,
					step: 10,
				},
			],
		},
	];
}

function getStringConfig(config: BasesViewConfig, key: string): string | null {
	const value = config.get(key);
	return typeof value === "string" ? value : null;
}

function getBooleanConfig(
	config: BasesViewConfig,
	key: string,
	fallback: boolean
): boolean {
	const value = config.get(key);
	return typeof value === "boolean" ? value : fallback;
}

function createTextCardId(): string {
	return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mergeCanvasEdges(...edgeGroups: CanvasEdge[][]): CanvasEdge[] {
	const edges = new Map<string, CanvasEdge>();

	for (const edge of edgeGroups.flat()) {
		edges.set(edge.id, edge);
	}

	return [...edges.values()];
}

function buildEdgeRelationshipMap(
	relationships: BaseboardRelationship[]
): Map<string, BaseboardRelationship> {
	const map = new Map<string, BaseboardRelationship>();
	for (const relationship of relationships) {
		map.set(getRelationshipEdgeId(relationship), relationship);
	}

	return map;
}

function mergeEdgeRelationshipMaps(
	...maps: Array<Map<string, BaseboardRelationship>>
): Map<string, BaseboardRelationship> {
	const merged = new Map<string, BaseboardRelationship>();
	for (const map of maps) {
		for (const [edgeId, relationship] of map) {
			merged.set(edgeId, relationship);
		}
	}

	return merged;
}

function isRemovableRelationship(relationship: BaseboardRelationship): boolean {
	return (
		relationship.metadata?.source === "property" ||
		relationship.metadata?.source === "tasknotes"
	);
}

function isTaskDependencyRelationship(
	relationship: BaseboardRelationship,
	blockedPath: string,
	dependencyUid: string
): boolean {
	return (
		relationship.metadata?.source === "tasknotes" &&
		relationship.metadata.kind === "dependency" &&
		relationship.metadata.blockedPath === blockedPath &&
		relationship.metadata.dependencyUid === dependencyUid
	);
}

function isTaskProjectRelationship(
	relationship: BaseboardRelationship,
	childPath: string,
	parentPath: string
): boolean {
	return (
		relationship.metadata?.source === "tasknotes" &&
		relationship.metadata.kind === "project" &&
		relationship.metadata.childPath === childPath &&
		relationship.metadata.parentPath === parentPath
	);
}

function getTaskEdgeCacheKey(
	snapshot: BaseboardViewSnapshot,
	options: MaterializeOptions
): string | null {
	if (options.taskNotesMode === "off" || options.taskNotesRelationships === "none") {
		return null;
	}

	const paths = snapshot.groups
		.flatMap((group) => group.entries.map((entry) => entry.path))
		.sort();

	return [options.taskNotesRelationships, ...paths].join("\u0000");
}

function applyStoredNodePositions(
	snapshot: BaseboardViewSnapshot,
	positions: BaseboardNodePositionMap
): BaseboardViewSnapshot {
	return {
		...snapshot,
		groups: snapshot.groups.map((group) => ({
			...group,
			position: positions[group.id],
			entries: group.entries.map((entry) => ({
				...entry,
				position: positions[getFileNodeId(entry.path)],
			})),
		})),
		textCards: snapshot.textCards.map((card) => ({
			...card,
			position: positions[getTextCardNodeId(card.id)],
		})),
	};
}

function normalizeNodePositions(value: unknown): BaseboardNodePositionMap {
	if (!isRecord(value)) return {};

	const positions: BaseboardNodePositionMap = {};
	for (const [id, position] of Object.entries(value)) {
		if (typeof id !== "string" || !isRecord(position)) continue;

		const normalized = normalizeNodePosition(position);
		if (normalized) {
			positions[id] = normalized;
		}
	}

	return positions;
}

function normalizeNodePosition(value: Record<string, unknown>): BaseboardNodePosition | null {
	const x = normalizeCoordinate(value.x);
	const y = normalizeCoordinate(value.y);
	const width = normalizeSize(value.width);
	const height = normalizeSize(value.height);

	if (x === null || y === null || width === null || height === null) return null;

	return { x, y, width, height };
}

function normalizeCoordinate(value: unknown): number | null {
	const numericValue = Number(value);
	if (!Number.isFinite(numericValue)) return null;
	return clampCoordinate(numericValue);
}

function normalizeSize(value: unknown): number | null {
	const numericValue = Number(value);
	if (!Number.isFinite(numericValue)) return null;
	return Math.max(48, Math.round(numericValue));
}

function clampCoordinate(value: number): number {
	return Math.max(MIN_NODE_COORDINATE, Math.round(value));
}

function isRenderableCanvasNode(node: CanvasNode): node is CanvasRenderableNode {
	return node.type === "file" || node.type === "group" || node.type === "text";
}

function getCanvasNodePosition(node: CanvasRenderableNode): BaseboardNodePosition {
	return {
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height,
	};
}

function applyCanvasNodePosition<TNode extends CanvasRenderableNode>(
	node: TNode,
	position: BaseboardNodePosition | undefined
): TNode {
	return position ? { ...node, ...position } : node;
}

function setNodeGeometry(element: HTMLElement, position: BaseboardNodePosition): void {
	element.style.setProperty("left", `${position.x}px`);
	element.style.setProperty("top", `${position.y}px`);
	element.style.setProperty("width", `${position.width}px`);
	element.style.setProperty("height", `${position.height}px`);
}

function getElementNodePosition(element: HTMLElement): BaseboardNodePosition | null {
	const x = getElementPixelStyle(element, "left");
	const y = getElementPixelStyle(element, "top");
	const width = getElementPixelStyle(element, "width");
	const height = getElementPixelStyle(element, "height");
	if (x === null || y === null || width === null || height === null) return null;

	return { x, y, width, height };
}

function getElementCenter(element: HTMLElement): LinkPoint | null {
	const position = getElementNodePosition(element);
	if (!position) return null;

	return {
		x: position.x + position.width / 2,
		y: position.y + position.height / 2,
	};
}

function getElementPixelStyle(
	element: HTMLElement,
	property: "left" | "top" | "width" | "height"
): number | null {
	const value = Number.parseFloat(element.style.getPropertyValue(property));
	return Number.isFinite(value) ? value : null;
}

function getCanvasNodeKind(element: HTMLElement): CanvasNodeKind | null {
	const kind = element.getAttribute("data-baseboard-node-kind");
	return kind === "file" || kind === "group" || kind === "text" ? kind : null;
}

function getResizeMinimums(kind: CanvasNodeKind): { minWidth: number; minHeight: number } {
	if (kind === "group") {
		return {
			minWidth: MIN_GROUP_NODE_WIDTH,
			minHeight: MIN_GROUP_NODE_HEIGHT,
		};
	}

	if (kind === "text") {
		return {
			minWidth: MIN_TEXT_NODE_WIDTH,
			minHeight: MIN_TEXT_NODE_HEIGHT,
		};
	}

	return {
		minWidth: MIN_FILE_NODE_WIDTH,
		minHeight: MIN_FILE_NODE_HEIGHT,
	};
}

function clampZoom(value: number): number {
	return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

function formatPathName(path: string): string {
	return path.split("/").pop()?.replace(/\.md$/iu, "") || path;
}

function createNoteWikiLink(path: string): string {
	return `[[${path.replace(/\.md$/iu, "")}]]`;
}

function toFrontmatterPropertyName(propertyId: string): string | null {
	const property = propertyId.trim();
	if (!property || property.startsWith("file.") || property.startsWith("task.")) return null;

	return property.replace(/^(note\.|properties\.)/iu, "");
}

function appendPropertyLinkValue(
	value: unknown,
	link: string,
	containsTarget: (value: unknown) => boolean
): unknown {
	if (containsTarget(value)) return value;

	if (typeof value === "undefined" || value === null || value === "") {
		return link;
	}

	if (Array.isArray(value)) {
		return [...value, link];
	}

	return [value, link];
}

function removePropertyLinkValue(
	value: unknown,
	matchesTarget: (value: unknown) => boolean
): unknown {
	if (Array.isArray(value)) {
		const nextValue = value.filter((entry) => !matchesTarget(entry));
		return nextValue.length > 0 ? nextValue : undefined;
	}

	return matchesTarget(value) ? undefined : value;
}

function extractReferenceCandidates(value: unknown): string[] {
	if (typeof value === "string") return [value];

	if (Array.isArray(value)) {
		return value.flatMap(extractReferenceCandidates);
	}

	if (isRecord(value)) {
		return [value.path, value.file, value.link, value.uid].filter(
			(candidate): candidate is string => typeof candidate === "string"
		);
	}

	return [];
}

function normalizeLinkText(value: string): string {
	return value
		.trim()
		.replace(/^\[\[/u, "")
		.replace(/\]\]$/u, "")
		.split("|")[0]
		.split("#")[0]
		.trim();
}

function taskReferencePathCandidates(path: string): string[] {
	const normalizedPath = path.trim().replace(/\\/gu, "/");
	if (!normalizedPath) return [];

	return /\.md$/iu.test(normalizedPath) ? [normalizedPath] : [normalizedPath, `${normalizedPath}.md`];
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function isNodeControlTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		Boolean(
			target.closest(
				[
					".baseboard-canvas-control-button",
					".baseboard-canvas-resize-handle",
					".baseboard-canvas-card-action",
					".baseboard-canvas-link-handle",
					".baseboard-canvas-file__editor",
					".baseboard-canvas-text-card__editor",
				].join(", ")
			)
		)
	);
}

function isBoardInteractiveTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		Boolean(
			target.closest(
				[
					".baseboard-canvas-file",
					".baseboard-canvas-group",
					".baseboard-canvas-text-card",
					".baseboard-canvas-control-button",
				].join(", ")
			)
		)
	);
}

function getCanvasBounds(nodes: CanvasRenderableNode[]): { width: number; height: number } {
	const right = Math.max(0, ...nodes.map((node) => node.x + node.width));
	const bottom = Math.max(0, ...nodes.map((node) => node.y + node.height));

	return {
		width: Math.max(MIN_CANVAS_WIDTH, right + CANVAS_PADDING),
		height: Math.max(MIN_CANVAS_HEIGHT, bottom + CANVAS_PADDING),
	};
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
	tagName: K
): SVGElementTagNameMap[K] {
	return activeDocument.createElementNS(SVG_NAMESPACE, tagName);
}

function setSvgAttributes(
	element: SVGElement,
	attributes: Record<string, string>
): void {
	for (const [key, value] of Object.entries(attributes)) {
		element.setAttribute(key, value);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
