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
	BaseboardTextCardSnapshot,
	BaseboardViewSnapshot,
	MaterializeOptions,
} from "../types";
import { buildBaseboardSnapshot } from "./snapshot";
import type { BasesViewAction } from "./actions";
import {
	buildBaseboardCanvas,
	getFileNodeId,
	getTextCardNodeId,
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
	private canvasViewportEl: HTMLElement | null = null;
	private canvasWorldEl: HTMLElement | null = null;
	private canvasPlaneEl: HTMLElement | null = null;
	private zoomLabelEl: HTMLElement | null = null;
	private edgeLayerEl: SVGSVGElement | null = null;
	private canvasNodeElements = new Map<string, HTMLElement>();
	private renderedEdges: RenderedBaseboardEdge[] = [];
	private canvasBounds: { width: number; height: number } | null = null;
	private canvasRenderState: CanvasRenderState | null = null;
	private taskEdgeCache: { key: string; edges: CanvasEdge[] } | null = null;
	private zoom = 1;
	private renderFrame: number | null = null;
	private virtualRenderFrame: number | null = null;
	private dragMoveHandler: ((event: PointerEvent) => void) | null = null;
	private dragEndHandler: ((event: PointerEvent) => void) | null = null;
	private resizeMoveHandler: ((event: PointerEvent) => void) | null = null;
	private resizeEndHandler: ((event: PointerEvent) => void) | null = null;
	private panMoveHandler: ((event: PointerEvent) => void) | null = null;
	private panEndHandler: ((event: PointerEvent) => void) | null = null;
	private renderToken = 0;

	constructor(controller: QueryController, containerEl: HTMLElement, plugin: BaseboardPlugin) {
		super(controller);
		this.plugin = plugin;
		this.containerEl = containerEl;
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
			this.config?.name ?? "Baseboard",
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
				name: "Create canvas from view",
				icon: "lucide-layout-dashboard",
				callback: () => {
					void this.plugin.configureAndMaterialize(this);
				},
			},
			{
				name: "Update linked canvas",
				icon: "lucide-refresh-cw",
				callback: () => {
					void this.plugin.materializeWithSavedOptions(this);
				},
			},
			{
				name: "Open linked canvas",
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
		rootEl.empty();
		this.clearCanvasReferences();
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
			text: snapshot?.viewName || "Baseboard",
		});
		summaryEl.createDiv({
			cls: "baseboard-view__meta",
			text: snapshot ? formatSnapshotMeta(snapshot) : "Waiting for Bases data",
		});

		const actionsEl = toolbarEl.createDiv({ cls: "baseboard-view__actions" });
		this.addToolbarButton(actionsEl, {
			icon: "lucide-file-plus",
			label: "Pin note",
			onClick: () => this.openManualNotePicker(),
			isPrimary: false,
		});
		this.addToolbarButton(actionsEl, {
			icon: "lucide-sticky-note",
			label: "Add card",
			onClick: () => this.addTextCard(),
			isPrimary: false,
		});
		this.addToolbarButton(actionsEl, {
			icon: "lucide-layout-dashboard",
			label: "Create canvas",
			onClick: () => this.plugin.configureAndMaterialize(this),
			isPrimary: !this.getCanvasPath(),
		});
		this.addToolbarButton(actionsEl, {
			icon: "lucide-refresh-cw",
			label: "Update canvas",
			onClick: () => this.plugin.materializeWithSavedOptions(this),
			isPrimary: Boolean(this.getCanvasPath()),
		});
		this.addToolbarButton(actionsEl, {
			icon: "lucide-panel-top-open",
			label: "Open canvas",
			onClick: () => this.plugin.openLinkedCanvas(this),
			isPrimary: false,
		});
		this.addToolbarButton(actionsEl, {
			icon: "lucide-rotate-ccw",
			label: "Reset layout",
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
		emptyEl.createDiv({ cls: "baseboard-view__empty-title", text: "No notes in this view" });
		emptyEl.createDiv({
			cls: "baseboard-view__empty-text",
			text: "Change the Base filters, pin a note, or add a card.",
		});
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

		new ManualNoteSuggestModal(this.app, unavailablePaths, (file) => {
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
		const relationships = collectRelationships(this.app, snapshot, options);
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
		const initialEdges = mergeCanvasEdges(genericEdges, cachedTaskEdges);
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
		};
		this.renderVirtualCanvas();
		this.renderCanvasControls(containerEl);
		this.registerPanHandlers(viewportEl);
		this.registerDomEvent(viewportEl, "scroll", () => {
			this.scheduleVirtualCanvasRender();
		});
		this.applyZoom();
		void this.hydrateTaskNotes(snapshot, options, renderToken, planeEl, genericEdges, bounds);
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
			this.startDrag(event, dragNodeIds, this.canvasNodeElements, state.nodePositions);
		});

		const handleEl = element.querySelector(".baseboard-canvas-resize-handle");
		if (!(handleEl instanceof HTMLElement) || !kind) return;

		this.addElementEvent(handleEl, "pointerdown", (event) => {
			this.startResize(event, nodeId, kind, element, state.nodePositions);
		});
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
		setTooltip(headerEl, "Drag group");
		this.addResizeHandle(groupEl, "Resize group");

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
		setTooltip(fileEl, "Drag note. Double-click to open.");
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
				text: "Pinned",
			});
		}
		this.renderCardActionButton(headerEl, "Note actions", (event) => {
			void this.openFileCardMenu(event, node.file, entry);
		});
		fileEl.createDiv({
			cls: "baseboard-canvas-file__path",
			text: node.file,
		});
		this.renderCardProperties(fileEl, entry);
		if (showBodyEditor) {
			this.renderInlineEditor(fileEl, node.file);
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
		this.addResizeHandle(fileEl, "Resize card");

		return fileEl;
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
		setTooltip(textEl, "Drag card");

		const headerEl = textEl.createDiv({ cls: "baseboard-canvas-text-card__header" });
		setIcon(headerEl.createSpan({ cls: "baseboard-canvas-text-card__icon" }), "lucide-sticky-note");
		headerEl.createDiv({
			cls: "baseboard-canvas-text-card__title",
			text: "Card",
		});
		this.renderCardActionButton(headerEl, "Card actions", (event) => {
			this.openTextCardMenu(event, card);
		});

		const editorEl = textEl.createEl("textarea", {
			cls: "baseboard-canvas-text-card__editor",
			attr: {
				"aria-label": "Edit card",
				placeholder: "Write a note",
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
		this.addResizeHandle(textEl, "Resize card");

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
		const taskActionsAdded =
			this.getMaterializeOptions().taskNotesMode !== "off" &&
			this.getMaterializeOptions().taskNotesShowActions &&
			(await this.plugin.taskNotes.populateTaskMenu(menu, path, () => this.scheduleRender()));
		if (taskActionsAdded) {
			menu.addSeparator();
		}

		menu.addItem((item) => {
			item
				.setTitle("Open note")
				.setIcon("lucide-file-text")
				.onClick(() => {
					void this.app.workspace.openLinkText(path, "", Keymap.isModEvent(event));
				});
		});

		if (entry?.isManual) {
			menu.addSeparator();
			menu.addItem((item) => {
				item
					.setTitle("Unpin from board")
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
				.setTitle("Remove card")
				.setIcon("lucide-trash-2")
				.setWarning(true)
				.setDisabled(!card)
				.onClick(() => {
					if (card) this.removeTextCard(card.id);
				});
		});
		menu.showAtMouseEvent(event);
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
		this.taskEdgeCache = taskEdgeCacheKey ? { key: taskEdgeCacheKey, edges: taskEdges } : null;
		const mergedEdges = mergeCanvasEdges(genericEdges, taskEdges);
		if (this.canvasRenderState?.planeEl === planeEl) {
			this.canvasRenderState.allEdges = mergedEdges;
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

	private renderInlineEditor(containerEl: HTMLElement, path: string): void {
		const editorEl = containerEl.createEl("textarea", {
			cls: "baseboard-canvas-file__editor",
			attr: {
				"aria-label": `Edit ${path}`,
				spellcheck: "false",
			},
		});
		const statusEl = containerEl.createDiv({ cls: "baseboard-canvas-file__status" });
		editorEl.disabled = true;
		editorEl.setAttr("placeholder", "Loading");

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
			statusEl.setText(isDirty ? "Unsaved" : "");
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
				statusEl.setText("");
				editorEl.blur();
			}
		});
		this.addElementEvent(editorEl, "blur", () => {
			void this.saveInlineEditor(path, editorEl, statusEl);
		});

		void this.loadInlineEditor(path, editorEl, statusEl);
	}

	private async loadInlineEditor(
		path: string,
		editorEl: HTMLTextAreaElement,
		statusEl: HTMLElement
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			editorEl.setAttr("placeholder", "Missing file");
			statusEl.setText("Missing");
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
			editorEl.setAttr("placeholder", "Unable to load");
			statusEl.setText("Error");
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
			statusEl.setText("Missing");
			return;
		}

		statusEl.setText("Saving");
		await this.app.vault.modify(file, editorEl.value);
		editorEl.dataset.baseboardOriginal = editorEl.value;
		editorEl.removeClass("is-dirty");
		statusEl.setText("Saved");

		window.setTimeout(() => {
			if (statusEl.isConnected && statusEl.getText() === "Saved") {
				statusEl.setText("");
			}
		}, 1500);
	}

	private renderCanvasControls(containerEl: HTMLElement): void {
		const controlsEl = containerEl.createDiv({ cls: "baseboard-canvas-controls" });
		this.addCanvasControlButton(controlsEl, "lucide-minus", "Zoom out", () => {
			this.setZoom(this.zoom - ZOOM_STEP);
		});
		this.zoomLabelEl = controlsEl.createDiv({ cls: "baseboard-canvas-zoom-label" });
		this.addCanvasControlButton(controlsEl, "lucide-plus", "Zoom in", () => {
			this.setZoom(this.zoom + ZOOM_STEP);
		});
		this.addCanvasControlButton(controlsEl, "lucide-maximize", "Fit view", () => {
			this.fitCanvasToViewport();
		});
		this.addCanvasControlButton(controlsEl, "lucide-locate-fixed", "Reset view", () => {
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
		for (const node of this.dragState?.nodes ?? []) {
			node.element?.removeClass("is-dragging");
		}
		this.resizeState?.element.removeClass("is-resizing");
		this.panState?.viewportEl.removeClass("is-panning");
		this.dragState = null;
		this.resizeState = null;
		this.panState = null;
	}

	notifyUnavailable(): void {
		new Notice("Open a baseboard view first.");
	}
}

class ManualNoteSuggestModal extends FuzzySuggestModal<TFile> {
	private readonly appRef: App;
	private readonly unavailablePaths: Set<string>;
	private readonly onChoose: (file: TFile) => void;

	constructor(app: App, unavailablePaths: Set<string>, onChoose: (file: TFile) => void) {
		super(app);
		this.appRef = app;
		this.unavailablePaths = unavailablePaths;
		this.onChoose = onChoose;
		this.setPlaceholder("Pin a note to this board");
		this.emptyStateText = "No matching notes";
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

export function buildBaseboardViewOptions(): BasesAllOptions[] {
	return [
		{
			type: "group",
			displayName: "Canvas",
			items: [
				{
					type: "text",
					key: VIEW_CONFIG_KEYS.canvasPath,
					displayName: "Canvas path",
					placeholder: "Baseboards/My View.canvas",
					default: "",
				},
				{
					type: "dropdown",
					key: VIEW_CONFIG_KEYS.layout,
					displayName: "Layout",
					default: "columns",
					options: {
						columns: "Grouped columns",
						rows: "Grouped rows",
						grid: "Grid",
					},
				},
				{
					type: "dropdown",
					key: VIEW_CONFIG_KEYS.edgeMode,
					displayName: "Edges",
					default: "none",
					options: {
						none: "None",
						wikilinks: "Links within view",
						properties: "Selected properties",
						all: "Links and selected properties",
					},
				},
				{
					type: "text",
					key: VIEW_CONFIG_KEYS.edgeProperties,
					displayName: "Link properties",
					placeholder: "depends_on, related",
					default: "",
				},
			],
		},
		{
			type: "group",
			displayName: "Cards",
			items: [
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.showBodyEditor,
					displayName: "Show body editor",
					default: true,
				},
			],
		},
		{
			type: "group",
			displayName: "TaskNotes",
			items: [
				{
					type: "dropdown",
					key: VIEW_CONFIG_KEYS.taskNotesMode,
					displayName: "TaskNotes integration",
					default: "auto",
					options: {
						auto: "Automatic",
						off: "Off",
					},
				},
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.taskNotesShowBadges,
					displayName: "Show task badges",
					default: true,
				},
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.taskNotesShowActions,
					displayName: "Show task actions",
					default: true,
				},
				{
					type: "dropdown",
					key: VIEW_CONFIG_KEYS.taskNotesRelationships,
					displayName: "Task relationship edges",
					default: "dependencies",
					options: {
						none: "None",
						dependencies: "Dependencies",
						all: "Dependencies and subtasks",
					},
				},
			],
		},
		{
			type: "group",
			displayName: "Manual cards",
			items: [
				{
					type: "multitext",
					key: VIEW_CONFIG_KEYS.manualNotePaths,
					displayName: "Pinned notes",
					default: [],
				},
			],
		},
		{
			type: "group",
			displayName: "Update rules",
			items: [
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.preservePositions,
					displayName: "Preserve positions",
					default: true,
				},
				{
					type: "toggle",
					key: VIEW_CONFIG_KEYS.removeMissingNodes,
					displayName: "Remove missing notes",
					default: true,
				},
				{
					type: "slider",
					key: VIEW_CONFIG_KEYS.nodeWidth,
					displayName: "Node width",
					default: 260,
					min: 160,
					max: 520,
					step: 20,
				},
				{
					type: "slider",
					key: VIEW_CONFIG_KEYS.nodeHeight,
					displayName: "Node height",
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

function formatSnapshotMeta(snapshot: BaseboardViewSnapshot): string {
	return [
		formatCount(snapshot.totalEntries, "note"),
		formatCount(snapshot.groups.length, "group"),
		snapshot.textCards.length > 0 ? formatCount(snapshot.textCards.length, "card") : null,
	]
		.filter((part): part is string => part !== null)
		.join(", ");
}

function formatCount(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? "" : "s"}`;
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

function isNodeControlTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		Boolean(
			target.closest(
				[
					".baseboard-canvas-control-button",
					".baseboard-canvas-resize-handle",
					".baseboard-canvas-card-action",
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
