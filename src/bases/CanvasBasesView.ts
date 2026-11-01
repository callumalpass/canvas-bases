import {
	BasesView,
	type RenderContext,
	ButtonComponent,
	FuzzySuggestModal,
	Keymap,
	Menu,
	Modal,
	Notice,
	Setting,
	TFile,
	debounce,
	setIcon,
	setTooltip,
} from "obsidian";
import type {
	App,
	BasesViewConfig,
	DropdownComponent,
	QueryController,
	TextComponent,
} from "obsidian";
import type CanvasBasesPlugin from "../plugin";
import { CANVAS_BASES_VIEW_TYPE, VIEW_CONFIG_KEYS } from "../constants";
import type {
	CanvasBasesEntryPropertySnapshot,
	CanvasBasesEntrySnapshot,
	CanvasBasesGroupSnapshot,
	CanvasBasesManualGroupSnapshot,
	CanvasBasesNodePosition,
	CanvasBasesNodePositionMap,
	CanvasBasesRelationship,
	CanvasBasesTextCardSnapshot,
	CanvasBasesViewSnapshot,
	CanvasBasesZoneAction,
	CanvasBasesZoneConfig,
	CanvasBasesZoneUpdateMode,
	CanvasBasesZoneValueType,
	MaterializeOptions,
} from "../types";
import { buildCanvasBasesSnapshot } from "./snapshot";
import {
	getCanvasBasesFileExtension,
	getCanvasBasesFileIcon,
	getCanvasBasesFileKind,
	isCanvasBasesMarkdownFile,
	type CanvasBasesFileKind,
} from "./fileCards";
import type { BasesViewAction } from "./actions";
import {
	getCanvasNodeCssColor,
	normalizeCanvasNodeColor,
} from "../canvas/colors";
import {
	buildCanvasBasesCanvas,
	getFileNodeId,
	getManualGroupNodeId,
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
import { collectRelationships, normalizeLinkText } from "../canvas/relationships";
import { buildCanvasBasesEdgeGeometry } from "./edgeGeometry";
import {
	applyManualViewItems,
	createDefaultManualGroup,
	normalizeManualGroups,
	normalizeManualNotePaths,
	normalizeTextCards,
	setManualGroups,
	setManualNotePaths,
	setTextCards,
} from "./manualItems";
import {
	DEFAULT_ZONE_LABEL,
	DEFAULT_ZONE_ACTION,
	DEFAULT_ZONE_UPDATE_MODE,
	DEFAULT_ZONE_VALUE_TYPE,
	ZONE_UPDATE_MODES,
	ZONE_VALUE_TYPES,
	getZoneKey,
	normalizeZoneColor,
	normalizeZoneAction,
	normalizeZoneProperty,
	normalizeZoneUpdateMode,
	normalizeZoneValueType,
	normalizeZones,
	setZones,
} from "./zones";
import { applyActiveGroupUpdate } from "./activeGroupUpdates";
import { getPlanePointFromClient } from "./coordinates";
import {
	getSnapshotEntriesByPath,
	getSnapshotPaths,
} from "./snapshotEntries";
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
import { getBoardPointerAction } from "./boardPointer";
import type { CanvasBasesTaskCard, CanvasBasesTaskPropertyKind } from "../tasknotes/runtime";
import type { InterpolationValues, TranslateFn } from "../i18n";
import {
	createCanvasBasesInlineMarkdownEditor,
	type CanvasBasesInlineMarkdownEditor,
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
const GROUP_HEADER_HEIGHT = 42;
const GROUP_PADDING = 18;
const NODE_GAP = 16;
const DEFAULT_ACTIVE_GROUP_COLOR = "#8b5cf6";
const DEFAULT_CARD_COLOR = "#8b5cf6";
const CARD_COLOR_SWATCHES = ["1", "2", "3", "4", "5", "6"] as const;
const ZONE_COLOR_SWATCHES = [
	"#e93147",
	"#ec7500",
	"#e0ac00",
	"#08b94e",
	"#00bfbc",
	"#8b5cf6",
] as const;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const FIT_VIEW_PADDING = 48;
const FRONT_CARD_Z_INDEX = "20";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const INLINE_EDITOR_AUTOSAVE_DELAY_MS = 750;
const INLINE_EDITOR_SAVED_STATUS_DELAY_MS = 1500;
const LINK_PREVIEW_MIN_TENSION = 48;
const LINK_PREVIEW_MAX_TENSION = 220;
const RESIZE_HANDLE_DIRECTIONS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
const SELECTION_DRAG_THRESHOLD = 4;
const EDGE_SCROLL_ZONE = 72;
const EDGE_SCROLL_MAX_SPEED = 900;
const EDGE_SCROLL_FALLBACK_FRAME_MS = 16;
const EDGE_SCROLL_MAX_FRAME_MS = 32;

type CanvasRenderableNode = CanvasFileNode | CanvasGroupNode | CanvasTextNode;
type CanvasNodeKind = "file" | "group" | "text";
type ResizeDirection = (typeof RESIZE_HANDLE_DIRECTIONS)[number];
type LinkDragInvalidReason = "empty" | "none" | "self";

let nextEdgeMarkerId = 0;
let nextActiveGroupPropertyListId = 0;

interface DragState {
	pointerId: number;
	startClientX: number;
	startClientY: number;
	startScrollLeft: number;
	startScrollTop: number;
	nodes: Array<{
		id: string;
		element: HTMLElement | null;
		startPosition: CanvasBasesNodePosition;
	}>;
}

interface DroppedDragNode {
	id: string;
	position: CanvasBasesNodePosition;
	sourceActiveGroup: ActiveGroupTarget | null;
}

interface ActiveGroupTarget {
	id: string;
	label: string;
	action: CanvasBasesZoneAction;
	property: string;
	value: string;
	updateMode: CanvasBasesZoneUpdateMode;
	valueType: CanvasBasesZoneValueType;
	color?: string;
	customZoneId?: string;
}

interface CanvasBasesControllerViewConfig {
	name?: string;
	groupBy?: string | { property?: string };
}

interface CanvasBasesQueryController {
	query?: { views?: CanvasBasesControllerViewConfig[] };
	viewName?: string;
}

interface ResizeState {
	pointerId: number;
	startClientX: number;
	startClientY: number;
	startScrollLeft: number;
	startScrollTop: number;
	id: string;
	direction: ResizeDirection;
	element: HTMLElement;
	startPosition: CanvasBasesNodePosition;
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
	previewEl: SVGSVGElement;
	previewPathEl: SVGPathElement;
	hintEl: HTMLElement;
	targetElement: HTMLElement | null;
	targetPath: string | null;
	invalidReason: LinkDragInvalidReason;
}

interface LinkPoint {
	x: number;
	y: number;
}

interface SelectionState {
	pointerId: number;
	startClientX: number;
	startClientY: number;
	startPoint: LinkPoint;
	selectionRect: CanvasBasesNodePosition;
	selectionEl: HTMLElement;
	selectedNodeIds: Set<string>;
	didMove: boolean;
}

type EdgeScrollInteraction = "drag" | "resize" | "link" | "selection";

interface EdgeScrollState {
	pointerId: number;
	interaction: EdgeScrollInteraction;
	viewportEl: HTMLElement;
	latestClientX: number;
	latestClientY: number;
	animationFrame: number | null;
	lastTimestamp: number | null;
}

interface ColorMenuOptions {
	label: string;
	currentColor: string | undefined;
	defaultColor: string;
	swatches: readonly string[];
	clearLabel: string;
	setLabel: string;
	getSwatchCssColor: (color: string) => string | undefined;
	normalizeColor: (color: unknown) => string | undefined;
	onChange: (color: string | undefined) => void;
}

interface CanvasViewportState {
	scrollLeft: number;
	scrollTop: number;
}

interface RenderedCanvasBasesEdge {
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
	entriesByPath: Map<string, CanvasBasesEntrySnapshot>;
	filePathsByNodeId: Map<string, string>;
	manualGroupsByNodeId: Map<string, CanvasBasesManualGroupSnapshot>;
	groupsByNodeId: Map<string, CanvasBasesGroupSnapshot>;
	textCardsByNodeId: Map<string, CanvasBasesTextCardSnapshot>;
	nodePositions: Map<string, CanvasBasesNodePosition>;
	planeEl: HTMLElement;
	bounds: { width: number; height: number };
	taskCards: Map<string, CanvasBasesTaskCard>;
	edgeRelationships: Map<string, CanvasBasesRelationship>;
}

type ActivatableGroupSnapshot = CanvasBasesGroupSnapshot & {
	property: string;
	value: string;
};

interface InlineEditorState {
	path: string;
	editor: CanvasBasesInlineMarkdownEditor;
	shellEl: HTMLElement;
	statusEl: HTMLElement;
	original: string;
	autosaveTimer: number | null;
	pendingSaveValue: string | null;
	pendingSaveAllowConflictOverwrite: boolean;
	savePromise: Promise<boolean> | null;
	savedStatusTimer: number | null;
	externalConflict: boolean;
}

export class CanvasBasesView extends BasesView {
	readonly type = CANVAS_BASES_VIEW_TYPE;
	private readonly plugin: CanvasBasesPlugin;
	private readonly canvasQueryController: CanvasBasesQueryController;
	private readonly edgeMarkerId = `canvas-bases-edge-arrow-${nextEdgeMarkerId++}`;
	private readonly containerEl: HTMLElement;
	private rootEl: HTMLElement | null = null;
	private dragState: DragState | null = null;
	private resizeState: ResizeState | null = null;
	private panState: PanState | null = null;
	private linkDragState: LinkDragState | null = null;
	private selectionState: SelectionState | null = null;
	private edgeScrollState: EdgeScrollState | null = null;
	private canvasViewportEl: HTMLElement | null = null;
	private canvasWorldEl: HTMLElement | null = null;
	private canvasPlaneEl: HTMLElement | null = null;
	private zoomLabelEl: HTMLElement | null = null;
	private edgeLayerEl: SVGSVGElement | null = null;
	private canvasNodeElements = new Map<string, HTMLElement>();
	private inlineEditors = new Map<string, InlineEditorState>();
	private renderedEdges: RenderedCanvasBasesEdge[] = [];
	private frontCardEl: HTMLElement | null = null;
	private selectedNodeIds = new Set<string>();
	private activeGroupDropTargetIds = new Set<string>();
	private canvasBounds: { width: number; height: number } | null = null;
	private canvasRenderState: CanvasRenderState | null = null;
	private taskEdgeCache: {
		key: string;
		edges: CanvasEdge[];
		relationships: CanvasBasesRelationship[];
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
	private selectionMoveHandler: ((event: PointerEvent) => void) | null = null;
	private selectionEndHandler: ((event: PointerEvent) => void) | null = null;
	private lastRenderSignature: string | null = null;
	private deferredInlineEditorRender = false;
	private renderToken = 0;

	constructor(controller: QueryController, containerEl: HTMLElement, plugin: CanvasBasesPlugin) {
		super(controller);
		this.plugin = plugin;
		this.canvasQueryController = controller as CanvasBasesQueryController;
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
				void this.handleVisibleFileChanged(file.path);
			}
		}, 150, true);
		this.registerEvent(this.app.metadataCache.on("changed", refreshFromMetadata));
		for (const eventRef of this.plugin.taskNotes.registerTaskEvents(() => {
			void this.handleTaskNotesDataUpdated();
		})) {
			this.registerEvent(eventRef);
		}
		this.scheduleRender();
	}

	onunload(): void {
		this.cancelScheduledWork();
		this.clearDragListeners();
		this.destroyAllInlineEditors(true);
		this.plugin.unregisterViewInstance(this);
	}

	onDataUpdated(): void {
		const snapshot = this.getSnapshot();
		const renderSignature = snapshot ? this.getRenderSignature(snapshot) : null;
		if (renderSignature && renderSignature === this.lastRenderSignature) {
			return;
		}

		if (this.hasFocusedInlineEditor()) {
			if (snapshot) {
				this.refreshRenderedCardProperties(snapshot);
				void this.refreshRenderedTaskCardsForPaths(getSnapshotPaths(snapshot));
			}
			this.deferredInlineEditorRender = true;
			return;
		}

		this.scheduleRender();
	}

	private async handleVisibleFileChanged(path: string): Promise<void> {
		await this.refreshInlineEditorsForPaths([path]);
		const snapshot = this.getSnapshot();
		if (snapshot) {
			this.refreshRenderedCardProperties(snapshot, [path]);
			void this.refreshRenderedTaskCardsForPaths([path]);
		}
		this.onDataUpdated();
	}

	private async handleTaskNotesDataUpdated(): Promise<void> {
		await this.refreshAllInlineEditorsFromDisk();
		this.scheduleRender();
	}

	focus(): void {
		this.plugin.setActiveView(this);
		if (!this.rootEl) return;
		const activeElement = this.rootEl.ownerDocument.activeElement;
		if (activeElement instanceof HTMLElement && this.rootEl.contains(activeElement)) return;

		this.rootEl.focus({ preventScroll: true });
	}

	getSnapshot(): CanvasBasesViewSnapshot | null {
		if (!this.data || !this.config) return null;
		const snapshot = applyManualViewItems(
			this.app,
			buildCanvasBasesSnapshot(this.data, this.config, this.getGroupByPropertyId()),
			this.config
		);
		return applyStoredNodePositions(
			snapshot,
			this.getNodePositions()
		);
	}

	getMaterializationSnapshot(): CanvasBasesViewSnapshot | null {
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

	private getGroupByPropertyId(): string | null {
		const views = this.canvasQueryController.query?.views;
		const viewName = this.canvasQueryController.viewName ?? this.config?.name;
		if (!views || !viewName) return null;

		const view = views.find((candidate) => candidate?.name === viewName);
		return normalizeGroupByProperty(view?.groupBy);
	}

	private getZones(): CanvasBasesZoneConfig[] {
		if (!this.config) return [];

		return normalizeZones(this.config.get(VIEW_CONFIG_KEYS.zones));
	}

	private getDataZoneConfig(
		group: CanvasBasesGroupSnapshot | undefined
	): CanvasBasesZoneConfig | null {
		if (!group?.property || typeof group.value !== "string") return null;

		const key = getZoneKey("bases", group.property, group.value);
		return (
			this.getZones().find(
				(zone) =>
					zone.origin === "bases" &&
					getZoneKey("bases", zone.property, zone.value) === key
			) ?? null
		);
	}

	private getCustomZoneConfig(
		group: CanvasBasesManualGroupSnapshot | undefined
	): CanvasBasesZoneConfig | null {
		if (!group) return null;

		return (
			this.getZones().find((zone) => zone.origin === "custom" && zone.id === group.id) ?? null
		);
	}

	private isActiveGroup(group: CanvasBasesGroupSnapshot | undefined): boolean {
		return this.getDataZoneConfig(group) !== null;
	}

	private isManualGroupActive(group: CanvasBasesManualGroupSnapshot | undefined): boolean {
		return this.getCustomZoneConfig(group) !== null;
	}

	private getActiveGroupTargetForDataGroup(
		group: CanvasBasesGroupSnapshot | undefined
	): ActiveGroupTarget | null {
		const config = this.getDataZoneConfig(group);
		if (!group?.property || typeof group.value !== "string" || !config) return null;

			return {
				id: group.id,
				label: group.label,
				action: DEFAULT_ZONE_ACTION,
				property: group.property,
				value: group.value,
				updateMode: config.updateMode,
			valueType: config.valueType,
			color: config.color,
		};
	}

	private getActiveGroupTargetForManualGroup(
		group: CanvasBasesManualGroupSnapshot | undefined
	): ActiveGroupTarget | null {
		const config = this.getCustomZoneConfig(group);
		if (!group || !config) return null;

			return {
				id: getManualGroupNodeId(group.id),
				label: config.label ?? group.label,
				action: config.action,
				property: config.property,
				value: config.value,
				updateMode: config.updateMode,
			valueType: config.valueType,
			color: config.color,
			customZoneId: group.id,
		};
	}

	private canActivateGroup(
		group: CanvasBasesGroupSnapshot | undefined
	): group is ActivatableGroupSnapshot {
		return Boolean(
			group?.property &&
				typeof group.value === "string" &&
				isWritableActiveGroupProperty(group.property)
		);
	}

	private activateGroup(group: CanvasBasesGroupSnapshot): void {
		if (!this.config || !this.canActivateGroup(group)) return;

		const key = getZoneKey("bases", group.property, group.value);
		const zones = this.getZones();
		if (
			!zones.some(
				(zone) =>
					zone.origin === "bases" &&
					getZoneKey("bases", zone.property, zone.value) === key
			)
		) {
			setZones(this.config, [
				...zones,
						{
							origin: "bases",
							action: DEFAULT_ZONE_ACTION,
							property: normalizeZoneProperty(group.property),
							value: group.value,
							updateMode: DEFAULT_ZONE_UPDATE_MODE,
					valueType: DEFAULT_ZONE_VALUE_TYPE,
				},
			]);
		}
		this.scheduleRender();
		new Notice(this.t("notices.activeGroupEnabled", { label: group.label }));
	}

	private deactivateGroup(group: CanvasBasesGroupSnapshot): void {
		if (!this.config || !group.property || typeof group.value !== "string") return;

		const key = getZoneKey("bases", group.property, group.value);
		setZones(
			this.config,
			this.getZones().filter(
				(zone) =>
					zone.origin !== "bases" ||
					getZoneKey("bases", zone.property, zone.value) !== key
			)
		);
		this.scheduleRender();
		new Notice(this.t("notices.activeGroupDisabled", { label: group.label }));
	}

	private configureDataActiveGroup(
		group: CanvasBasesGroupSnapshot,
		updateMode: CanvasBasesZoneUpdateMode,
		valueType: CanvasBasesZoneValueType,
		color: string
	): void {
		if (!this.config || !group.property || typeof group.value !== "string") return;

		const key = getZoneKey("bases", group.property, group.value);
		const zones = this.getZones();
		const nextZones: CanvasBasesZoneConfig[] = zones.some(
			(zone) =>
				zone.origin === "bases" &&
				getZoneKey("bases", zone.property, zone.value) === key
		)
			? zones.map((zone) =>
					zone.origin === "bases" &&
					getZoneKey("bases", zone.property, zone.value) === key
						? { ...zone, updateMode, valueType, color }
						: zone
				)
			: [
					...zones,
					{
							origin: "bases" as const,
							action: DEFAULT_ZONE_ACTION,
							property: normalizeZoneProperty(group.property),
							value: group.value,
							updateMode,
						valueType,
						color,
					},
				];
		setZones(this.config, nextZones);
		this.scheduleRender();
	}

	private setDataActiveGroupColor(
		group: CanvasBasesGroupSnapshot,
		color: string | undefined
	): void {
		if (!this.config || !group.property || typeof group.value !== "string") return;

		const key = getZoneKey("bases", group.property, group.value);
		const nextColor = normalizeZoneColor(color);
		setZones(
			this.config,
			this.getZones().map((zone) =>
				zone.origin === "bases" && getZoneKey("bases", zone.property, zone.value) === key
					? setZoneConfigColor(zone, nextColor)
					: zone
			)
		);
		this.updateActiveGroupElementColor(group.id, nextColor);
	}

	private fitDataGroupToMembers(group: CanvasBasesGroupSnapshot): void {
		if (!this.config || !this.canvasRenderState) return;

		const memberPositions = this.getDataGroupMemberPositions(group);
		const nextPosition = getBoundingGroupPosition(memberPositions);
		if (!nextPosition) return;

		const nodePositions = this.getNodePositions();
		nodePositions[group.id] = nextPosition;
		this.canvasRenderState.nodePositions.set(group.id, nextPosition);
		this.setNodePositions(nodePositions);

		const groupEl = this.canvasNodeElements.get(group.id);
		if (groupEl) {
			setNodeGeometry(groupEl, nextPosition);
		}
		this.updateEdgeLayerGeometry();
		this.refreshGroupContainment();
	}

	private canFitDataGroupToMembers(group: CanvasBasesGroupSnapshot): boolean {
		return this.getDataGroupMemberPositions(group).length > 0;
	}

	private getDataGroupMemberPositions(group: CanvasBasesGroupSnapshot): CanvasBasesNodePosition[] {
		const state = this.canvasRenderState;
		if (!state) return [];

		return group.entries
			.map((entry) => state.nodePositions.get(getFileNodeId(entry.path)))
			.filter((position): position is CanvasBasesNodePosition => Boolean(position));
	}

	private configureManualActiveGroup(
		group: CanvasBasesManualGroupSnapshot,
		action: CanvasBasesZoneAction,
		property: string,
		value: string,
		updateMode: CanvasBasesZoneUpdateMode,
		valueType: CanvasBasesZoneValueType,
		color: string
	): void {
		if (!this.config) return;

		const normalizedAction = normalizeZoneAction(action);
		const normalizedProperty = normalizedAction === DEFAULT_ZONE_ACTION
			? normalizeZoneProperty(property)
			: "";
		if (
			normalizedAction === DEFAULT_ZONE_ACTION &&
			(!normalizedProperty || !isWritableActiveGroupProperty(normalizedProperty))
		) {
			new Notice(this.t("notices.activeGroupReadOnly"));
			return;
		}

		setManualGroups(
			this.config,
			this.getManualGroups().map((manualGroup) =>
				manualGroup.id === group.id ? { ...manualGroup, label: group.label } : manualGroup
			)
		);
		setZones(this.config, [
			...this.getZones().filter((zone) => zone.origin !== "custom" || zone.id !== group.id),
				{
					origin: "custom",
					id: group.id,
					label: group.label,
					action: normalizedAction,
					property: normalizedProperty,
					value: normalizedAction === DEFAULT_ZONE_ACTION ? value : "",
					updateMode,
					valueType,
					color,
			},
		]);
		this.scheduleRender();
		new Notice(this.t("notices.activeGroupEnabled", { label: group.label }));
	}

	private deactivateManualGroup(group: CanvasBasesManualGroupSnapshot): void {
		if (!this.config) return;

		setZones(
			this.config,
			this.getZones().filter(
				(zone) => zone.origin !== "custom" || zone.id !== group.id
			)
		);
		this.scheduleRender();
		new Notice(this.t("notices.activeGroupDisabled", { label: group.label }));
	}

	private setManualActiveGroupColor(
		group: CanvasBasesManualGroupSnapshot,
		color: string | undefined
	): void {
		if (!this.config) return;

		const nextColor = normalizeZoneColor(color);
		setZones(
			this.config,
			this.getZones().map((zone) =>
				zone.origin === "custom" && zone.id === group.id
					? setZoneConfigColor(zone, nextColor)
					: zone
			)
		);
		this.updateActiveGroupElementColor(getManualGroupNodeId(group.id), nextColor);
	}

	private updateActiveGroupElementColor(nodeId: string, color: string | undefined): void {
		const element = this.canvasNodeElements.get(nodeId);
		if (!element) return;

		if (color) {
			element.style.setProperty("--canvas-bases-active-group-color", color);
		} else {
			element.style.removeProperty("--canvas-bases-active-group-color");
		}
	}

	private getActiveGroupPropertyOptions(): string[] {
		const properties = new Set<string>();
		const addProperty = (property: string | null | undefined) => {
			if (!property) return;
			const normalized = normalizeZoneProperty(property);
			if (normalized && isWritableActiveGroupProperty(normalized)) {
				properties.add(normalized);
			}
		};

		for (const property of this.config?.getOrder() ?? []) addProperty(property);
		for (const property of this.data?.properties ?? []) addProperty(property);
		for (const property of this.allProperties ?? []) addProperty(property);
		for (const property of this.getVaultPropertyOptions()) addProperty(property);
		for (const property of this.plugin.taskNotes.getWritablePropertyIds()) {
			addProperty(property);
		}
		for (const zone of this.getZones()) addProperty(zone.property);

		const snapshot = this.getSnapshot();
		for (const group of snapshot?.groups ?? []) {
			addProperty(group.property);
			for (const entry of group.entries) {
				for (const property of entry.properties ?? []) {
					addProperty(property.id);
				}
			}
		}

		return [...properties].sort((left, right) => left.localeCompare(right));
	}

	private getActiveGroupActionOptions(): Record<string, string> {
		const labels: Record<CanvasBasesZoneAction, string> = {
			"set-property": this.t("view.group.actionSetProperty"),
			"task.complete": this.t("view.group.actionCompleteTask"),
			"task.uncomplete": this.t("view.group.actionUncompleteTask"),
			"task.archive": this.t("view.group.actionArchiveTask"),
			"task.unarchive": this.t("view.group.actionUnarchiveTask"),
			"time.start": this.t("view.group.actionStartTimeTracking"),
			"time.stop": this.t("view.group.actionStopTimeTracking"),
			"pomodoro.start": this.t("view.group.actionStartPomodoro"),
			"pomodoro.assign": this.t("view.group.actionAssignPomodoro"),
			"recurring.complete": this.t("view.group.actionCompleteRecurring"),
			"recurring.skip": this.t("view.group.actionSkipRecurring"),
		};
		const actions: CanvasBasesZoneAction[] = [
			DEFAULT_ZONE_ACTION,
			...this.plugin.taskNotes.getAvailableZoneActions(),
		];

		return Object.fromEntries(
			actions.map((action) => [action, labels[action]])
		);
	}

	private getActiveGroupActionLabel(action: CanvasBasesZoneAction): string {
		return this.getActiveGroupActionOptions()[action] ?? action;
	}

	private getActiveGroupUpdateModeOptions(): Record<CanvasBasesZoneUpdateMode, string> {
		const labels: Record<CanvasBasesZoneUpdateMode, string> = {
			replace: this.t("view.group.updateModeReplace"),
			append: this.t("view.group.updateModeAppend"),
			appendUnique: this.t("view.group.updateModeAppendUnique"),
			remove: this.t("view.group.updateModeRemove"),
			clear: this.t("view.group.updateModeClear"),
		};

		return Object.fromEntries(
			ZONE_UPDATE_MODES.map((mode) => [mode, labels[mode]])
		) as Record<CanvasBasesZoneUpdateMode, string>;
	}

	private getActiveGroupValueTypeOptions(): Record<CanvasBasesZoneValueType, string> {
		const labels: Record<CanvasBasesZoneValueType, string> = {
			auto: this.t("view.group.valueTypeAuto"),
			string: this.t("view.group.valueTypeString"),
			number: this.t("view.group.valueTypeNumber"),
			boolean: this.t("view.group.valueTypeBoolean"),
			date: this.t("view.group.valueTypeDate"),
			list: this.t("view.group.valueTypeList"),
		};

		return Object.fromEntries(
			ZONE_VALUE_TYPES.map((type) => [type, labels[type]])
		) as Record<CanvasBasesZoneValueType, string>;
	}

	private getVaultPropertyOptions(): string[] {
		const metadataCache = this.app.metadataCache as unknown as {
			getAllPropertyInfos?: () => unknown;
			propertyInfos?: unknown;
		};
		const propertyInfos = metadataCache.getAllPropertyInfos?.() ?? metadataCache.propertyInfos;
		return getPropertyInfoNames(propertyInfos);
	}

	private getVaultPropertyType(propertyName: string): string | null {
		const metadataCache = this.app.metadataCache as unknown as {
			getAllPropertyInfos?: () => unknown;
			propertyInfos?: unknown;
		};
		const propertyInfos = metadataCache.getAllPropertyInfos?.() ?? metadataCache.propertyInfos;
		return getPropertyInfoType(propertyInfos, propertyName);
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

	private getRenderSignature(snapshot = this.getSnapshot()): string | null {
		if (!snapshot) return null;

		const options = this.getMaterializeOptions();
		const relationships = collectRelationships(this.app, snapshot, options);
		return JSON.stringify({
			options,
			zones: this.getZones(),
			viewName: snapshot.viewName,
			totalEntries: snapshot.totalEntries,
			groups: snapshot.groups.map((group) => ({
				id: group.id,
				label: group.label,
				property: group.property,
				value: group.value,
				isImplicit: Boolean(group.isImplicit),
				entries: group.entries.map((entry) => ({
					path: entry.path,
					name: entry.name,
					isManual: Boolean(entry.isManual),
					properties: (entry.properties ?? []).map((property) => ({
						id: property.id,
						displayName: property.displayName,
						text: property.text,
						isEmpty: property.isEmpty,
					})),
				})),
			})),
			manualEntries: snapshot.manualEntries.map((entry) => ({
				path: entry.path,
				name: entry.name,
				isManual: Boolean(entry.isManual),
			})),
			manualGroups: snapshot.manualGroups.map((group) => ({
				id: group.id,
				label: group.label,
			})),
			textCards: snapshot.textCards.map((card) => ({
				id: card.id,
				text: card.text,
			})),
			relationships: relationships.map((relationship) => ({
				sourcePath: relationship.sourcePath,
				targetPath: relationship.targetPath,
				label: relationship.label,
				metadata: relationship.metadata,
			})),
		});
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
			cls: "canvas-bases-view",
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
		this.lastRenderSignature = snapshot ? this.getRenderSignature(snapshot) : null;

		this.renderToolbar(rootEl, snapshot);

		if (
			!snapshot ||
			(
				snapshot.totalEntries === 0 &&
				snapshot.textCards.length === 0 &&
				snapshot.manualGroups.length === 0
			)
		) {
			this.destroyAllInlineEditors(true);
			this.renderEmpty(rootEl);
			return;
		}

		this.renderCanvas(rootEl, snapshot, viewportState);
	}

	private renderToolbar(
		containerEl: HTMLElement,
		snapshot: CanvasBasesViewSnapshot | null
	): void {
		const toolbarEl = containerEl.createDiv({ cls: "canvas-bases-view__toolbar" });
		const summaryEl = toolbarEl.createDiv({ cls: "canvas-bases-view__summary" });
		summaryEl.createDiv({
			cls: "canvas-bases-view__title",
			text: snapshot?.viewName || this.t("common.appName"),
		});
		summaryEl.createDiv({
			cls: "canvas-bases-view__meta",
			text: snapshot ? this.formatSnapshotMeta(snapshot) : this.t("view.waitingForBasesData"),
		});

		const actionsEl = toolbarEl.createDiv({ cls: "canvas-bases-view__actions" });
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
			icon: "lucide-box-select",
			label: this.t("view.toolbar.addGroup"),
			onClick: () => this.openCreateManualGroupModal(),
			isPrimary: false,
		});
		this.addToolbarButton(actionsEl, {
			icon: "lucide-zap",
			label: this.t("view.toolbar.addZone"),
			onClick: async () => this.openCreateCustomZoneModal(),
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
			.setClass(isPrimary ? "canvas-bases-view__button--primary" : "canvas-bases-view__button")
			.onClick((event) => {
				if (Keymap.isModEvent(event)) return;
				void onClick();
			})
			.then((button) => {
				button.buttonEl.addClass("canvas-bases-view__button");
				setIcon(button.buttonEl.createSpan({ cls: "canvas-bases-view__button-icon" }), icon);
				setTooltip(button.buttonEl, label);
			});
	}

	private renderEmpty(containerEl: HTMLElement): void {
		const emptyEl = containerEl.createDiv({ cls: "canvas-bases-view__empty" });
		emptyEl.createDiv({
			cls: "canvas-bases-view__empty-title",
			text: this.t("view.empty.title"),
		});
		emptyEl.createDiv({
			cls: "canvas-bases-view__empty-text",
			text: this.t("view.empty.body"),
		});
	}

	private formatSnapshotMeta(snapshot: CanvasBasesViewSnapshot): string {
		return [
			this.tp("common.note", snapshot.totalEntries),
			this.tp("common.group", getVisibleGroupCount(snapshot)),
			snapshot.textCards.length > 0
				? this.tp("common.card", snapshot.textCards.length)
				: null,
		]
			.filter((part): part is string => part !== null)
			.join(", ");
	}

	private async openManualNotePicker(position?: CanvasBasesNodePosition): Promise<void> {
		if (!this.config) return;

		const pinnedPaths = this.getManualNotePaths();
		const unavailablePaths = new Set(pinnedPaths);

		new ManualNoteSuggestModal(
			this.app,
			unavailablePaths,
			(key, params) => this.t(key, params),
			(file) => {
				this.pinNoteToDefaultGroup(file.path, position);
			}
		).open();
	}

	private async openCreateManualGroupModal(): Promise<void> {
		if (!this.config) return;

		new ManualGroupNameModal(
			this.app,
			{
				title: this.t("view.group.createTitle"),
				initialValue: this.t("view.group.defaultName"),
				submitLabel: this.t("view.group.create"),
				cancelLabel: this.t("common.cancel"),
			},
			(label) => {
				this.addManualGroup(label);
			}
		).open();
	}

	private openCreateCustomZoneModal(position?: CanvasBasesNodePosition): void {
		if (!this.config) return;

		new ActiveGroupSettingsModal(
			this.app,
			{
					title: this.t("view.group.zoneTitle"),
					t: (key, params) => this.t(key, params),
					labelLabel: this.t("view.group.label"),
					actionLabel: this.t("view.group.action"),
					propertyLabel: this.t("view.group.property"),
					valueLabel: this.t("view.group.value"),
					updateModeLabel: this.t("view.group.updateMode"),
					valueTypeLabel: this.t("view.group.valueType"),
					colorLabel: this.t("view.group.color"),
					initialLabel: this.t("view.group.defaultZoneName"),
					initialAction: DEFAULT_ZONE_ACTION,
					initialProperty: "note.status",
					initialValue: "",
					initialUpdateMode: DEFAULT_ZONE_UPDATE_MODE,
					initialValueType: DEFAULT_ZONE_VALUE_TYPE,
					initialColor: DEFAULT_ACTIVE_GROUP_COLOR,
					actionOptions: this.getActiveGroupActionOptions(),
					propertyOptions: this.getActiveGroupPropertyOptions(),
					updateModeOptions: this.getActiveGroupUpdateModeOptions(),
					valueTypeOptions: this.getActiveGroupValueTypeOptions(),
				submitLabel: this.t("view.group.createZone"),
				cancelLabel: this.t("common.cancel"),
			},
			(settings) => {
				this.addCustomZone(settings, position);
			}
		).open();
	}

	private openCreateManualGroupFromSelectionModal(selectionRect: CanvasBasesNodePosition): void {
		if (!this.config) return;

		new ManualGroupNameModal(
			this.app,
			{
				title: this.t("view.group.createTitle"),
				initialValue: this.t("view.group.defaultName"),
				submitLabel: this.t("view.group.create"),
				cancelLabel: this.t("common.cancel"),
			},
			(label) => {
				this.addManualGroupAtRect(label, selectionRect);
			}
		).open();
	}

	private async addTextCard(position?: CanvasBasesNodePosition): Promise<void> {
		if (!this.config) return;

		const options = this.getMaterializeOptions();
		const cardPosition =
			position ??
			this.getNewCardPosition(Math.max(220, options.nodeWidth), Math.max(120, options.nodeHeight));
		const card: CanvasBasesTextCardSnapshot = {
			id: createItemId(),
			text: "",
		};
		const cards = [...normalizeTextCards(this.config.get(VIEW_CONFIG_KEYS.textCards)), card];
		const positions = this.getNodePositions();
		positions[getTextCardNodeId(card.id)] = cardPosition;

		setTextCards(this.config, cards);
		this.setNodePositions(positions);
		this.scheduleRender();
	}

	private addManualGroup(label: string, position?: CanvasBasesNodePosition): void {
		if (!this.config) return;

		const group: CanvasBasesManualGroupSnapshot = {
			id: createItemId(),
			label: label.trim() || this.t("view.group.defaultName"),
		};
		const groups = [...this.getManualGroups(), group];
		const positions = this.getNodePositions();
		positions[getManualGroupNodeId(group.id)] = position ?? this.getNewCardPosition(360, 220);

		setManualGroups(this.config, groups);
		this.setNodePositions(positions);
		this.scheduleRender();
	}

	private addManualGroupAtRect(label: string, rect: CanvasBasesNodePosition): void {
		this.addManualGroup(label, {
			x: clampCoordinate(rect.x),
			y: clampCoordinate(rect.y),
			width: Math.max(MIN_GROUP_NODE_WIDTH, Math.round(rect.width)),
			height: Math.max(MIN_GROUP_NODE_HEIGHT, Math.round(rect.height)),
		});
		this.clearSelectedNodes();
	}

	private addCustomZone(
		settings: ActiveGroupSettings,
		position?: CanvasBasesNodePosition
		): void {
			if (!this.config) return;

			const action = normalizeZoneAction(settings.action);
			const property = action === DEFAULT_ZONE_ACTION
				? normalizeZoneProperty(settings.property)
				: "";
			if (
				action === DEFAULT_ZONE_ACTION &&
				(!property || !isWritableActiveGroupProperty(property))
			) {
				new Notice(this.t("notices.activeGroupReadOnly"));
				return;
			}

			const id = createItemId();
			const label = settings.label?.trim() ||
				(action === DEFAULT_ZONE_ACTION
					? settings.value
					: this.getActiveGroupActionLabel(action)) ||
				DEFAULT_ZONE_LABEL;
			const positions = this.getNodePositions();
			positions[getManualGroupNodeId(id)] = position ?? this.getNewCardPosition(360, 220);

			setZones(this.config, [
				...this.getZones(),
				{
					origin: "custom",
					id,
					label,
					action,
					property,
					value: action === DEFAULT_ZONE_ACTION ? settings.value : "",
					updateMode: settings.updateMode,
					valueType: settings.valueType,
					color: settings.color,
				},
			]);
		this.setNodePositions(positions);
		this.clearSelectedNodes();
		this.scheduleRender();
	}

	private renameManualGroup(id: string, label: string): void {
		if (!this.config) return;

		const nextLabel = label.trim();
		if (!nextLabel) return;

		setManualGroups(
			this.config,
			this.getManualGroups().map((group) =>
				group.id === id ? { ...group, label: nextLabel } : group
			)
		);
		setZones(
			this.config,
			this.getZones().map((zone) =>
				zone.origin === "custom" && zone.id === id ? { ...zone, label: nextLabel } : zone
			)
		);
		this.scheduleRender();
	}

	private removeManualGroup(id: string): void {
		if (!this.config) return;

		setManualGroups(
			this.config,
			this.getManualGroups().filter((group) => group.id !== id)
		);
		setZones(
			this.config,
			this.getZones().filter((zone) => zone.origin !== "custom" || zone.id !== id)
		);
		const positions = this.getNodePositions();
		delete positions[getManualGroupNodeId(id)];
		this.setNodePositions(positions);
		this.scheduleRender();
	}

	private pinNoteToDefaultGroup(path: string, position?: CanvasBasesNodePosition): void {
		if (!this.config) return;

		const group = this.ensureDefaultManualGroup();
		const snapshot = this.getSnapshot();
		const visiblePaths = snapshot ? new Set(getSnapshotPaths(snapshot)) : new Set<string>();
		const paths = this.getManualNotePaths();
		if (!visiblePaths.has(path) && !paths.includes(path)) {
			setManualNotePaths(this.config, [...paths, path]);
		}

		const positions = this.getNodePositions();
		positions[getFileNodeId(path)] = position ?? this.getPositionInsideManualGroup(group.id);
		this.setNodePositions(positions);
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

	private getManualGroups(): CanvasBasesManualGroupSnapshot[] {
		if (!this.config) return [];

		const configuredGroups = this.config.get(VIEW_CONFIG_KEYS.manualGroups);
		if (Array.isArray(configuredGroups)) {
			return normalizeManualGroups(configuredGroups);
		}

		return this.getManualNotePaths().length > 0 ? [createDefaultManualGroup()] : [];
	}

	private ensureDefaultManualGroup(): CanvasBasesManualGroupSnapshot {
		if (!this.config) return createDefaultManualGroup();

		const defaultGroup = createDefaultManualGroup();
		const groups = this.getManualGroups();
		const existingGroup = groups.find((group) => group.id === defaultGroup.id);
		const group = existingGroup ?? defaultGroup;
		if (!existingGroup) {
			setManualGroups(this.config, [...groups, group]);
		}

		const nodeId = getManualGroupNodeId(group.id);
		const positions = this.getNodePositions();
		if (!this.getCurrentNodePosition(nodeId)) {
			positions[nodeId] = this.getNewCardPosition(360, 220);
			this.setNodePositions(positions);
		}

		return group;
	}

	private getPositionInsideManualGroup(groupId: string): CanvasBasesNodePosition {
		const options = this.getMaterializeOptions();
		const groupNodeId = getManualGroupNodeId(groupId);
		const groupPosition =
			this.getCurrentNodePosition(groupNodeId) ?? this.getNewCardPosition(360, 220);
		const childCount = this.canvasRenderState?.groupEntries.get(groupNodeId)?.length ?? 0;

		return {
			x: groupPosition.x + GROUP_PADDING,
			y:
				groupPosition.y +
				GROUP_HEADER_HEIGHT +
				GROUP_PADDING +
				childCount * (options.nodeHeight + NODE_GAP),
			width: options.nodeWidth,
			height: options.nodeHeight,
		};
	}

	private getCurrentNodePosition(nodeId: string): CanvasBasesNodePosition | null {
		const element = this.canvasNodeElements.get(nodeId);
		const elementPosition = element ? getElementNodePosition(element) : null;
		return (
			elementPosition ??
			this.canvasRenderState?.nodePositions.get(nodeId) ??
			this.getNodePositions()[nodeId] ??
			null
		);
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

	private getNewCardPosition(width: number, height: number): CanvasBasesNodePosition {
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
		snapshot: CanvasBasesViewSnapshot,
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
		const canvas = buildCanvasBasesCanvas(
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
		const groupEntries = buildGroupContainmentMap(nodes, nodePositions);
		const entriesByPath = getSnapshotEntriesByPath(snapshot);
		const groupsByNodeId = new Map(snapshot.groups.map((group) => [group.id, group] as const));
		const manualGroupsByNodeId = new Map(
			snapshot.manualGroups.map((group) => [getManualGroupNodeId(group.id), group] as const)
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
		const viewportEl = containerEl.createDiv({ cls: "canvas-bases-canvas-viewport" });
		const worldEl = viewportEl.createDiv({ cls: "canvas-bases-canvas-world" });
		const planeEl = worldEl.createDiv({ cls: "canvas-bases-canvas-plane" });
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
			groupsByNodeId,
			manualGroupsByNodeId,
			textCardsByNodeId,
			nodePositions,
			planeEl,
			bounds,
			taskCards: new Map(),
			edgeRelationships: initialEdgeRelationships,
		};
		if (options.showBodyEditor) {
			this.pruneInlineEditors(new Set(nodes.map((node) => node.id)));
		} else {
			this.destroyAllInlineEditors(true);
		}
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
				const position = state.nodePositions.get(node.id) ?? getCanvasNodePosition(node);
				setNodeGeometry(existingEl, position);
				setNodeColor(existingEl, position.color ?? node.color);
				existingEl.toggleClass("is-selected", this.selectedNodeIds.has(node.id));
				continue;
			}

			const nodeEl = this.renderCanvasNode(
				state.planeEl,
				applyCanvasNodePosition(node, state.nodePositions.get(node.id)),
				state
			);
			nodeEl.toggleClass("is-selected", this.selectedNodeIds.has(node.id));
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
			return this.renderGroupNode(
				containerEl,
				node,
				state.groupEntries.get(node.id) ?? [],
				state.manualGroupsByNodeId.get(node.id),
				state.groupsByNodeId.get(node.id)
			);
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
		const kind = getCanvasNodeKind(element);

		this.addElementEvent(element, "pointerdown", (event) => {
			if (kind === "file" || kind === "text") {
				this.bringCardToFront(event, element);
			}
			if (kind === "group") {
				this.refreshGroupContainment();
			}
			const childNodeIds = state.groupEntries.get(nodeId) ?? [];
			const dragNodeIds = childNodeIds.length > 0 ? [nodeId, ...childNodeIds] : [nodeId];
			this.startDrag(event, dragNodeIds, this.canvasNodeElements, state.nodePositions);
		});

		if (!kind) return;

		for (const handleEl of element.querySelectorAll(".canvas-bases-canvas-resize-handle")) {
			if (!handleEl.instanceOf(HTMLElement)) continue;

			const direction = getResizeDirection(
				handleEl.getAttribute("data-canvas-bases-resize-direction")
			);
			if (!direction) continue;

			this.addElementEvent(handleEl, "pointerdown", (event) => {
				this.startResize(event, nodeId, kind, direction, element, state.nodePositions);
			});
		}
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

	private startEdgeScroll(event: PointerEvent, interaction: EdgeScrollInteraction): void {
		if (!this.canvasViewportEl) return;

		this.stopEdgeScroll();
		this.edgeScrollState = {
			pointerId: event.pointerId,
			interaction,
			viewportEl: this.canvasViewportEl,
			latestClientX: event.clientX,
			latestClientY: event.clientY,
			animationFrame: null,
			lastTimestamp: null,
		};
		this.scheduleEdgeScrollFrame();
	}

	private updateEdgeScrollPointer(event: PointerEvent): void {
		if (!this.edgeScrollState || this.edgeScrollState.pointerId !== event.pointerId) return;

		this.edgeScrollState.latestClientX = event.clientX;
		this.edgeScrollState.latestClientY = event.clientY;
	}

	private stopEdgeScroll(): void {
		if (!this.edgeScrollState) return;

		if (this.edgeScrollState.animationFrame !== null) {
			this.cancelViewAnimationFrame(this.edgeScrollState.animationFrame);
		}
		this.edgeScrollState = null;
	}

	private scheduleEdgeScrollFrame(): void {
		if (!this.edgeScrollState || this.edgeScrollState.animationFrame !== null) return;

		this.edgeScrollState.animationFrame = this.requestViewAnimationFrame((timestamp) => {
			this.handleEdgeScrollFrame(timestamp);
		});
	}

	private handleEdgeScrollFrame(timestamp: number): void {
		const state = this.edgeScrollState;
		if (!state) return;

		state.animationFrame = null;
		if (!this.isEdgeScrollInteractionActive(state)) {
			this.edgeScrollState = null;
			return;
		}

		const elapsedMs =
			state.lastTimestamp === null
				? EDGE_SCROLL_FALLBACK_FRAME_MS
				: clampNumber(timestamp - state.lastTimestamp, 0, EDGE_SCROLL_MAX_FRAME_MS);
		state.lastTimestamp = timestamp;

		if (
			this.isPointerInEdgeScrollZone(
				state.viewportEl,
				state.latestClientX,
				state.latestClientY
			)
		) {
			this.expandCanvasBoundsForClientPoint(state.latestClientX, state.latestClientY);
		}
		const velocity = this.getEdgeScrollVelocity(
			state.viewportEl,
			state.latestClientX,
			state.latestClientY
		);
		if (velocity.x !== 0 || velocity.y !== 0) {
			const previousScrollLeft = state.viewportEl.scrollLeft;
			const previousScrollTop = state.viewportEl.scrollTop;
			state.viewportEl.scrollLeft += (velocity.x * elapsedMs) / 1000;
			state.viewportEl.scrollTop += (velocity.y * elapsedMs) / 1000;
			const didScroll =
				state.viewportEl.scrollLeft !== previousScrollLeft ||
				state.viewportEl.scrollTop !== previousScrollTop;

			if (didScroll) {
				this.scheduleVirtualCanvasRender();
				this.updateActiveEdgeScrolledInteraction(state);
			}
		}

		this.scheduleEdgeScrollFrame();
	}

	private isEdgeScrollInteractionActive(state: EdgeScrollState): boolean {
		switch (state.interaction) {
			case "drag":
				return this.dragState?.pointerId === state.pointerId;
			case "resize":
				return this.resizeState?.pointerId === state.pointerId;
			case "link":
				return this.linkDragState?.pointerId === state.pointerId;
			case "selection":
				return this.selectionState?.pointerId === state.pointerId;
		}
	}

	private updateActiveEdgeScrolledInteraction(state: EdgeScrollState): void {
		switch (state.interaction) {
			case "drag":
				this.applyDragMoveFromClient(state.latestClientX, state.latestClientY);
				break;
			case "resize":
				this.applyResizeMoveFromClient(state.latestClientX, state.latestClientY);
				break;
			case "link":
				this.applyLinkDragFromClient(state.latestClientX, state.latestClientY);
				break;
			case "selection":
				this.applySelectionMoveFromClient(state.latestClientX, state.latestClientY);
				break;
		}
	}

	private isPointerInEdgeScrollZone(
		viewportEl: HTMLElement,
		clientX: number,
		clientY: number
	): boolean {
		const rect = viewportEl.getBoundingClientRect();
		return (
			clientX < rect.left + EDGE_SCROLL_ZONE ||
			clientX > rect.right - EDGE_SCROLL_ZONE ||
			clientY < rect.top + EDGE_SCROLL_ZONE ||
			clientY > rect.bottom - EDGE_SCROLL_ZONE
		);
	}

	private getEdgeScrollVelocity(
		viewportEl: HTMLElement,
		clientX: number,
		clientY: number
	): LinkPoint {
		const rect = viewportEl.getBoundingClientRect();
		return {
			x: this.getEdgeScrollAxisVelocity(
				clientX,
				rect.left,
				rect.right,
				viewportEl.scrollLeft,
				Math.max(0, viewportEl.scrollWidth - viewportEl.clientWidth)
			),
			y: this.getEdgeScrollAxisVelocity(
				clientY,
				rect.top,
				rect.bottom,
				viewportEl.scrollTop,
				Math.max(0, viewportEl.scrollHeight - viewportEl.clientHeight)
			),
		};
	}

	private getEdgeScrollAxisVelocity(
		pointerPosition: number,
		min: number,
		max: number,
		scrollPosition: number,
		maxScrollPosition: number
	): number {
		if (pointerPosition < min + EDGE_SCROLL_ZONE && scrollPosition > 0) {
			const proximity = clampNumber(
				(EDGE_SCROLL_ZONE - (pointerPosition - min)) / EDGE_SCROLL_ZONE,
				0,
				1
			);
			return -EDGE_SCROLL_MAX_SPEED * proximity * proximity;
		}

		if (pointerPosition > max - EDGE_SCROLL_ZONE && scrollPosition < maxScrollPosition) {
			const proximity = clampNumber(
				(EDGE_SCROLL_ZONE - (max - pointerPosition)) / EDGE_SCROLL_ZONE,
				0,
				1
			);
			return EDGE_SCROLL_MAX_SPEED * proximity * proximity;
		}

		return 0;
	}

	private expandCanvasBoundsForClientPoint(clientX: number, clientY: number): void {
		const point = this.getPlanePoint(clientX, clientY);
		if (!point) return;

		this.ensureCanvasBounds({
			width: Math.ceil(point.x + CANVAS_PADDING),
			height: Math.ceil(point.y + CANVAS_PADDING),
		});
	}

	private expandCanvasBoundsForPositions(positions: CanvasBasesNodePosition[]): void {
		if (positions.length === 0) return;

		this.ensureCanvasBounds({
			width: Math.max(...positions.map((position) => position.x + position.width + CANVAS_PADDING)),
			height: Math.max(
				...positions.map((position) => position.y + position.height + CANVAS_PADDING)
			),
		});
	}

	private ensureCanvasBounds(bounds: { width: number; height: number }): void {
		if (!this.canvasBounds) return;

		const nextBounds = {
			width: Math.max(this.canvasBounds.width, Math.ceil(bounds.width)),
			height: Math.max(this.canvasBounds.height, Math.ceil(bounds.height)),
		};
		if (
			nextBounds.width === this.canvasBounds.width &&
			nextBounds.height === this.canvasBounds.height
		) {
			return;
		}

		this.canvasBounds = nextBounds;
		if (this.canvasRenderState) {
			this.canvasRenderState.bounds = nextBounds;
		}
		this.applyCanvasBounds();
	}

	private applyCanvasBounds(): void {
		if (!this.canvasBounds) return;

		if (this.canvasPlaneEl) {
			this.canvasPlaneEl.style.setProperty("width", `${this.canvasBounds.width}px`);
			this.canvasPlaneEl.style.setProperty("height", `${this.canvasBounds.height}px`);
		}
		if (this.edgeLayerEl) {
			this.setSvgBounds(this.edgeLayerEl, this.canvasBounds);
		}
		if (this.linkDragState) {
			this.setSvgBounds(this.linkDragState.previewEl, this.canvasBounds);
		}
		this.applyZoom();
	}

	private setSvgBounds(svgEl: SVGSVGElement, bounds: { width: number; height: number }): void {
		setSvgAttributes(svgEl, {
			width: String(bounds.width),
			height: String(bounds.height),
			viewBox: `0 0 ${bounds.width} ${bounds.height}`,
		});
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

	private refreshGroupContainment(): void {
		if (!this.canvasRenderState) return;

		this.canvasRenderState.groupEntries = buildGroupContainmentMap(
			this.canvasRenderState.allNodes,
			this.canvasRenderState.nodePositions
		);

		for (const node of this.canvasRenderState.allNodes) {
			if (node.type !== "group") continue;

			const groupEl = this.canvasNodeElements.get(node.id);
			const countEl = groupEl?.querySelector(".canvas-bases-canvas-group__count");
			if (countEl instanceof HTMLElement) {
				countEl.setText(String(this.canvasRenderState.groupEntries.get(node.id)?.length ?? 0));
			}
		}
	}

	private renderGroupNode(
		containerEl: HTMLElement,
		node: CanvasGroupNode,
		childNodeIds: string[],
		manualGroup: CanvasBasesManualGroupSnapshot | undefined,
		dataGroup: CanvasBasesGroupSnapshot | undefined
	): HTMLElement {
		const activeTarget = manualGroup
			? this.getActiveGroupTargetForManualGroup(manualGroup)
			: this.getActiveGroupTargetForDataGroup(dataGroup);
		const groupEl = containerEl.createDiv({ cls: "canvas-bases-canvas-group" });
		groupEl.setAttr("data-canvas-bases-node-id", node.id);
		groupEl.setAttr("data-canvas-bases-node-kind", "group");
		groupEl.toggleClass("is-manual", Boolean(manualGroup));
		groupEl.toggleClass("is-active-group", Boolean(activeTarget));
		if (activeTarget?.color) {
			groupEl.style.setProperty("--canvas-bases-active-group-color", activeTarget.color);
		}
		setNodeGeometry(groupEl, node);

		const headerEl = groupEl.createDiv({ cls: "canvas-bases-canvas-group__header" });
		const titleEl = headerEl.createDiv({ cls: "canvas-bases-canvas-group__title", text: node.label });
		if (activeTarget) {
			headerEl.createDiv({
				cls: "canvas-bases-canvas-group__active-badge",
				text: this.t("view.group.active"),
			});
		}
		headerEl.createDiv({
			cls: "canvas-bases-canvas-group__count",
			text: String(childNodeIds.length),
		});
		if (manualGroup) {
			this.addElementEvent(groupEl, "contextmenu", (event) => {
				event.preventDefault();
				event.stopPropagation();
				this.openGroupMenu(event, manualGroup);
			});
			this.addElementEvent(titleEl, "dblclick", (event) => {
				event.preventDefault();
				event.stopPropagation();
				this.openRenameManualGroupModal(manualGroup);
			});
			this.renderCardActionButton(headerEl, this.t("view.card.groupActions"), (event) => {
				this.openGroupMenu(event, manualGroup);
			});
		}
		if (dataGroup && !manualGroup) {
			this.addElementEvent(groupEl, "contextmenu", (event) => {
				event.preventDefault();
				event.stopPropagation();
				this.openDataGroupMenu(event, dataGroup);
			});
			this.renderCardActionButton(headerEl, this.t("view.card.groupActions"), (event) => {
				this.openDataGroupMenu(event, dataGroup);
			});
		}
		setTooltip(headerEl, this.t("view.tooltips.dragGroup"));
		this.addResizeHandle(groupEl, this.t("view.tooltips.resizeGroup"));

		return groupEl;
	}

	private renderFileNode(
		containerEl: HTMLElement,
		node: CanvasFileNode,
		entry: CanvasBasesEntrySnapshot | undefined
	): HTMLElement {
		const file = this.app.vault.getAbstractFileByPath(node.file);
		const tFile = file instanceof TFile ? file : null;
		const fileKind = getCanvasBasesFileKind(node.file, tFile);
		const isMarkdown = fileKind === "markdown";
		const fileEl = containerEl.createDiv({
			cls: "canvas-bases-canvas-file",
			attr: {
				tabindex: "0",
			},
		});
		fileEl.setAttr("data-canvas-bases-node-id", node.id);
		fileEl.setAttr("data-canvas-bases-node-kind", "file");
		fileEl.addClass(`is-file-kind-${fileKind}`);
		fileEl.toggleClass("is-attachment-card", !isMarkdown);
		setNodeGeometry(fileEl, node);
		setNodeColor(fileEl, node.color);
		setTooltip(fileEl, this.t(isMarkdown ? "view.tooltips.dragNote" : "view.tooltips.dragCard"));
		const showBodyEditor = this.getMaterializeOptions().showBodyEditor;
		fileEl.toggleClass("is-body-editor-hidden", isMarkdown && !showBodyEditor);

		const headerEl = fileEl.createDiv({ cls: "canvas-bases-canvas-file__header" });
		setIcon(
			headerEl.createSpan({ cls: "canvas-bases-canvas-file__icon" }),
			getCanvasBasesFileIcon(fileKind)
		);
		headerEl.createDiv({
			cls: "canvas-bases-canvas-file__title",
			text: node.file.split("/").pop()?.replace(/\.md$/u, "") || node.file,
		});
		if (entry?.isManual) {
			headerEl.createDiv({
				cls: "canvas-bases-canvas-file__manual-badge",
				text: this.t("view.card.pinned"),
			});
		}
		if (isMarkdown) {
			this.renderCardLinkHandle(headerEl, node.file, fileEl);
		}
		this.renderCardActionButton(
			headerEl,
			this.t(isMarkdown ? "view.card.noteActions" : "view.card.cardActions"),
			(event) => {
				void this.openFileCardMenu(event, node.file, entry);
			}
		);
		fileEl.createDiv({
			cls: "canvas-bases-canvas-file__path",
			text: node.file,
		});
		this.renderCardProperties(fileEl, entry);
		if (isMarkdown && showBodyEditor) {
			this.renderInlineEditor(fileEl, node.id, node.file);
		} else if (isMarkdown) {
			this.destroyInlineEditor(node.id, false);
		} else {
			this.destroyInlineEditor(node.id, false);
			this.renderAttachmentPreview(fileEl, node.file, tFile, fileKind);
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

	private renderAttachmentPreview(
		containerEl: HTMLElement,
		path: string,
		file: TFile | null,
		kind: CanvasBasesFileKind
	): void {
		const previewEl = containerEl.createDiv({
			cls: `canvas-bases-canvas-file__attachment-preview is-${kind}`,
		});
		const filename = path.split("/").pop() || path;
		const resourcePath = file ? this.app.vault.getResourcePath(file) : null;

		if (kind === "image" && resourcePath) {
			previewEl.createEl("img", {
				cls: "canvas-bases-canvas-file__attachment-image",
				attr: {
					alt: filename,
					draggable: "false",
					src: resourcePath,
				},
			});
			return;
		}

		if (kind === "pdf" && resourcePath) {
			previewEl.createEl("iframe", {
				cls: "canvas-bases-canvas-file__attachment-pdf",
				attr: {
					src: resourcePath,
					tabindex: "-1",
					title: filename,
				},
			});
		}

		const tileEl = previewEl.createDiv({ cls: "canvas-bases-canvas-file__attachment-tile" });
		const iconEl = tileEl.createDiv({ cls: "canvas-bases-canvas-file__attachment-icon" });
		setIcon(iconEl, getCanvasBasesFileIcon(kind));
		const detailEl = tileEl.createDiv({ cls: "canvas-bases-canvas-file__attachment-detail" });
		const extension = getCanvasBasesFileExtension(path, file).toUpperCase();
		if (extension) {
			detailEl.createDiv({
				cls: "canvas-bases-canvas-file__attachment-type",
				text: extension,
			});
		}
		detailEl.createDiv({
			cls: "canvas-bases-canvas-file__attachment-name",
			text: filename,
		});
	}

	private renderCardLinkHandle(
		containerEl: HTMLElement,
		path: string,
		cardEl: HTMLElement
	): void {
		const buttonEl = containerEl.createEl("button", {
			cls: "canvas-bases-canvas-link-handle",
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
		card: CanvasBasesTextCardSnapshot | undefined
	): HTMLElement {
		const textEl = containerEl.createDiv({
			cls: "canvas-bases-canvas-text-card",
			attr: {
				tabindex: "0",
			},
		});
		textEl.setAttr("data-canvas-bases-node-id", node.id);
		textEl.setAttr("data-canvas-bases-node-kind", "text");
		setNodeGeometry(textEl, node);
		setNodeColor(textEl, node.color);
		setTooltip(textEl, this.t("view.tooltips.dragCard"));

		const headerEl = textEl.createDiv({ cls: "canvas-bases-canvas-text-card__header" });
		setIcon(headerEl.createSpan({ cls: "canvas-bases-canvas-text-card__icon" }), "lucide-sticky-note");
		headerEl.createDiv({
			cls: "canvas-bases-canvas-text-card__title",
			text: this.t("view.card.textCardTitle"),
		});
		this.renderCardActionButton(headerEl, this.t("view.card.cardActions"), (event) => {
			this.openTextCardMenu(event, card);
		});

		const editorEl = textEl.createEl("textarea", {
			cls: "canvas-bases-canvas-text-card__editor",
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
			cls: "canvas-bases-canvas-card-action",
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
		entry: CanvasBasesEntrySnapshot | undefined
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		const tFile = file instanceof TFile ? file : null;
		const fileKind = getCanvasBasesFileKind(path, tFile);
		const isMarkdown = fileKind === "markdown";
		if (!isMarkdown) {
			this.destroyInlineEditor(getFileNodeId(path), false);
		}
		if (!(await this.flushInlineEditorsForPaths([path]))) {
			new Notice(this.t("notices.resolveInlineEditorConflict"));
			return;
		}

		const menu = new Menu();
		const options = this.getMaterializeOptions();
		const onTaskMenuUpdate = () => {
			void this.refreshInlineEditorsForPaths([path]).finally(() => {
				this.scheduleRender();
			});
		};
		let taskActionsAdded = false;
		if (isMarkdown && options.taskNotesMode !== "off" && options.taskNotesShowActions) {
			taskActionsAdded = await this.plugin.taskNotes.populateTaskMenu(menu, path, onTaskMenuUpdate);
			if (!taskActionsAdded) {
				const shown = await this.plugin.taskNotes.showTaskMenu(path, event, onTaskMenuUpdate);
				if (shown) return;
			}
		}
		if (taskActionsAdded) {
			menu.addSeparator();
		}

		menu.addItem((item) => {
			item
				.setTitle(
					isMarkdown
						? this.t("view.menu.openNote")
						: this.t("view.menu.openPath", { name: formatPathName(path) })
				)
				.setIcon(getCanvasBasesFileIcon(fileKind))
				.onClick(() => {
					void this.app.workspace.openLinkText(path, "", Keymap.isModEvent(event));
				});
		});
		this.addCardColorMenu(menu, getFileNodeId(path));

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

	private getStoredNodeColor(nodeId: string): string | undefined {
		return normalizeCanvasNodeColor(
			this.getNodePositions()[nodeId]?.color ??
				this.canvasRenderState?.nodePositions.get(nodeId)?.color
		);
	}

	private setStoredNodeColor(nodeId: string, color: string | undefined): void {
		const positions = this.getNodePositions();
		const element = this.canvasNodeElements.get(nodeId) ?? null;
		const currentPosition = getNodePositionWithElementGeometry(
			element,
			positions[nodeId] ?? this.canvasRenderState?.nodePositions.get(nodeId)
		);
		if (!currentPosition) return;

		const nextColor = normalizeCanvasNodeColor(color);
		const nextPosition: CanvasBasesNodePosition = { ...currentPosition };
		if (nextColor) {
			nextPosition.color = nextColor;
		} else {
			delete nextPosition.color;
		}

		positions[nodeId] = nextPosition;
		this.canvasRenderState?.nodePositions.set(nodeId, nextPosition);
		if (element) {
			setNodeColor(element, nextColor);
		}
		this.setNodePositions(positions);
	}

	private addCardColorMenu(menu: Menu, nodeId: string): void {
		this.addColorMenu(menu, {
			label: this.t("view.card.color"),
			currentColor: this.getStoredNodeColor(nodeId),
			defaultColor: DEFAULT_CARD_COLOR,
			swatches: CARD_COLOR_SWATCHES,
			clearLabel: this.t("view.menu.clearCardColor"),
			setLabel: this.t("view.menu.setCardColor"),
			getSwatchCssColor: getCanvasNodeCssColor,
			normalizeColor: normalizeCanvasNodeColor,
			onChange: (color) => {
				this.setStoredNodeColor(nodeId, color);
			},
		});
	}

	private addZoneColorMenu(
		menu: Menu,
		currentColor: string | undefined,
		onChange: (color: string | undefined) => void
	): void {
		this.addColorMenu(menu, {
			label: this.t("view.group.color"),
			currentColor: normalizeZoneColor(currentColor),
			defaultColor: DEFAULT_ACTIVE_GROUP_COLOR,
			swatches: ZONE_COLOR_SWATCHES,
			clearLabel: this.t("view.menu.clearCardColor"),
			setLabel: this.t("view.menu.setCardColor"),
			getSwatchCssColor: (color) => color,
			normalizeColor: normalizeZoneColor,
			onChange,
		});
	}

	private addColorMenu(menu: Menu, options: ColorMenuOptions): void {
		menu.addItem((item) => {
			item
				.setTitle(this.createColorMenuFragment(menu, options))
				.setIcon("lucide-palette");
		});
	}

	private createColorMenuFragment(menu: Menu, options: ColorMenuOptions): DocumentFragment {
		const currentColor = options.normalizeColor(options.currentColor);
		const fragment = createFragment();
		const menuEl = fragment.createDiv({ cls: "canvas-bases-color-menu" });
		const stopMenuPropagation = (event: Event) => {
			event.stopPropagation();
		};
		menuEl.addEventListener("pointerdown", stopMenuPropagation);
		menuEl.addEventListener("click", stopMenuPropagation);

		menuEl.createDiv({
			cls: "canvas-bases-color-menu__label",
			text: options.label,
		});
		const swatchesEl = menuEl.createDiv({ cls: "canvas-bases-color-menu__swatches" });
		this.addColorSwatchButton(swatchesEl, menu, options, undefined, currentColor);

		for (const color of options.swatches) {
			this.addColorSwatchButton(swatchesEl, menu, options, color, currentColor);
		}

		const customColor = getColorPickerValue(currentColor, options.defaultColor);
		const customLabelEl = swatchesEl.createEl("label", {
			cls: "canvas-bases-color-menu__custom",
			attr: {
				"aria-label": options.setLabel,
			},
		});
		customLabelEl.toggleClass(
			"is-active",
			Boolean(currentColor?.startsWith("#") && !options.swatches.includes(currentColor))
		);
		customLabelEl.style.setProperty("--canvas-bases-color-menu-custom", customColor);
		const inputEl = customLabelEl.createEl("input", {
			attr: {
				"aria-label": options.setLabel,
				type: "color",
				value: customColor,
			},
		});
		const applyCustomColor = () => {
			const nextColor = options.normalizeColor(inputEl.value);
			if (!nextColor) return;

			customLabelEl.style.setProperty("--canvas-bases-color-menu-custom", nextColor);
			options.onChange(nextColor);
		};
		inputEl.addEventListener("pointerdown", stopMenuPropagation);
		inputEl.addEventListener("click", stopMenuPropagation);
		inputEl.addEventListener("input", applyCustomColor);
		inputEl.addEventListener("change", () => {
			applyCustomColor();
			menu.hide();
		});

		return fragment;
	}

	private addColorSwatchButton(
		containerEl: HTMLElement,
		menu: Menu,
		options: ColorMenuOptions,
		color: string | undefined,
		currentColor: string | undefined
	): void {
		const isClear = typeof color === "undefined";
		const buttonEl = containerEl.createEl("button", {
			cls: [
				"canvas-bases-color-menu__swatch",
				isClear ? "is-clear" : "",
			].filter(Boolean),
			attr: {
				"aria-label": isClear ? options.clearLabel : `${options.setLabel} ${color}`,
				type: "button",
			},
		});
		buttonEl.toggleClass("is-active", isClear ? !currentColor : currentColor === color);
		const swatchColor = color ? options.getSwatchCssColor(color) : undefined;
		if (swatchColor) {
			buttonEl.style.setProperty("--canvas-bases-color-menu-swatch", swatchColor);
		}
		buttonEl.addEventListener("pointerdown", (event) => {
			event.stopPropagation();
		});
		buttonEl.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			options.onChange(color ? options.normalizeColor(color) : undefined);
			menu.hide();
		});
	}

	private openTextCardMenu(
		event: MouseEvent,
		card: CanvasBasesTextCardSnapshot | undefined
	): void {
		const menu = new Menu();
		if (card) {
			this.addCardColorMenu(menu, getTextCardNodeId(card.id));
		} else {
			menu.addItem((item) => {
				item
					.setTitle(this.t("view.menu.setCardColor"))
					.setIcon("lucide-palette")
					.setDisabled(true);
			});
		}
		menu.addSeparator();
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

	private openRenameManualGroupModal(group: CanvasBasesManualGroupSnapshot): void {
		new ManualGroupNameModal(
			this.app,
			{
				title: this.t("view.group.renameTitle"),
				initialValue: group.label,
				submitLabel: this.t("view.group.rename"),
				cancelLabel: this.t("common.cancel"),
			},
			(label) => {
				this.renameManualGroup(group.id, label);
			}
		).open();
	}

	private openConfigureManualActiveGroupModal(group: CanvasBasesManualGroupSnapshot): void {
		const zone = this.getCustomZoneConfig(group);
		new ActiveGroupSettingsModal(
			this.app,
			{
					title: this.t("view.group.activeTitle"),
					t: (key, params) => this.t(key, params),
					labelLabel: this.t("view.group.label"),
					actionLabel: this.t("view.group.action"),
					propertyLabel: this.t("view.group.property"),
					valueLabel: this.t("view.group.value"),
					updateModeLabel: this.t("view.group.updateMode"),
					valueTypeLabel: this.t("view.group.valueType"),
					colorLabel: this.t("view.group.color"),
					initialLabel: zone?.label ?? group.label,
					initialAction: zone?.action ?? DEFAULT_ZONE_ACTION,
					initialProperty: zone?.property ?? "note.status",
					initialValue: zone?.value ?? "",
					initialUpdateMode: zone?.updateMode ?? DEFAULT_ZONE_UPDATE_MODE,
					initialValueType: zone?.valueType ?? DEFAULT_ZONE_VALUE_TYPE,
					initialColor: zone?.color ?? DEFAULT_ACTIVE_GROUP_COLOR,
					actionOptions: this.getActiveGroupActionOptions(),
					propertyOptions: this.getActiveGroupPropertyOptions(),
					updateModeOptions: this.getActiveGroupUpdateModeOptions(),
					valueTypeOptions: this.getActiveGroupValueTypeOptions(),
				submitLabel: this.t("view.group.saveActiveGroup"),
				cancelLabel: this.t("common.cancel"),
			},
			(settings) => {
					this.configureManualActiveGroup(
						{ ...group, label: settings.label?.trim() || group.label },
						settings.action,
						settings.property,
						settings.value,
						settings.updateMode,
					settings.valueType,
					settings.color
				);
			}
		).open();
	}

	private openConfigureDataActiveGroupModal(group: CanvasBasesGroupSnapshot): void {
		if (!group.property || typeof group.value !== "string") return;

		const zone = this.getDataZoneConfig(group);
		new ActiveGroupSettingsModal(
			this.app,
			{
					title: this.t("view.group.activeTitle"),
					t: (key, params) => this.t(key, params),
					actionLabel: this.t("view.group.action"),
					propertyLabel: this.t("view.group.property"),
					valueLabel: this.t("view.group.value"),
					updateModeLabel: this.t("view.group.updateMode"),
					valueTypeLabel: this.t("view.group.valueType"),
					colorLabel: this.t("view.group.color"),
					initialAction: DEFAULT_ZONE_ACTION,
					initialProperty: group.property,
					initialValue: group.value,
					initialUpdateMode: zone?.updateMode ?? DEFAULT_ZONE_UPDATE_MODE,
					initialValueType: zone?.valueType ?? DEFAULT_ZONE_VALUE_TYPE,
					initialColor: zone?.color ?? DEFAULT_ACTIVE_GROUP_COLOR,
					actionOptions: this.getActiveGroupActionOptions(),
					propertyOptions: this.getActiveGroupPropertyOptions(),
					updateModeOptions: this.getActiveGroupUpdateModeOptions(),
					valueTypeOptions: this.getActiveGroupValueTypeOptions(),
				submitLabel: this.t("view.group.saveActiveGroup"),
					cancelLabel: this.t("common.cancel"),
					readOnlyPropertyAndValue: true,
					readOnlyAction: true,
				},
			(settings) => {
				this.configureDataActiveGroup(
					group,
					settings.updateMode,
					settings.valueType,
					settings.color
				);
			}
		).open();
	}

	private openGroupMenu(event: MouseEvent, group: CanvasBasesManualGroupSnapshot): void {
		const menu = new Menu();
		const isActive = this.isManualGroupActive(group);
		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.renameGroup"))
				.setIcon("lucide-pencil")
				.onClick(() => {
					this.openRenameManualGroupModal(group);
				});
		});
		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.configureActiveGroup"))
				.setIcon("lucide-zap")
				.onClick(() => {
					this.openConfigureManualActiveGroupModal(group);
				});
		});
		if (isActive) {
			this.addZoneColorMenu(
				menu,
				this.getCustomZoneConfig(group)?.color,
				(color) => {
					this.setManualActiveGroupColor(group, color);
				}
			);
			menu.addItem((item) => {
				item
					.setTitle(this.t("view.menu.deactivateActiveGroup"))
					.setIcon("lucide-zap-off")
					.onClick(() => {
						this.deactivateManualGroup(group);
					});
			});
		}
		menu.addSeparator();
		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.removeGroup"))
				.setIcon("lucide-trash-2")
				.setWarning(true)
				.onClick(() => {
					this.removeManualGroup(group.id);
				});
		});
		menu.showAtMouseEvent(event);
	}

	private openDataGroupMenu(event: MouseEvent, group: CanvasBasesGroupSnapshot): void {
		const menu = new Menu();
		const isActive = this.isActiveGroup(group);

		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.fitGroupToCards"))
				.setIcon("lucide-maximize-2")
				.setDisabled(!this.canFitDataGroupToMembers(group))
				.onClick(() => {
					this.fitDataGroupToMembers(group);
				});
		});
		menu.addSeparator();
		if (isActive) {
			menu.addItem((item) => {
				item
					.setTitle(this.t("view.menu.configureActiveGroup"))
					.setIcon("lucide-palette")
					.onClick(() => {
						this.openConfigureDataActiveGroupModal(group);
					});
			});
			this.addZoneColorMenu(
				menu,
				this.getDataZoneConfig(group)?.color,
				(color) => {
					this.setDataActiveGroupColor(group, color);
				}
			);
		}
		menu.addItem((item) => {
			item
				.setTitle(
					isActive
						? this.t("view.menu.deactivateActiveGroup")
						: this.t("view.menu.activateGroup")
				)
				.setIcon(isActive ? "lucide-zap-off" : "lucide-zap")
				.setDisabled(!isActive && !this.canActivateGroup(group))
				.onClick(() => {
					if (isActive) {
						this.deactivateGroup(group);
					} else {
						this.activateGroup(group);
					}
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
		const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
		const targetFile = this.app.vault.getAbstractFileByPath(targetPath);
		const canCreateTaskLink =
			isCanvasBasesMarkdownFile(sourcePath, sourceFile instanceof TFile ? sourceFile : null) &&
			isCanvasBasesMarkdownFile(targetPath, targetFile instanceof TFile ? targetFile : null);

		if (canCreateTaskLink && this.plugin.taskNotes.getTaskLinkingEnabled()) {
			this.addMenuSectionLabel(
				menu,
				this.t("view.menu.dependencyLinks"),
				"lucide-arrow-right-left"
			);
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
			this.addMenuSectionLabel(menu, this.t("view.menu.subtaskLinks"), "lucide-git-branch");
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

		this.addMenuSectionLabel(menu, this.t("view.menu.propertyLinks"), "lucide-link");
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

	private addMenuSectionLabel(menu: Menu, title: string, icon: string): void {
		menu.addItem((item) => {
			item
				.setTitle(title)
				.setIcon(icon)
				.setDisabled(true);
		});
	}

	private openEdgeMenu(event: MouseEvent, relationship: CanvasBasesRelationship): void {
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
			() => this.ensureTaskRelationshipRendering("dependency"),
			[blockedPath]
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
			},
			[blockedPath]
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
			() => this.ensureTaskRelationshipRendering("project"),
			[childPath]
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
			},
			[childPath]
		);
	}

	private async runLinkMutation(
		mutation: () => Promise<boolean>,
		successMessage: string,
		onSuccess?: () => void,
		affectedPaths: string[] = []
	): Promise<void> {
		try {
			if (!(await this.flushInlineEditorsForPaths(affectedPaths))) {
				new Notice(this.t("notices.resolveInlineEditorConflict"));
				return;
			}

			const changed = await mutation();
			if (!changed) {
				new Notice(this.t("notices.linkActionUnavailable"));
				return;
			}

			onSuccess?.();
			this.taskEdgeCache = null;
			await this.refreshInlineEditorsForPaths(affectedPaths);
			this.scheduleRender();
			new Notice(successMessage);
		} catch (error) {
			new Notice(this.t("notices.couldNotUpdateLink", { message: getErrorMessage(error) }));
		}
	}

	private removeRelationshipsFromLiveView(
		matchesRelationship: (relationship: CanvasBasesRelationship) => boolean
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

		new PropertyLinkSuggestModal(
			this.app,
			properties,
			(key, params) => this.t(key, params),
			(property) => {
				void this.addPropertyLink(sourcePath, targetPath, property);
			}
		).open();
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
		if (!isCanvasBasesMarkdownFile(sourcePath, file)) {
			new Notice(this.t("notices.linkActionUnavailable"));
			return;
		}

		try {
			if (!(await this.flushInlineEditorsForPaths([sourcePath]))) {
				new Notice(this.t("notices.resolveInlineEditorConflict"));
				return;
			}

			const link = createNoteWikiLink(targetPath);
			await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
				frontmatter[propertyName] = appendPropertyLinkValue(
					frontmatter[propertyName],
					link,
					(value) => this.valueReferencesPath(value, sourcePath, targetPath)
				);
			});
			this.ensurePropertyEdgeRendering(propertyName);
			await this.refreshInlineEditorsForPaths([sourcePath]);
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
		if (!isCanvasBasesMarkdownFile(sourcePath, file)) {
			new Notice(this.t("notices.linkActionUnavailable"));
			return;
		}

		try {
			if (!(await this.flushInlineEditorsForPaths([sourcePath]))) {
				new Notice(this.t("notices.resolveInlineEditorConflict"));
				return;
			}

			await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
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
			await this.refreshInlineEditorsForPaths([sourcePath]);
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
		entry: CanvasBasesEntrySnapshot | undefined
	): void {
		const propertiesEl = this.createCardPropertiesElement(entry);
		if (propertiesEl) {
			containerEl.appendChild(propertiesEl);
		}
	}

	private createCardPropertiesElement(
		entry: CanvasBasesEntrySnapshot | undefined
	): HTMLElement | null {
		if (!entry || !entry.properties || entry.properties.length === 0) return null;

		const propertiesEl = createDiv({
			cls: "canvas-bases-canvas-file__properties",
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
				cls: "canvas-bases-canvas-file-property",
			});
			if (taskPropertyKind) {
				propertyEl.addClass("is-tasknotes-property");
				propertyEl.setAttr("data-canvas-bases-task-property-kind", taskPropertyKind);
			}
			propertyEl.toggleClass("is-empty", property.isEmpty);
			setTooltip(propertyEl, `${property.displayName}: ${property.text}`);
			propertyEl.createDiv({
				cls: "canvas-bases-canvas-file-property__label",
				text: property.displayName,
			});
			const valueEl = propertyEl.createDiv({
				cls: "canvas-bases-canvas-file-property__value",
			});
			valueEl.toggleClass("is-empty", property.isEmpty);
			this.renderPropertyValue(valueEl, property);
		}

		return propertiesEl;
	}

	private renderPropertyValue(
		containerEl: HTMLElement,
		property: CanvasBasesEntryPropertySnapshot
	): void {
		if (!property.value || property.isEmpty) {
			containerEl.setText(property.text);
			return;
		}

		try {
			property.value.renderTo(containerEl, { hoverPopover: null } as RenderContext);
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
		svgEl.addClass("canvas-bases-canvas-edges");
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
		markerPathEl.addClass("canvas-bases-canvas-edge__arrow");
		markerPathEl.setAttribute("d", "M 0 0 L 9 5 L 0 10 z");
		markerEl.appendChild(markerPathEl);
		defsEl.appendChild(markerEl);
		svgEl.appendChild(defsEl);

		for (const edge of edges) {
			const groupEl = createSvgElement("g");
			groupEl.addClass("canvas-bases-canvas-edge");
			groupEl.setAttribute("data-canvas-bases-edge-id", edge.id);
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
			pathEl.addClass("canvas-bases-canvas-edge__path");
			pathEl.setAttribute("marker-end", `url(#${this.edgeMarkerId})`);
			groupEl.appendChild(pathEl);

			let labelGroupEl: SVGGElement | null = null;
			let labelRectEl: SVGRectElement | null = null;
			let labelTextEl: SVGTextElement | null = null;
			if (edge.label) {
				labelGroupEl = createSvgElement("g");
				labelGroupEl.addClass("canvas-bases-canvas-edge-label");
				labelRectEl = createSvgElement("rect");
				labelRectEl.addClass("canvas-bases-canvas-edge-label__background");
				labelTextEl = createSvgElement("text");
				labelTextEl.addClass("canvas-bases-canvas-edge-label__text");
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
			const geometry = buildCanvasBasesEdgeGeometry(renderedEdge.edge, nodePositions);
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
		snapshot: CanvasBasesViewSnapshot,
		options: MaterializeOptions,
		renderToken: number,
		planeEl: HTMLElement,
		genericEdges: CanvasEdge[],
		genericEdgeRelationships: Map<string, CanvasBasesRelationship>,
		bounds: { width: number; height: number }
	): Promise<void> {
		if (options.taskNotesMode === "off") return;

		const paths = getSnapshotPaths(snapshot).filter((path) => {
			const file = this.app.vault.getAbstractFileByPath(path);
			return isCanvasBasesMarkdownFile(path, file instanceof TFile ? file : null);
		});
		const entriesByPath = getSnapshotEntriesByPath(snapshot);
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

		const taskCanvas = buildCanvasBasesCanvas(snapshot, options, taskRelationships, {});
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

	private refreshRenderedCardProperties(
		snapshot: CanvasBasesViewSnapshot,
		paths = getSnapshotPaths(snapshot)
	): void {
		const state = this.canvasRenderState;
		if (!state) return;

		const entriesByPath = getSnapshotEntriesByPath(snapshot);
		for (const path of paths) {
			const entry = entriesByPath.get(path);
			if (!entry) continue;

			state.entriesByPath.set(path, entry);
			const cardEl = this.canvasNodeElements.get(getFileNodeId(path));
			if (!cardEl) continue;

			this.replaceCardProperties(cardEl, entry);
			const taskCard = state.taskCards.get(path);
			if (taskCard) {
				this.applyTaskCard(taskCard, entry);
			}
		}
	}

	private replaceCardProperties(
		cardEl: HTMLElement,
		entry: CanvasBasesEntrySnapshot | undefined
	): void {
		const pathEl = cardEl.querySelector(".canvas-bases-canvas-file__path");
		if (!(pathEl instanceof HTMLElement)) return;

		cardEl.querySelector(".canvas-bases-canvas-file__properties")?.remove();
		const propertiesEl = this.createCardPropertiesElement(entry);
		if (propertiesEl) {
			pathEl.insertAdjacentElement("afterend", propertiesEl);
		}
	}

	private async refreshRenderedTaskCardsForPaths(paths: string[]): Promise<void> {
		const state = this.canvasRenderState;
		if (!state || paths.length === 0) return;

		const options = this.getMaterializeOptions();
		if (
			options.taskNotesMode === "off" ||
			!options.taskNotesShowBadges ||
			!this.plugin.taskNotes.getTaskCardsEnabled()
		) {
			return;
		}

		const visiblePaths = new Set(state.filePathsByNodeId.values());
		const pathsToRefresh = [...new Set(paths)]
			.filter((path) => visiblePaths.has(path))
			.filter((path) => {
				const file = this.app.vault.getAbstractFileByPath(path);
				return isCanvasBasesMarkdownFile(path, file instanceof TFile ? file : null);
			});
		if (pathsToRefresh.length === 0) return;

		const taskCards = await this.plugin.taskNotes.getTaskCards(pathsToRefresh);
		if (this.canvasRenderState !== state) return;

		for (const path of pathsToRefresh) {
			const taskCard = taskCards.get(path);
			if (taskCard) {
				state.taskCards.set(path, taskCard);
				this.applyTaskCard(taskCard, state.entriesByPath.get(path));
			} else {
				state.taskCards.delete(path);
				this.clearTaskCard(path);
			}
		}
	}

	private applyTaskCard(
		taskCard: CanvasBasesTaskCard,
		entry: CanvasBasesEntrySnapshot | undefined
	): void {
		const cardEl = this.canvasNodeElements.get(getFileNodeId(taskCard.path));
		if (!cardEl) return;
		const visibleKinds = this.getVisibleTaskPropertyKinds(entry);

		cardEl.addClass("is-tasknotes-task");
		cardEl.toggleClass("is-tasknotes-completed", taskCard.isCompleted);
		cardEl.toggleClass("is-tasknotes-archived", taskCard.isArchived);
		cardEl.toggleClass("is-tasknotes-blocked", taskCard.isBlocked);
		cardEl.toggleClass("is-tasknotes-blocking", taskCard.isBlocking);
		cardEl.toggleClass("is-tasknotes-tracking", taskCard.isTracking);
		if (taskCard.status.color) {
			cardEl.style.setProperty("--canvas-bases-task-status-color", taskCard.status.color);
		} else {
			cardEl.style.removeProperty("--canvas-bases-task-status-color");
		}

		const titleEl = cardEl.querySelector(".canvas-bases-canvas-file__title");
		if (titleEl instanceof HTMLElement) {
			titleEl.setText(taskCard.title);
		}

		cardEl.querySelector(".canvas-bases-canvas-task")?.remove();
		const pathEl = cardEl.querySelector(".canvas-bases-canvas-file__path");
		if (!(pathEl instanceof HTMLElement)) return;

		const taskEl = createDiv({ cls: "canvas-bases-canvas-task" });
		const primaryEl = taskEl.createDiv({ cls: "canvas-bases-canvas-task__primary" });
		const renderedKinds = new Set<CanvasBasesTaskPropertyKind>();

		if (visibleKinds.has("status")) {
			this.renderTaskBadge(primaryEl, taskCard.status, "status");
			renderedKinds.add("status");
		}
		if (visibleKinds.has("priority")) {
			this.renderTaskBadge(primaryEl, taskCard.priority, "priority");
			renderedKinds.add("priority");
		}

		const detailBadges = taskCard.badges.filter(
			(badge) => badge.kind === "activeTimeTracking" || visibleKinds.has(badge.kind)
		);
		if (detailBadges.length > 0) {
			const badgesEl = taskEl.createDiv({ cls: "canvas-bases-canvas-task__badges" });
			for (const badge of detailBadges) {
				this.renderTaskBadge(badgesEl, badge, "detail");
				renderedKinds.add(badge.kind);
			}
		}

		if (renderedKinds.size === 0) return;

		this.removeGenericTaskProperties(cardEl, renderedKinds);
		pathEl.insertAdjacentElement("afterend", taskEl);
	}

	private clearTaskCard(path: string): void {
		const cardEl = this.canvasNodeElements.get(getFileNodeId(path));
		if (!cardEl) return;

		cardEl.classList.remove(
			"is-tasknotes-task",
			"is-tasknotes-completed",
			"is-tasknotes-archived",
			"is-tasknotes-blocked",
			"is-tasknotes-blocking",
			"is-tasknotes-tracking"
		);
		cardEl.style.removeProperty("--canvas-bases-task-status-color");
		cardEl.querySelector(".canvas-bases-canvas-task")?.remove();
	}

	private renderTaskBadge(
		containerEl: HTMLElement,
		badge: CanvasBasesTaskCard["status"],
		kind: "detail" | "priority" | "status"
	): void {
		const badgeEl = containerEl.createDiv({
			cls: `canvas-bases-canvas-task-badge canvas-bases-canvas-task-badge--${kind}`,
		});
		badgeEl.setAttr("data-canvas-bases-task-property-kind", badge.kind);
		if (badge.tone) {
			badgeEl.addClass(`is-${badge.tone}`);
		}
		if (badge.color) {
			badgeEl.style.setProperty("--canvas-bases-task-badge-color", badge.color);
		}
		setTooltip(badgeEl, `${badge.label}: ${badge.value}`);
		badgeEl.createSpan({
			cls: "canvas-bases-canvas-task-badge__label",
			text: badge.label,
		});
		if (badge.value !== badge.label) {
			badgeEl.createSpan({
				cls: "canvas-bases-canvas-task-badge__value",
				text: badge.value,
			});
		}
	}

	private getVisibleTaskPropertyKinds(
		entry: CanvasBasesEntrySnapshot | undefined
	): Set<CanvasBasesTaskPropertyKind> {
		const kinds = new Set<CanvasBasesTaskPropertyKind>();
		for (const property of entry?.properties ?? []) {
			const kind = this.plugin.taskNotes.getPropertyKind(property.id);
			if (kind) kinds.add(kind);
		}

		return kinds;
	}

	private removeGenericTaskProperties(
		cardEl: HTMLElement,
		kinds: Set<CanvasBasesTaskPropertyKind>
	): void {
		const propertiesEl = cardEl.querySelector(".canvas-bases-canvas-file__properties");
		if (!(propertiesEl instanceof HTMLElement)) return;

		for (const propertyEl of propertiesEl.querySelectorAll(".canvas-bases-canvas-file-property")) {
			if (!propertyEl.instanceOf(HTMLElement)) continue;
			const kind = propertyEl.dataset.canvasBasesTaskPropertyKind as
				| CanvasBasesTaskPropertyKind
				| undefined;
			if (kind && kinds.has(kind)) {
				propertyEl.remove();
			}
		}

		if (propertiesEl.querySelector(".canvas-bases-canvas-file-property") === null) {
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

	private getRenderedNodePositions(): Map<string, CanvasBasesNodePosition> {
		const positions = new Map<string, CanvasBasesNodePosition>();
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
		this.clearDragListeners();
		this.clearSelectedNodes();
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
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!isCanvasBasesMarkdownFile(path, file instanceof TFile ? file : null)) {
			this.destroyInlineEditor(nodeId, false);
			return;
		}

		const existingState = this.inlineEditors.get(nodeId);
		if (existingState && existingState.path === path) {
			containerEl.appendChild(existingState.shellEl);
			containerEl.appendChild(existingState.statusEl);
			return;
		}

		if (existingState) {
			this.destroyInlineEditor(nodeId, true);
		}

		const editorShellEl = containerEl.createDiv({ cls: "canvas-bases-canvas-file__editor-shell" });
		const statusEl = containerEl.createDiv({ cls: "canvas-bases-canvas-file__status" });

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
		if (!isCanvasBasesMarkdownFile(path, file)) {
			statusEl.setText(this.t("view.editor.error"));
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
				cls: "canvas-bases-canvas-file__markdown-editor",
				attr: {
					"aria-label": this.t("view.editor.editPath", { path }),
				},
			});
			let creationOriginal = content;
			const editor = await createCanvasBasesInlineMarkdownEditor(this.app, editorContainerEl, {
				value: content,
				placeholder: "",
				file,
				onChange: (value) => {
					const state = this.inlineEditors.get(nodeId);
					const original = state?.original ?? creationOriginal;
					const isDirty = value !== original;
					editorContainerEl.toggleClass("is-dirty", isDirty);
					containerEl.toggleClass("is-dirty", isDirty);
					if (state?.externalConflict) {
						this.cancelInlineEditorAutosave(state);
						this.markInlineEditorExternalConflict(nodeId, state);
						return;
					}
					statusEl.setText(isDirty ? this.t("view.editor.unsaved") : "");
					if (state) {
						this.clearInlineEditorSavedStatusTimer(state);
						if (isDirty) {
							this.scheduleInlineEditorAutosave(nodeId);
						} else {
							this.cancelInlineEditorAutosave(state);
						}
					}
				},
				onSubmit: () => {
					void this.saveInlineEditorState(nodeId, {
						allowConflictOverwrite: true,
					});
				},
				onEscape: () => {
					const state = this.inlineEditors.get(nodeId);
					if (!state) return;
					this.cancelInlineEditorAutosave(state);
					this.clearInlineEditorSavedStatusTimer(state);
					state.externalConflict = false;
					state.pendingSaveValue = null;
					state.pendingSaveAllowConflictOverwrite = false;
					state.editor.setValue(state.original);
					editorContainerEl.removeClass("is-dirty");
					editorContainerEl.removeClass("is-stale");
					containerEl.removeClass("is-dirty");
					containerEl.removeClass("is-stale");
					statusEl.setText("");
					state.editor.blur();
				},
				onBlur: () => {
					void this.saveInlineEditorState(nodeId).finally(() => {
						this.flushDeferredInlineEditorRender();
					});
				},
			});

			creationOriginal = content;
			this.inlineEditors.set(nodeId, {
				path,
				editor,
				shellEl: containerEl,
				statusEl,
				original: content,
				autosaveTimer: null,
				pendingSaveValue: null,
				pendingSaveAllowConflictOverwrite: false,
				savePromise: null,
				savedStatusTimer: null,
				externalConflict: false,
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
			cls: "canvas-bases-canvas-file__editor",
			attr: {
				"aria-label": this.t("view.editor.editPath", { path }),
				spellcheck: "false",
			},
		});
		editorEl.value = value;
		editorEl.dataset.canvasBasesOriginal = value;
		editorEl.disabled = disabled;
		if (disabled) {
			editorEl.setAttr("placeholder", this.t("view.editor.missingFile"));
		}

		let autosaveTimer: number | null = null;
		const cancelAutosave = () => {
			if (autosaveTimer === null) return;

			window.clearTimeout(autosaveTimer);
			autosaveTimer = null;
		};

		let scheduleAutosave = () => {};
		const saveCurrentValue = () => {
			void this.saveInlineEditor(path, editorEl, statusEl).then(() => {
				if (!editorEl.isConnected || editorEl.disabled) return;

				const original = editorEl.dataset.canvasBasesOriginal ?? "";
				if (editorEl.value !== original) {
					scheduleAutosave();
				}
			});
		};
		scheduleAutosave = () => {
			cancelAutosave();
			autosaveTimer = window.setTimeout(() => {
				autosaveTimer = null;
				saveCurrentValue();
			}, INLINE_EDITOR_AUTOSAVE_DELAY_MS);
		};

		const flushAutosave = () => {
			cancelAutosave();
			saveCurrentValue();
		};

		this.addElementEvent(editorEl, "pointerdown", (event) => {
			event.stopPropagation();
		});
		this.addElementEvent(editorEl, "dblclick", (event) => {
			event.stopPropagation();
		});
		this.addElementEvent(editorEl, "input", () => {
			const original = editorEl.dataset.canvasBasesOriginal ?? "";
			const isDirty = editorEl.value !== original;
			editorEl.toggleClass("is-dirty", isDirty);
			containerEl.toggleClass("is-dirty", isDirty);
			statusEl.setText(isDirty ? this.t("view.editor.unsaved") : "");
			if (isDirty) {
				scheduleAutosave();
			} else {
				cancelAutosave();
			}
		});
		this.addElementEvent(editorEl, "keydown", (event) => {
			event.stopPropagation();
			if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
				event.preventDefault();
				flushAutosave();
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				cancelAutosave();
				editorEl.value = editorEl.dataset.canvasBasesOriginal ?? editorEl.value;
				editorEl.removeClass("is-dirty");
				containerEl.removeClass("is-dirty");
				statusEl.setText("");
				editorEl.blur();
			}
		});
		this.addElementEvent(editorEl, "blur", () => {
			flushAutosave();
			this.flushDeferredInlineEditorRender();
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
		if (!isCanvasBasesMarkdownFile(path, file)) {
			editorEl.disabled = true;
			statusEl.setText(this.t("view.editor.error"));
			return;
		}

		try {
			const content = await this.app.vault.read(file);
			if (!editorEl.isConnected) return;
			editorEl.value = content;
			editorEl.dataset.canvasBasesOriginal = content;
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

		const original = editorEl.dataset.canvasBasesOriginal ?? "";
		const value = editorEl.value;
		if (value === original) return;

		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			statusEl.setText(this.t("view.editor.missing"));
			return;
		}
		if (!isCanvasBasesMarkdownFile(path, file)) {
			editorEl.disabled = true;
			statusEl.setText(this.t("view.editor.error"));
			return;
		}

		statusEl.setText(this.t("view.editor.saving"));
		await this.app.vault.modify(file, value);
		editorEl.dataset.canvasBasesOriginal = value;
		const isDirty = editorEl.value !== value;
		editorEl.toggleClass("is-dirty", isDirty);
		editorEl.parentElement?.toggleClass("is-dirty", isDirty);
		statusEl.setText(isDirty ? this.t("view.editor.unsaved") : this.t("view.editor.saved"));
		if (isDirty) return;

		window.setTimeout(() => {
			if (statusEl.isConnected && statusEl.getText() === this.t("view.editor.saved")) {
				statusEl.setText("");
			}
		}, INLINE_EDITOR_SAVED_STATUS_DELAY_MS);
	}

	private saveInlineEditorState(
		nodeId: string,
		options: { allowConflictOverwrite?: boolean } = {}
	): Promise<boolean> {
		return this.flushInlineEditorAutosave(nodeId, options);
	}

	private scheduleInlineEditorAutosave(nodeId: string): void {
		const state = this.inlineEditors.get(nodeId);
		if (!state) return;
		if (state.externalConflict) {
			this.markInlineEditorExternalConflict(nodeId, state);
			return;
		}

		this.cancelInlineEditorAutosave(state);
		state.autosaveTimer = window.setTimeout(() => {
			state.autosaveTimer = null;
			void this.saveInlineEditorValue(nodeId, state, state.editor.getValue());
		}, INLINE_EDITOR_AUTOSAVE_DELAY_MS);
	}

	private flushInlineEditorAutosave(
		nodeId: string,
		options: { allowConflictOverwrite?: boolean } = {}
	): Promise<boolean> {
		const state = this.inlineEditors.get(nodeId);
		if (!state) return Promise.resolve(true);

		this.cancelInlineEditorAutosave(state);
		return this.saveInlineEditorValue(nodeId, state, state.editor.getValue(), options);
	}

	private cancelInlineEditorAutosave(state: InlineEditorState): void {
		if (state.autosaveTimer === null) return;

		window.clearTimeout(state.autosaveTimer);
		state.autosaveTimer = null;
	}

	private saveInlineEditorValue(
		nodeId: string,
		state: InlineEditorState,
		value: string,
		options: { allowConflictOverwrite?: boolean } = {}
	): Promise<boolean> {
		if (value === state.original && state.savePromise === null) {
			state.externalConflict = false;
			state.pendingSaveValue = null;
			state.pendingSaveAllowConflictOverwrite = false;
			this.syncInlineEditorDirtyState(nodeId, state);
			state.statusEl.setText("");
			return Promise.resolve(true);
		}

		if (state.externalConflict && !options.allowConflictOverwrite) {
			this.markInlineEditorExternalConflict(nodeId, state);
			return Promise.resolve(false);
		}

		state.pendingSaveValue = value;
		state.pendingSaveAllowConflictOverwrite = Boolean(options.allowConflictOverwrite);
		if (state.savePromise === null) {
			state.savePromise = this.runInlineEditorSaveQueue(nodeId, state);
		}

		return state.savePromise;
	}

	private async runInlineEditorSaveQueue(
		nodeId: string,
		state: InlineEditorState
	): Promise<boolean> {
		let saved = true;
		try {
			while (state.pendingSaveValue !== null) {
				const value = state.pendingSaveValue;
				const allowConflictOverwrite = state.pendingSaveAllowConflictOverwrite;
				state.pendingSaveValue = null;
				state.pendingSaveAllowConflictOverwrite = false;
				if (value === state.original) {
					state.externalConflict = false;
					this.syncInlineEditorDirtyState(nodeId, state);
					continue;
				}

				const didSave = await this.persistInlineEditorValue(
					nodeId,
					state,
					value,
					{ allowConflictOverwrite }
				);
				if (!didSave) {
					saved = false;
					break;
				}
			}
		} finally {
			state.savePromise = null;
		}

		return saved;
	}

	private async persistInlineEditorValue(
		nodeId: string,
		state: InlineEditorState,
		value: string,
		options: { allowConflictOverwrite?: boolean } = {}
	): Promise<boolean> {
		if (state.externalConflict && !options.allowConflictOverwrite) {
			this.markInlineEditorExternalConflict(nodeId, state);
			return false;
		}

		const file = this.app.vault.getAbstractFileByPath(state.path);
		if (!(file instanceof TFile)) {
			state.statusEl.setText(this.t("view.editor.missing"));
			return false;
		}
		if (!isCanvasBasesMarkdownFile(state.path, file)) {
			state.statusEl.setText(this.t("view.editor.error"));
			this.destroyInlineEditor(nodeId, false);
			return false;
		}

		this.clearInlineEditorSavedStatusTimer(state);
		state.statusEl.setText(this.t("view.editor.saving"));
		await this.app.vault.modify(file, value);
		state.original = value;
		state.externalConflict = false;
		const isDirty = this.syncInlineEditorDirtyState(nodeId, state);
		state.statusEl.setText(isDirty ? this.t("view.editor.unsaved") : this.t("view.editor.saved"));
		if (isDirty) {
			if (this.inlineEditors.get(nodeId) === state && state.pendingSaveValue === null) {
				this.scheduleInlineEditorAutosave(nodeId);
			}
			return true;
		}

		this.scheduleInlineEditorSavedStatusClear(state);
		return true;
	}

	private syncInlineEditorDirtyState(nodeId: string, state: InlineEditorState): boolean {
		if (this.inlineEditors.get(nodeId) !== state) return false;

		const isDirty = state.editor.getValue() !== state.original;
		const editorEl = state.shellEl.querySelector(".canvas-bases-canvas-file__markdown-editor");
		if (editorEl instanceof HTMLElement) {
			editorEl.toggleClass("is-dirty", isDirty);
			editorEl.toggleClass("is-stale", state.externalConflict);
		}
		state.shellEl.toggleClass("is-dirty", isDirty);
		state.shellEl.toggleClass("is-stale", state.externalConflict);
		return isDirty;
	}

	private clearInlineEditorSavedStatusTimer(state: InlineEditorState): void {
		if (state.savedStatusTimer === null) return;

		window.clearTimeout(state.savedStatusTimer);
		state.savedStatusTimer = null;
	}

	private scheduleInlineEditorSavedStatusClear(state: InlineEditorState): void {
		this.clearInlineEditorSavedStatusTimer(state);
		state.savedStatusTimer = window.setTimeout(() => {
			state.savedStatusTimer = null;
			if (state.statusEl.isConnected && state.statusEl.getText() === this.t("view.editor.saved")) {
				state.statusEl.setText("");
			}
		}, INLINE_EDITOR_SAVED_STATUS_DELAY_MS);
	}

	private getInlineEditorEntriesForPaths(
		paths: string[]
	): Array<[string, InlineEditorState]> {
		const pathSet = new Set(paths);
		return [...this.inlineEditors.entries()].filter(([, state]) => pathSet.has(state.path));
	}

	private async flushInlineEditorsForPaths(paths: string[]): Promise<boolean> {
		const results = await Promise.all(
			this.getInlineEditorEntriesForPaths(paths).map(([nodeId]) =>
				this.flushInlineEditorAutosave(nodeId)
			)
		);
		return results.every(Boolean);
	}

	private async refreshAllInlineEditorsFromDisk(): Promise<void> {
		await Promise.all(
			[...this.inlineEditors.entries()].map(([nodeId, state]) =>
				this.refreshInlineEditorFromDisk(nodeId, state)
			)
		);
	}

	private async refreshInlineEditorsForPaths(paths: string[]): Promise<void> {
		await Promise.all(
			this.getInlineEditorEntriesForPaths(paths).map(([nodeId, state]) =>
				this.refreshInlineEditorFromDisk(nodeId, state)
			)
		);
	}

	private async refreshInlineEditorFromDisk(
		nodeId: string,
		state: InlineEditorState
	): Promise<void> {
		if (state.savePromise) {
			await state.savePromise;
		}
		if (this.inlineEditors.get(nodeId) !== state) return;

		const file = this.app.vault.getAbstractFileByPath(state.path);
		if (!(file instanceof TFile)) {
			state.statusEl.setText(this.t("view.editor.missing"));
			return;
		}
		if (!isCanvasBasesMarkdownFile(state.path, file)) {
			this.destroyInlineEditor(nodeId, false);
			return;
		}

		const diskValue = await this.app.vault.read(file);
		if (this.inlineEditors.get(nodeId) !== state) return;
		if (diskValue === state.original && !state.externalConflict) return;

		const editorValue = state.editor.getValue();
		const isDirty =
			editorValue !== state.original ||
			state.pendingSaveValue !== null ||
			state.externalConflict;
		if (isDirty && editorValue !== diskValue) {
			this.cancelInlineEditorAutosave(state);
			this.clearInlineEditorSavedStatusTimer(state);
			state.original = diskValue;
			state.externalConflict = true;
			this.markInlineEditorExternalConflict(nodeId, state);
			return;
		}

		const wasFocused = this.isInlineEditorFocused(state);
		this.cancelInlineEditorAutosave(state);
		this.clearInlineEditorSavedStatusTimer(state);
		state.original = diskValue;
		state.pendingSaveValue = null;
		state.pendingSaveAllowConflictOverwrite = false;
		state.externalConflict = false;
		state.editor.setValue(diskValue);
		this.syncInlineEditorDirtyState(nodeId, state);
		state.statusEl.setText("");
		if (wasFocused) {
			state.editor.focus();
		}
	}

	private markInlineEditorExternalConflict(nodeId: string, state: InlineEditorState): void {
		this.syncInlineEditorDirtyState(nodeId, state);
		state.statusEl.setText(this.t("view.editor.fileChanged"));
	}

	private isInlineEditorFocused(state: InlineEditorState): boolean {
		const activeElement = this.rootEl?.ownerDocument.activeElement;
		return activeElement?.instanceOf(HTMLElement) === true && state.shellEl.contains(activeElement);
	}

	private hasFocusedInlineEditor(): boolean {
		const activeElement = this.rootEl?.ownerDocument.activeElement;
		if (!(activeElement instanceof HTMLElement)) return false;

		for (const state of this.inlineEditors.values()) {
			if (state.shellEl.contains(activeElement)) return true;
		}

		return false;
	}

	private flushDeferredInlineEditorRender(): void {
		if (!this.deferredInlineEditorRender || this.hasFocusedInlineEditor()) return;

		this.deferredInlineEditorRender = false;
		this.scheduleRender();
	}

	private destroyInlineEditor(nodeId: string, saveDirty: boolean): void {
		const state = this.inlineEditors.get(nodeId);
		if (!state) return;

		this.cancelInlineEditorAutosave(state);
		this.clearInlineEditorSavedStatusTimer(state);
		const value = state.editor.getValue();
		if (saveDirty && value !== state.original && isCanvasBasesMarkdownFile(state.path)) {
			void this.saveInlineEditorValue(nodeId, state, value);
		}
		state.editor.destroy();
		this.inlineEditors.delete(nodeId);
		this.flushDeferredInlineEditorRender();
	}

	private destroyAllInlineEditors(saveDirty: boolean): void {
		for (const nodeId of [...this.inlineEditors.keys()]) {
			this.destroyInlineEditor(nodeId, saveDirty);
		}
	}

	private pruneInlineEditors(visibleNodeIds: Set<string>): void {
		for (const nodeId of [...this.inlineEditors.keys()]) {
			if (!visibleNodeIds.has(nodeId)) {
				this.destroyInlineEditor(nodeId, true);
			}
		}
	}

	private renderCanvasControls(containerEl: HTMLElement): void {
		const controlsEl = containerEl.createDiv({ cls: "canvas-bases-canvas-controls" });
		this.addCanvasControlButton(controlsEl, "lucide-minus", this.t("view.tooltips.zoomOut"), () => {
			this.setZoom(this.zoom - ZOOM_STEP);
		});
		this.zoomLabelEl = controlsEl.createDiv({ cls: "canvas-bases-canvas-zoom-label" });
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
			cls: "canvas-bases-canvas-control-button",
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
		for (const direction of RESIZE_HANDLE_DIRECTIONS) {
			const handleEl = containerEl.createDiv({
				cls: `canvas-bases-canvas-resize-handle is-${direction}`,
				attr: {
					"aria-label": tooltip,
					"data-canvas-bases-resize-direction": direction,
				},
			});
			setTooltip(handleEl, tooltip);
		}
	}

	private startLinkDrag(event: PointerEvent, sourcePath: string, sourceElement: HTMLElement): void {
		if (event.button !== 0 || !this.canvasPlaneEl || !this.canvasBounds) return;

		if (!getElementNodePosition(sourceElement)) return;

		event.preventDefault();
		event.stopPropagation();
		this.clearDragListeners();

		const previewEl = createSvgElement("svg");
		previewEl.addClass("canvas-bases-canvas-link-preview");
		setSvgAttributes(previewEl, {
			width: String(this.canvasBounds.width),
			height: String(this.canvasBounds.height),
			viewBox: `0 0 ${this.canvasBounds.width} ${this.canvasBounds.height}`,
		});
		const previewPathEl = createSvgElement("path");
		previewPathEl.addClass("canvas-bases-canvas-link-preview__path");
		previewEl.appendChild(previewPathEl);
		this.canvasPlaneEl.appendChild(previewEl);
		const hintEl = this.canvasPlaneEl.createDiv({
			cls: "canvas-bases-canvas-link-hint",
		});

		sourceElement.addClass("is-linking");
		this.linkDragState = {
			pointerId: event.pointerId,
			sourcePath,
			sourceElement,
			previewEl,
			previewPathEl,
			hintEl,
			targetElement: null,
			targetPath: null,
			invalidReason: "empty",
		};
		this.applyLinkDragFromClient(event.clientX, event.clientY);
		this.startEdgeScroll(event, "link");

		this.linkMoveHandler = (moveEvent) => this.handleLinkMove(moveEvent);
		this.linkEndHandler = (endEvent) => this.handleLinkEnd(endEvent);
		window.addEventListener("pointermove", this.linkMoveHandler);
		window.addEventListener("pointerup", this.linkEndHandler);
		window.addEventListener("pointercancel", this.linkEndHandler);
	}

	private handleLinkMove(event: PointerEvent): void {
		if (!this.linkDragState || event.pointerId !== this.linkDragState.pointerId) return;

		event.preventDefault();
		this.updateEdgeScrollPointer(event);
		this.applyLinkDragFromClient(event.clientX, event.clientY);
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

	private applyLinkDragFromClient(clientX: number, clientY: number): void {
		this.updateLinkDragTarget(clientX, clientY);
		this.updateLinkPreview(clientX, clientY);
	}

	private updateLinkPreview(clientX: number, clientY: number): void {
		if (!this.linkDragState) return;

		const pointerPoint = this.getPlanePoint(clientX, clientY);
		if (!pointerPoint) return;

		const sourcePosition = getElementNodePosition(this.linkDragState.sourceElement);
		if (!sourcePosition) return;

		const targetPosition = this.linkDragState.targetElement
			? getElementNodePosition(this.linkDragState.targetElement)
			: null;
		const sourceCenter = getNodeCenter(sourcePosition);
		const targetCenter = targetPosition ? getNodeCenter(targetPosition) : pointerPoint;
		const sourcePoint = getNodeEdgeAnchor(sourcePosition, targetCenter);
		const targetPoint = targetPosition
			? getNodeEdgeAnchor(targetPosition, sourceCenter)
			: pointerPoint;
		const sourceVector = getNodeEdgeVector(sourcePosition, sourcePoint);
		const targetVector = targetPosition
			? getNodeEdgeVector(targetPosition, targetPoint)
			: { x: -sourceVector.x, y: -sourceVector.y };
		const distance = Math.hypot(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y);
		const tension = clampNumber(
			distance * 0.36,
			LINK_PREVIEW_MIN_TENSION,
			LINK_PREVIEW_MAX_TENSION
		);
		const control1 = {
			x: sourcePoint.x + sourceVector.x * tension,
			y: sourcePoint.y + sourceVector.y * tension,
		};
		const control2 = {
			x: targetPoint.x + targetVector.x * tension,
			y: targetPoint.y + targetVector.y * tension,
		};

		this.linkDragState.previewPathEl.setAttribute(
			"d",
			[
				`M ${roundCoordinate(sourcePoint.x)} ${roundCoordinate(sourcePoint.y)}`,
				`C ${roundCoordinate(control1.x)} ${roundCoordinate(control1.y)}`,
				`${roundCoordinate(control2.x)} ${roundCoordinate(control2.y)}`,
				`${roundCoordinate(targetPoint.x)} ${roundCoordinate(targetPoint.y)}`,
			].join(" ")
		);
		this.updateLinkDragHint(targetPosition ? targetPoint : pointerPoint);
	}

	private updateLinkDragTarget(clientX: number, clientY: number): void {
		if (!this.linkDragState) return;

		const target = this.getFileTargetAtPoint(clientX, clientY);
		const invalidReason: LinkDragInvalidReason = !target
			? "empty"
			: target.path === this.linkDragState.sourcePath
				? "self"
				: "none";
		const targetPath = invalidReason === "none" ? target?.path ?? null : null;
		const targetElement = targetPath ? target?.element ?? null : null;

		if (this.linkDragState.targetElement !== targetElement) {
			this.linkDragState.targetElement?.removeClass("is-link-target");
			targetElement?.addClass("is-link-target");
		}

		this.linkDragState.targetElement = targetElement;
		this.linkDragState.targetPath = targetPath;
		this.linkDragState.invalidReason = invalidReason;
		this.linkDragState.previewEl.classList.toggle("is-valid-target", Boolean(targetPath));
		this.linkDragState.previewEl.classList.toggle("is-invalid-target", invalidReason === "self");
		this.linkDragState.previewEl.classList.toggle("is-awaiting-target", invalidReason === "empty");
	}

	private updateLinkDragHint(point: LinkPoint): void {
		if (!this.linkDragState) return;

		const targetName = this.linkDragState.targetPath
			? formatPathName(this.linkDragState.targetPath)
			: null;
		const isInvalid = !targetName && this.linkDragState.invalidReason === "self";
		this.linkDragState.hintEl.setText(
			targetName
				? this.t("view.linkDrag.releaseToLink", { target: targetName })
				: isInvalid
					? this.t("view.linkDrag.cannotLinkHere")
					: this.t("view.linkDrag.dragToCard")
		);
		this.linkDragState.hintEl.classList.toggle("is-valid-target", Boolean(targetName));
		this.linkDragState.hintEl.classList.toggle("is-invalid-target", isInvalid);
		this.linkDragState.hintEl.classList.toggle("is-awaiting-target", !targetName && !isInvalid);
		this.linkDragState.hintEl.style.left = `${roundCoordinate(point.x)}px`;
		this.linkDragState.hintEl.style.top = `${roundCoordinate(point.y)}px`;
	}

	private getPlanePoint(clientX: number, clientY: number): LinkPoint | null {
		if (!this.canvasWorldEl) return null;

		return getPlanePointFromClient(
			clientX,
			clientY,
			this.canvasWorldEl.getBoundingClientRect(),
			this.zoom
		);
	}

	private getFileTargetAtPoint(
		clientX: number,
		clientY: number
	): { element: HTMLElement; path: string } | null {
		const element = this.rootEl?.ownerDocument.elementFromPoint(clientX, clientY);
		const fileEl = element instanceof HTMLElement
			? element.closest(".canvas-bases-canvas-file")
			: null;
		if (!(fileEl instanceof HTMLElement)) return null;

		const nodeId = fileEl.getAttribute("data-canvas-bases-node-id");
		const path = nodeId ? this.canvasRenderState?.filePathsByNodeId.get(nodeId) : null;
		return path ? { element: fileEl, path } : null;
	}

	private startDrag(
		event: PointerEvent,
		nodeIds: string[],
		nodeElements: Map<string, HTMLElement>,
		nodePositions: Map<string, CanvasBasesNodePosition>
	): void {
		if (event.button !== 0) return;
		if (isNodeControlTarget(event.target)) return;

		const dragNodeIds =
			nodeIds.length === 1 && this.selectedNodeIds.has(nodeIds[0])
				? [...this.selectedNodeIds]
				: nodeIds;
		if (!nodeIds.some((id) => this.selectedNodeIds.has(id))) {
			this.clearSelectedNodes();
		}

		const nodes = [...new Set(dragNodeIds)]
			.map((id) => {
				const element = nodeElements.get(id) ?? null;
				const startPosition = getNodePositionWithElementGeometry(
					element,
					nodePositions.get(id)
				);
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
			startScrollLeft: this.canvasViewportEl?.scrollLeft ?? 0,
			startScrollTop: this.canvasViewportEl?.scrollTop ?? 0,
			nodes,
		};

		for (const node of nodes) {
			node.element?.addClass("is-dragging");
		}
		this.startEdgeScroll(event, "drag");

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
		direction: ResizeDirection,
		element: HTMLElement,
		nodePositions: Map<string, CanvasBasesNodePosition>
	): void {
		if (event.button !== 0) return;

		const startPosition = getNodePositionWithElementGeometry(
			element,
			nodePositions.get(nodeId)
		);
		if (!startPosition) return;

		event.preventDefault();
		event.stopPropagation();
		this.clearDragListeners();

		const { minWidth, minHeight } = getResizeMinimums(kind);
		this.resizeState = {
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startScrollLeft: this.canvasViewportEl?.scrollLeft ?? 0,
			startScrollTop: this.canvasViewportEl?.scrollTop ?? 0,
			id: nodeId,
			direction,
			element,
			startPosition,
			minWidth,
			minHeight,
		};
		element.addClass("is-resizing");
		element.addClass(`is-resizing-${direction}`);
		this.startEdgeScroll(event, "resize");

		this.resizeMoveHandler = (moveEvent) => this.handleResizeMove(moveEvent);
		this.resizeEndHandler = (endEvent) => this.handleResizeEnd(endEvent);
		window.addEventListener("pointermove", this.resizeMoveHandler);
		window.addEventListener("pointerup", this.resizeEndHandler);
		window.addEventListener("pointercancel", this.resizeEndHandler);
	}

	private registerPanHandlers(viewportEl: HTMLElement): void {
		this.registerDomEvent(viewportEl, "pointerdown", (event) => {
			const action = getBoardPointerAction(event);
			if (action === "pan") {
				this.startPan(event, viewportEl);
				return;
			}
			if (action === "select") {
				this.startSelection(event);
			}
		});
		this.registerDomEvent(viewportEl, "contextmenu", (event) => {
			this.openBoardContextMenu(event);
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
		if (getBoardPointerAction(event) !== "pan" || isBoardInteractiveTarget(event.target)) return;

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

	private openBoardContextMenu(event: MouseEvent): void {
		if (isBoardInteractiveTarget(event.target)) return;

		const point = this.getPlanePoint(event.clientX, event.clientY);
		if (!point) return;

		event.preventDefault();
		event.stopPropagation();
		this.clearDragListeners();
		this.clearSelectedNodes();

		const menu = new Menu();
		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.createNote"))
				.setIcon("lucide-file-plus-2")
				.onClick(() => {
					void this.createFileForView();
				});
		});
		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.addPinnedNote"))
				.setIcon("lucide-file-plus")
				.onClick(() => {
					void this.openManualNotePicker(this.getFileCardPositionAtPoint(point));
				});
		});
		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.addCard"))
				.setIcon("lucide-sticky-note")
				.onClick(() => {
					void this.addTextCard(this.getTextCardPositionAtPoint(point));
				});
		});
		menu.showAtMouseEvent(event);
	}

	private startSelection(event: PointerEvent): void {
		if (event.button !== 0 || isBoardInteractiveTarget(event.target)) return;
		if (!this.canvasPlaneEl) return;

		const startPoint = this.getPlanePoint(event.clientX, event.clientY);
		if (!startPoint) return;

		event.preventDefault();
		this.clearDragListeners();
		this.clearSelectedNodes();

		const selectionEl = this.canvasPlaneEl.createDiv({
			cls: "canvas-bases-canvas-selection-rect",
		});
		setNodeGeometry(selectionEl, {
			x: startPoint.x,
			y: startPoint.y,
			width: 0,
			height: 0,
		});

		this.selectionState = {
			pointerId: event.pointerId,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startPoint,
			selectionRect: {
				x: startPoint.x,
				y: startPoint.y,
				width: 0,
				height: 0,
			},
			selectionEl,
			selectedNodeIds: new Set(),
			didMove: false,
		};
		this.canvasViewportEl?.addClass("is-selecting");

		this.selectionMoveHandler = (moveEvent) => this.handleSelectionMove(moveEvent);
		this.selectionEndHandler = (endEvent) => this.handleSelectionEnd(endEvent);
		window.addEventListener("pointermove", this.selectionMoveHandler);
		window.addEventListener("pointerup", this.selectionEndHandler);
		window.addEventListener("pointercancel", this.selectionEndHandler);
	}

	private handleDragMove(event: PointerEvent): void {
		if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;

		this.updateEdgeScrollPointer(event);
		this.applyDragMoveFromClient(event.clientX, event.clientY);
	}

	private applyDragMoveFromClient(clientX: number, clientY: number): void {
		if (!this.dragState) return;

		const delta = this.getDragDeltaFromClient(clientX, clientY);
		const nextActiveDropTargetIds = new Set<string>();
		const isDraggingGroup = this.isDraggingGroup();
		const nextPositions: CanvasBasesNodePosition[] = [];

		for (const node of this.dragState.nodes) {
			const nextPosition = {
				...node.startPosition,
				x: clampCoordinate(node.startPosition.x + delta.x),
				y: clampCoordinate(node.startPosition.y + delta.y),
			};
			if (node.element) {
				setNodeGeometry(node.element, nextPosition);
			}
			nextPositions.push(nextPosition);
			const targetGroup = this.getActiveGroupDropTargetForDragNode(node, nextPosition, {
				isDraggingGroup,
			});
			if (targetGroup) {
				nextActiveDropTargetIds.add(targetGroup.id);
			}
		}
		this.expandCanvasBoundsForPositions(nextPositions);
		this.setActiveGroupDropTargets(nextActiveDropTargetIds);
		this.updateEdgeLayerGeometry();
	}

	private handleDragEnd(event: PointerEvent): void {
		if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;

		this.updateEdgeScrollPointer(event);
		const delta = this.getDragDeltaFromClient(event.clientX, event.clientY);
		const nodePositions = this.getNodePositions();
		const draggedGroup = this.dragState.nodes.some((node) =>
			this.canvasRenderState?.allNodes.some(
				(renderedNode) => renderedNode.id === node.id && renderedNode.type === "group"
			)
		);
		const droppedNodes: DroppedDragNode[] = [];

		for (const node of this.dragState.nodes) {
			const nextPosition = {
				...node.startPosition,
				x: clampCoordinate(node.startPosition.x + delta.x),
				y: clampCoordinate(node.startPosition.y + delta.y),
			};
			droppedNodes.push({
				id: node.id,
				position: nextPosition,
				sourceActiveGroup: this.getActiveGroupAtPosition(node.startPosition),
			});
			nodePositions[node.id] = nextPosition;
			this.canvasRenderState?.nodePositions.set(node.id, nextPosition);
			node.element?.removeClass("is-dragging");
			if (node.element) {
				setNodeGeometry(node.element, nextPosition);
			}
		}

		this.setNodePositions(nodePositions);
		this.updateEdgeLayerGeometry();
		this.refreshGroupContainment();
		this.setActiveGroupDropTargets(new Set());
		this.clearDragListeners();
		void this.handleActiveGroupDrop(droppedNodes, { draggedGroup });
	}

	private getActiveGroupDropTargetForDragNode(
		node: DragState["nodes"][number],
		position: CanvasBasesNodePosition,
		{ isDraggingGroup }: { isDraggingGroup: boolean }
	): ActiveGroupTarget | null {
		const state = this.canvasRenderState;
		if (isDraggingGroup || !state) return null;

		const path = state.filePathsByNodeId.get(node.id);
		if (!path) return null;
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!isCanvasBasesMarkdownFile(path, file instanceof TFile ? file : null)) return null;

		const targetGroup = this.getActiveGroupAtPosition(position);
		if (!targetGroup) return null;

		const sourceGroup =
			this.getActiveGroupAtPosition(node.startPosition) ??
			this.getSemanticActiveGroupForPath(path);
		if (sourceGroup && activeGroupTargetsMatch(sourceGroup, targetGroup)) return null;

		return targetGroup;
	}

	private isDraggingGroup(): boolean {
		return Boolean(
			this.dragState?.nodes.some((node) =>
				this.canvasRenderState?.allNodes.some(
					(renderedNode) => renderedNode.id === node.id && renderedNode.type === "group"
				)
			)
		);
	}

	private setActiveGroupDropTargets(targetIds: Set<string>): void {
		if (setsEqual(this.activeGroupDropTargetIds, targetIds)) return;

		for (const id of this.activeGroupDropTargetIds) {
			this.canvasNodeElements.get(id)?.removeClass("is-active-group-drop-target");
		}
		this.activeGroupDropTargetIds = new Set(targetIds);
		for (const id of this.activeGroupDropTargetIds) {
			this.canvasNodeElements.get(id)?.addClass("is-active-group-drop-target");
		}
	}

	private async handleActiveGroupDrop(
		droppedNodes: DroppedDragNode[],
		{ draggedGroup }: { draggedGroup: boolean }
	): Promise<void> {
		const state = this.canvasRenderState;
		if (draggedGroup || !state) return;

		const fileDrops = droppedNodes
			.map((node) => ({
				...node,
				path: state.filePathsByNodeId.get(node.id),
			}))
			.filter((node): node is DroppedDragNode & { path: string } => Boolean(node.path))
			.filter((node) => {
				const file = this.app.vault.getAbstractFileByPath(node.path);
				return isCanvasBasesMarkdownFile(node.path, file instanceof TFile ? file : null);
			});
		if (fileDrops.length === 0) return;

		let dataChanged = false;

		for (const node of fileDrops) {
			const targetGroup = this.getActiveGroupAtPosition(node.position);
			if (targetGroup) {
				if (
					node.sourceActiveGroup &&
					activeGroupTargetsMatch(node.sourceActiveGroup, targetGroup)
				) {
					continue;
				}
				const changed = await this.updateActiveGroupValue(node.path, targetGroup);
				dataChanged ||= changed;
				await this.plugin.interop.publishCanvasDrop({
					board: {
						view: this.getSnapshot()?.viewName ?? this.canvasQueryController.viewName ?? "Canvas Bases",
					},
					record: {
						path: node.path,
						node_id: node.id,
					},
					position: { ...node.position },
					target: {
						id: targetGroup.id,
						label: targetGroup.label,
						action: targetGroup.action,
						property: targetGroup.property,
						value: targetGroup.value,
					},
					changed,
				});
			}
		}

		if (dataChanged) {
			this.taskEdgeCache = null;
			this.scheduleRender();
		}
	}

	private getActiveGroupAtPosition(position: CanvasBasesNodePosition): ActiveGroupTarget | null {
		const state = this.canvasRenderState;
		if (!state) return null;

		const groups = [
			...[...state.groupsByNodeId.values()]
				.map((group) => this.getActiveGroupTargetForDataGroup(group))
				.filter((group): group is ActiveGroupTarget => group !== null),
			...[...state.manualGroupsByNodeId.values()]
				.map((group) => this.getActiveGroupTargetForManualGroup(group))
				.filter((group): group is ActiveGroupTarget => group !== null),
		]
			.map((group) => ({
				group,
				position: state.nodePositions.get(group.id),
			}))
			.filter(
				(entry): entry is { group: ActiveGroupTarget; position: CanvasBasesNodePosition } =>
					Boolean(entry.position)
			)
			.filter((entry) => positionCenterInside(position, entry.position))
			.sort((left, right) => getPositionArea(left.position) - getPositionArea(right.position));

		return groups[0]?.group ?? null;
	}

	private getSemanticActiveGroupForPath(path: string): ActiveGroupTarget | null {
		const state = this.canvasRenderState;
		if (!state) return null;

		for (const group of state.groupsByNodeId.values()) {
			const target = this.getActiveGroupTargetForDataGroup(group);
			if (!target) continue;
			if (group.entries.some((entry) => entry.path === path)) {
				return target;
			}
		}

		return null;
	}

	private async updateActiveGroupValue(
		path: string,
		group: ActiveGroupTarget,
		options: { force?: boolean; label?: string; value?: string } = {}
	): Promise<boolean> {
		if (!options.force && this.getSemanticActiveGroupForPath(path)?.id === group.id) {
			return false;
		}

		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			new Notice(this.t("notices.couldNotFind", { path }));
			return false;
		}
		if (!isCanvasBasesMarkdownFile(path, file)) {
			new Notice(this.t("notices.activeGroupReadOnly"));
			return false;
		}

		if (group.action !== DEFAULT_ZONE_ACTION) {
			return this.runActiveGroupAction(path, group);
		}

		const propertyName = toWritableNotePropertyName(group.property);
		const groupValue = options.value ?? group.value;
		const valueLabel = options.label ?? group.label;

		try {
			if (!(await this.flushInlineEditorsForPaths([path]))) {
				new Notice(this.t("notices.resolveInlineEditorConflict"));
				return false;
			}

			const taskUpdate = await this.plugin.taskNotes.updateMappedProperty(
				path,
				group.property,
				groupValue,
				{
					updateMode: group.updateMode,
					valueType: group.valueType,
				}
			);
			if (taskUpdate === "updated") {
				await this.refreshInlineEditorsForPaths([path]);
				new Notice(this.t("notices.activeGroupUpdated", {
					property: propertyName ?? group.property,
					value: valueLabel,
				}));
				return true;
			}
			if (taskUpdate === "unavailable") {
				new Notice(this.t("notices.activeGroupTaskUpdateUnavailable"));
				return false;
			}
			if (!propertyName) {
				new Notice(this.t("notices.activeGroupReadOnly"));
				return false;
			}

			const metadataType = this.getVaultPropertyType(propertyName);
			await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
				const nextValue = applyActiveGroupUpdate(frontmatter[propertyName], groupValue, {
					updateMode: group.updateMode,
					valueType: group.valueType,
					metadataType,
				});
				if (typeof nextValue === "undefined") {
					delete frontmatter[propertyName];
				} else {
					frontmatter[propertyName] = nextValue;
				}
			});
			await this.refreshInlineEditorsForPaths([path]);
			new Notice(this.t("notices.activeGroupUpdated", {
				property: propertyName,
				value: valueLabel,
			}));
			return true;
		} catch (error) {
			new Notice(this.t("notices.couldNotUpdateActiveGroup", { message: getErrorMessage(error) }));
			return false;
		}
	}

	private async runActiveGroupAction(path: string, group: ActiveGroupTarget): Promise<boolean> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			new Notice(this.t("notices.couldNotFind", { path }));
			return false;
		}
		if (!isCanvasBasesMarkdownFile(path, file)) {
			new Notice(this.t("notices.activeGroupActionNotTask"));
			return false;
		}

		try {
			if (!(await this.flushInlineEditorsForPaths([path]))) {
				new Notice(this.t("notices.resolveInlineEditorConflict"));
				return false;
			}

			const result = await this.plugin.taskNotes.runZoneAction(path, group.action);
			if (result === "updated") {
				await this.refreshInlineEditorsForPaths([path]);
				new Notice(this.t("notices.activeGroupActionRun", {
					action: this.getActiveGroupActionLabel(group.action),
				}));
				return true;
			}
			if (result === "not-task") {
				new Notice(this.t("notices.activeGroupActionNotTask"));
				return false;
			}

			new Notice(this.t("notices.activeGroupActionUnavailable"));
			return false;
		} catch (error) {
			new Notice(this.t("notices.couldNotUpdateActiveGroup", { message: getErrorMessage(error) }));
			return false;
		}
	}

	private handleResizeMove(event: PointerEvent): void {
		if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) return;

		this.updateEdgeScrollPointer(event);
		this.applyResizeMoveFromClient(event.clientX, event.clientY);
	}

	private applyResizeMoveFromClient(clientX: number, clientY: number): void {
		if (!this.resizeState) return;

		const nextPosition = this.getResizedPositionFromClient(clientX, clientY);
		setNodeGeometry(this.resizeState.element, nextPosition);
		this.expandCanvasBoundsForPositions([nextPosition]);
		this.updateEdgeLayerGeometry();
	}

	private handleResizeEnd(event: PointerEvent): void {
		if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) return;

		this.updateEdgeScrollPointer(event);
		const nextPosition = this.getResizedPositionFromClient(event.clientX, event.clientY);
		const nodePositions = this.getNodePositions();
		nodePositions[this.resizeState.id] = nextPosition;
		this.canvasRenderState?.nodePositions.set(this.resizeState.id, nextPosition);
		this.resizeState.element.removeClass("is-resizing");
		this.resizeState.element.removeClass(`is-resizing-${this.resizeState.direction}`);
		setNodeGeometry(this.resizeState.element, nextPosition);
		this.setNodePositions(nodePositions);
		this.updateEdgeLayerGeometry();
		this.refreshGroupContainment();
		this.clearDragListeners();
	}

	private getResizedPositionFromClient(
		clientX: number,
		clientY: number
	): CanvasBasesNodePosition {
		const delta = this.getResizeDeltaFromClient(clientX, clientY);
		return this.getResizedPosition(delta.x, delta.y);
	}

	private getResizedPosition(deltaX: number, deltaY: number): CanvasBasesNodePosition {
		if (!this.resizeState) {
			throw new Error("Canvas Bases resize state is not active.");
		}

		const { direction, minWidth, minHeight, startPosition } = this.resizeState;
		const right = startPosition.x + startPosition.width;
		const bottom = startPosition.y + startPosition.height;
		const nextPosition = { ...startPosition };

		if (direction.includes("e")) {
			nextPosition.width = Math.max(minWidth, Math.round(startPosition.width + deltaX));
		}
		if (direction.includes("s")) {
			nextPosition.height = Math.max(minHeight, Math.round(startPosition.height + deltaY));
		}
		if (direction.includes("w")) {
			nextPosition.x = clampResizeOrigin(startPosition.x + deltaX, right - minWidth);
			nextPosition.width = Math.max(minWidth, Math.round(right - nextPosition.x));
		}
		if (direction.includes("n")) {
			nextPosition.y = clampResizeOrigin(startPosition.y + deltaY, bottom - minHeight);
			nextPosition.height = Math.max(minHeight, Math.round(bottom - nextPosition.y));
		}

		return nextPosition;
	}

	private getDragDeltaFromClient(clientX: number, clientY: number): LinkPoint {
		if (!this.dragState) {
			throw new Error("Canvas Bases drag state is not active.");
		}

		const scrollDelta = this.getViewportScrollDelta(
			this.dragState.startScrollLeft,
			this.dragState.startScrollTop
		);
		return this.getCanvasPointerDelta(
			clientX - this.dragState.startClientX + scrollDelta.x,
			clientY - this.dragState.startClientY + scrollDelta.y
		);
	}

	private getResizeDeltaFromClient(clientX: number, clientY: number): LinkPoint {
		if (!this.resizeState) {
			throw new Error("Canvas Bases resize state is not active.");
		}

		const scrollDelta = this.getViewportScrollDelta(
			this.resizeState.startScrollLeft,
			this.resizeState.startScrollTop
		);
		return this.getCanvasPointerDelta(
			clientX - this.resizeState.startClientX + scrollDelta.x,
			clientY - this.resizeState.startClientY + scrollDelta.y
		);
	}

	private getViewportScrollDelta(startScrollLeft: number, startScrollTop: number): LinkPoint {
		if (!this.canvasViewportEl) return { x: 0, y: 0 };

		return {
			x: this.canvasViewportEl.scrollLeft - startScrollLeft,
			y: this.canvasViewportEl.scrollTop - startScrollTop,
		};
	}

	private getCanvasPointerDelta(deltaX: number, deltaY: number): LinkPoint {
		return {
			x: deltaX / this.zoom,
			y: deltaY / this.zoom,
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

	private handleSelectionMove(event: PointerEvent): void {
		if (!this.selectionState || event.pointerId !== this.selectionState.pointerId) return;

		event.preventDefault();
		this.updateEdgeScrollPointer(event);
		this.applySelectionMoveFromClient(event.clientX, event.clientY);
		if (this.selectionState?.didMove && !this.edgeScrollState) {
			this.startEdgeScroll(event, "selection");
		}
	}

	private applySelectionMoveFromClient(clientX: number, clientY: number): void {
		if (!this.selectionState) return;

		const point = this.getPlanePoint(clientX, clientY);
		if (!point) return;

		const screenMovement = Math.max(
			Math.abs(clientX - this.selectionState.startClientX),
			Math.abs(clientY - this.selectionState.startClientY)
		);
		const canvasMovement = Math.max(
			Math.abs(point.x - this.selectionState.startPoint.x) * this.zoom,
			Math.abs(point.y - this.selectionState.startPoint.y) * this.zoom
		);
		if (Math.max(screenMovement, canvasMovement) >= SELECTION_DRAG_THRESHOLD) {
			this.selectionState.didMove = true;
		}

		const selectionRect = getRectFromPoints(this.selectionState.startPoint, point);
		this.selectionState.selectionRect = selectionRect;
		setNodeGeometry(this.selectionState.selectionEl, selectionRect);
		this.selectionState.selectionEl.toggleClass("is-active", this.selectionState.didMove);
		this.expandCanvasBoundsForPositions([selectionRect]);
		this.updateSelection(selectionRect);
	}

	private handleSelectionEnd(event: PointerEvent): void {
		if (!this.selectionState || event.pointerId !== this.selectionState.pointerId) return;

		event.preventDefault();
		const selectionRect = this.selectionState.selectionRect;
		const didMove = this.selectionState.didMove;
		this.selectionState.selectionEl.remove();
		this.canvasViewportEl?.removeClass("is-selecting");
		this.selectionState = null;
		this.clearDragListeners();

		if (!didMove) {
			this.clearSelectedNodes();
			return;
		}

		this.openSelectionMenu(event, selectionRect);
	}

	private updateSelection(selectionRect: CanvasBasesNodePosition): void {
		if (!this.canvasRenderState || !this.selectionState) return;

		const nextSelectedNodeIds = new Set(
			this.canvasRenderState.allNodes
				.filter(isSelectableCanvasNode)
				.filter((node) =>
					positionsOverlap(
						this.canvasRenderState?.nodePositions.get(node.id) ?? getCanvasNodePosition(node),
						selectionRect
					)
				)
				.map((node) => node.id)
		);

		this.selectionState.selectedNodeIds = nextSelectedNodeIds;
		this.selectedNodeIds = new Set(nextSelectedNodeIds);
		this.applySelectedNodeClasses();
	}

	private applySelectedNodeClasses(): void {
		for (const [nodeId, element] of this.canvasNodeElements) {
			element.toggleClass("is-selected", this.selectedNodeIds.has(nodeId));
		}
	}

	private clearSelectedNodes(): void {
		if (this.selectedNodeIds.size === 0) return;

		this.selectedNodeIds = new Set();
		this.applySelectedNodeClasses();
	}

	private openSelectionMenu(event: MouseEvent, selectionRect: CanvasBasesNodePosition): void {
		const menu = new Menu();
		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.createGroupFromSelection"))
				.setIcon("lucide-group")
				.onClick(() => {
					this.openCreateManualGroupFromSelectionModal(selectionRect);
				});
		});
		menu.addItem((item) => {
			item
				.setTitle(this.t("view.menu.createZoneFromSelection"))
				.setIcon("lucide-zap")
				.onClick(() => {
					this.openCreateCustomZoneModal(selectionRect);
				});
		});
		menu.showAtMouseEvent(event);
	}

	private getFileCardPositionAtPoint(point: LinkPoint): CanvasBasesNodePosition {
		const options = this.getMaterializeOptions();
		return getNodePositionAtPoint(point, options.nodeWidth, options.nodeHeight);
	}

	private getTextCardPositionAtPoint(point: LinkPoint): CanvasBasesNodePosition {
		const options = this.getMaterializeOptions();
		return getNodePositionAtPoint(
			point,
			Math.max(220, options.nodeWidth),
			Math.max(120, options.nodeHeight)
		);
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

		this.canvasPlaneEl.style.setProperty("width", `${this.canvasBounds.width}px`);
		this.canvasPlaneEl.style.setProperty("height", `${this.canvasBounds.height}px`);
		this.canvasWorldEl.style.setProperty(
			"width",
			`${Math.ceil(this.canvasBounds.width * this.zoom)}px`
		);
		this.canvasWorldEl.style.setProperty(
			"height",
			`${Math.ceil(this.canvasBounds.height * Math.max(this.zoom, 1))}px`
		);
		this.canvasPlaneEl.style.setProperty("transform", `scale(${this.zoom})`);
		this.zoomLabelEl?.setText(`${Math.round(this.zoom * 100)}%`);
	}

	private async resetLayout(): Promise<void> {
		if (!this.config) return;

		this.config.set(VIEW_CONFIG_KEYS.nodePositions, null);
		this.scheduleRender();
	}

	private getNodePositions(): CanvasBasesNodePositionMap {
		if (!this.config) return {};

		return normalizeNodePositions(this.config.get(VIEW_CONFIG_KEYS.nodePositions));
	}

	private setNodePositions(positions: CanvasBasesNodePositionMap): void {
		if (!this.config) return;

		this.config.set(VIEW_CONFIG_KEYS.nodePositions, positions);
	}

	private hasVisibleFile(path: string): boolean {
		const snapshot = this.getSnapshot();
		if (!snapshot) return false;

		return getSnapshotPaths(snapshot).includes(path);
	}

	private clearDragListeners(): void {
		this.setActiveGroupDropTargets(new Set());
		this.stopEdgeScroll();
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
		if (this.selectionMoveHandler) {
			window.removeEventListener("pointermove", this.selectionMoveHandler);
			this.selectionMoveHandler = null;
		}
		if (this.selectionEndHandler) {
			window.removeEventListener("pointerup", this.selectionEndHandler);
			window.removeEventListener("pointercancel", this.selectionEndHandler);
			this.selectionEndHandler = null;
		}
		for (const node of this.dragState?.nodes ?? []) {
			node.element?.removeClass("is-dragging");
		}
		if (this.resizeState) {
			this.resizeState.element.removeClass("is-resizing");
			this.resizeState.element.removeClass(`is-resizing-${this.resizeState.direction}`);
		}
		this.panState?.viewportEl.removeClass("is-panning");
		this.linkDragState?.sourceElement.removeClass("is-linking");
		this.linkDragState?.targetElement?.removeClass("is-link-target");
		this.linkDragState?.previewEl.remove();
		this.linkDragState?.hintEl.remove();
		this.selectionState?.selectionEl.remove();
		this.canvasViewportEl?.removeClass("is-selecting");
		this.dragState = null;
		this.resizeState = null;
		this.panState = null;
		this.linkDragState = null;
		this.selectionState = null;
	}

	notifyUnavailable(): void {
		new Notice(this.t("notices.openCanvasBasesViewFirst"));
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

interface ActiveGroupSettings {
	label?: string;
	action: CanvasBasesZoneAction;
	property: string;
	value: string;
	updateMode: CanvasBasesZoneUpdateMode;
	valueType: CanvasBasesZoneValueType;
	color: string;
}

interface ActiveGroupSettingsModalOptions {
	title: string;
	t: TranslateFn;
	labelLabel?: string;
	actionLabel: string;
	propertyLabel: string;
	valueLabel: string;
	updateModeLabel: string;
	valueTypeLabel: string;
	colorLabel: string;
	initialLabel?: string;
	initialAction: CanvasBasesZoneAction;
	initialProperty: string;
	initialValue: string;
	initialUpdateMode: CanvasBasesZoneUpdateMode;
	initialValueType: CanvasBasesZoneValueType;
	initialColor: string;
	actionOptions: Record<string, string>;
	propertyOptions: string[];
	updateModeOptions: Record<CanvasBasesZoneUpdateMode, string>;
	valueTypeOptions: Record<CanvasBasesZoneValueType, string>;
	submitLabel: string;
	cancelLabel: string;
	readOnlyAction?: boolean;
	readOnlyPropertyAndValue?: boolean;
}

class ActiveGroupSettingsModal extends Modal {
	private readonly options: ActiveGroupSettingsModalOptions;
	private readonly onSubmit: (settings: ActiveGroupSettings) => void;
	private label: string;
	private action: CanvasBasesZoneAction;
	private property: string;
	private value: string;
	private updateMode: CanvasBasesZoneUpdateMode;
	private valueType: CanvasBasesZoneValueType;
	private color: string;
	private readonly propertyIdsByInput = new Map<string, string>();
	private readonly propertyLabelsById = new Map<string, string>();
	private propertyText: TextComponent | null = null;
	private valueText: TextComponent | null = null;
	private valueTypeDropdown: DropdownComponent | null = null;
	private writeRuleEl: HTMLElement | null = null;
	private valueSettingEl: HTMLElement | null = null;
	private updateModeSettingEl: HTMLElement | null = null;
	private valueTypeSettingEl: HTMLElement | null = null;
	private propertyErrorEl: HTMLElement | null = null;
	private previewEl: HTMLElement | null = null;
	private previewTextEl: HTMLElement | null = null;
	private previewSwatchEl: HTMLElement | null = null;
	private submitButtonEl: HTMLButtonElement | null = null;

	constructor(
		app: App,
		options: ActiveGroupSettingsModalOptions,
		onSubmit: (settings: ActiveGroupSettings) => void
	) {
		super(app);
		this.options = options;
		this.label = options.initialLabel ?? "";
		this.action = normalizeZoneAction(options.initialAction);
		if (!Object.prototype.hasOwnProperty.call(options.actionOptions, this.action)) {
			this.action = DEFAULT_ZONE_ACTION;
		}
		for (const option of getFriendlyZonePropertyOptions(
			options.propertyOptions,
			options.t("settings.tasknotes.heading")
		)) {
			this.propertyIdsByInput.set(option.label, option.id);
			this.propertyIdsByInput.set(option.id, option.id);
			this.propertyLabelsById.set(option.id, option.label);
		}
		this.property = this.formatPropertyForInput(options.initialProperty);
		this.value = options.initialValue;
		this.updateMode = normalizeZoneUpdateMode(options.initialUpdateMode);
		this.valueType = normalizeZoneValueType(options.initialValueType);
		this.color = normalizeZoneColor(options.initialColor) ?? DEFAULT_ACTIVE_GROUP_COLOR;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		this.contentEl.empty();
		this.contentEl.addClass("canvas-bases-modal");
		this.contentEl.addClass("canvas-bases-zone-modal");
		this.modalEl.addClass("canvas-bases-zone-modal-shell");
		this.contentEl.addEventListener("keydown", this.handleKeydown);
		this.contentEl.createEl("h2", { text: this.options.title });

		const propertyListId = `canvas-bases-active-group-properties-${nextActiveGroupPropertyListId++}`;
		const propertyListEl = this.contentEl.createEl("datalist", { attr: { id: propertyListId } });
		for (const property of this.options.propertyOptions) {
			const label = this.formatPropertyForInput(property);
			propertyListEl.createEl("option", {
				attr: {
					value: label,
					label: property,
				},
			});
		}

		this.renderPreview();

		const detailsEl = this.createSection(this.options.t("view.group.active"));
		if (this.options.labelLabel) {
			new Setting(detailsEl)
				.setName(this.options.labelLabel)
				.addText((text) => {
					text
						.setValue(this.label)
						.onChange((value) => {
							this.label = value;
							this.updatePreview();
						});
				});
		}
		new Setting(detailsEl)
			.setName(this.options.actionLabel)
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(this.options.actionOptions)
					.setValue(this.action)
					.onChange((value) => {
						this.action = normalizeZoneAction(value);
						this.updateActionState();
						this.updateValidation();
						this.updatePreview();
					});
				dropdown.setDisabled(Boolean(this.options.readOnlyAction));
			});
		new Setting(detailsEl)
			.setName(this.options.colorLabel)
			.addColorPicker((color) => {
				color
					.setValue(this.color)
					.onChange((value) => {
						this.color = normalizeZoneColor(value) ?? DEFAULT_ACTIVE_GROUP_COLOR;
						this.updatePreview();
					});
			});

		const ruleEl = this.createSection(this.options.t("view.group.writeRule"));
		this.writeRuleEl = ruleEl;
		if (this.options.readOnlyPropertyAndValue) {
			ruleEl.createDiv({
				cls: "canvas-bases-zone-modal__locked-note",
				text: this.options.t("view.group.groupRuleLocked"),
			});
		}
		new Setting(ruleEl)
			.setName(this.options.propertyLabel)
			.addText((text) => {
				this.propertyText = text;
				text
					.setValue(this.property)
					.onChange((value) => {
						this.property = value;
						this.updateValidation();
						this.updatePreview();
					});
				text.inputEl.disabled = Boolean(this.options.readOnlyPropertyAndValue);
				text.inputEl.setAttribute("list", propertyListId);
			});
		this.propertyErrorEl = ruleEl.createDiv({ cls: "canvas-bases-zone-modal__error" });

		const valueSetting = new Setting(ruleEl)
			.setName(this.options.valueLabel)
			.addText((text) => {
				this.valueText = text;
				text
					.setValue(this.value)
					.onChange((value) => {
						this.value = value;
						this.updatePreview();
					});
				text.inputEl.disabled = Boolean(this.options.readOnlyPropertyAndValue);
			});
		valueSetting.settingEl.addClass("canvas-bases-zone-modal__value-setting");
		this.valueSettingEl = valueSetting.settingEl;
		const updateModeSetting = new Setting(ruleEl)
			.setName(this.options.updateModeLabel)
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(this.options.updateModeOptions)
					.setValue(this.updateMode)
					.onChange((value) => {
						this.updateMode = normalizeZoneUpdateMode(value);
						this.updateClearState();
						this.updateValidation();
						this.updatePreview();
					});
			});
		updateModeSetting.settingEl.addClass("canvas-bases-zone-modal__update-mode-setting");
		this.updateModeSettingEl = updateModeSetting.settingEl;
		const valueTypeSetting = new Setting(ruleEl)
			.setName(this.options.valueTypeLabel)
			.addDropdown((dropdown) => {
				this.valueTypeDropdown = dropdown;
				dropdown
					.addOptions(this.options.valueTypeOptions)
					.setValue(this.valueType)
					.onChange((value) => {
						this.valueType = normalizeZoneValueType(value);
						this.updatePreview();
					});
			});
		valueTypeSetting.settingEl.addClass("canvas-bases-zone-modal__value-type-setting");
		this.valueTypeSettingEl = valueTypeSetting.settingEl;

		const actionsEl = this.contentEl.createDiv({ cls: "canvas-bases-modal__actions" });
		actionsEl
			.createEl("button", { text: this.options.cancelLabel })
			.addEventListener("click", () => {
				this.close();
			});
		const submitButton = actionsEl.createEl("button", {
			text: this.options.submitLabel,
			cls: "mod-cta",
		});
		this.submitButtonEl = submitButton;
		submitButton.addEventListener("click", () => {
			this.submit();
		});
		this.updateActionState();
		this.updateValidation();
		this.updatePreview();
	}

	onClose(): void {
		this.contentEl.removeEventListener("keydown", this.handleKeydown);
		this.contentEl.empty();
	}

	private readonly handleKeydown = (event: KeyboardEvent): void => {
		if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
		if (event.target.type === "color") return;

		event.preventDefault();
		this.submit();
	};

	private createSection(title: string): HTMLElement {
		const sectionEl = this.contentEl.createDiv({ cls: "canvas-bases-zone-modal__section" });
		sectionEl.createEl("h3", { cls: "canvas-bases-zone-modal__section-title", text: title });
		return sectionEl;
	}

	private renderPreview(): void {
		this.previewEl = this.contentEl.createDiv({
			cls: "canvas-bases-zone-modal__preview",
			attr: { "aria-live": "polite" },
		});
		this.previewSwatchEl = this.previewEl.createSpan({
			cls: "canvas-bases-zone-modal__preview-swatch",
			attr: { "aria-hidden": "true" },
		});
		const copyEl = this.previewEl.createDiv({ cls: "canvas-bases-zone-modal__preview-copy" });
		copyEl.createDiv({
			cls: "canvas-bases-zone-modal__preview-title",
			text: this.options.t("view.group.dropResult"),
		});
		this.previewTextEl = copyEl.createDiv({ cls: "canvas-bases-zone-modal__preview-text" });
	}

	private updateClearState(): void {
		const isClearMode = this.updateMode === "clear";
		const isPropertyAction = this.action === DEFAULT_ZONE_ACTION;
		this.valueText?.setDisabled(
			!isPropertyAction || Boolean(this.options.readOnlyPropertyAndValue) || isClearMode
		);
		this.valueTypeDropdown?.setDisabled(!isPropertyAction || isClearMode);
		this.valueSettingEl?.toggleClass("is-disabled-by-mode", isClearMode);
		this.valueTypeSettingEl?.toggleClass("is-disabled-by-mode", isClearMode);
	}

	private updateActionState(): void {
		const isPropertyAction = this.action === DEFAULT_ZONE_ACTION;
		if (this.writeRuleEl) {
			this.writeRuleEl.style.display = isPropertyAction ? "" : "none";
		}
		this.updateModeSettingEl?.toggleClass("is-disabled-by-mode", !isPropertyAction);
		this.updateClearState();
	}

	private updateValidation(): void {
		if (this.action !== DEFAULT_ZONE_ACTION) {
			this.propertyErrorEl?.setText("");
			this.propertyErrorEl?.removeClass("is-visible");
			this.propertyText?.inputEl.removeClass("is-invalid");
			this.propertyText?.inputEl.removeAttribute("aria-invalid");
			this.submitButtonEl?.toggleAttribute("disabled", false);
			return;
		}

		const property = this.property.trim();
		const message = property ? "" : this.options.t("view.group.propertyRequired");
		this.propertyErrorEl?.setText(message);
		this.propertyErrorEl?.toggleClass("is-visible", Boolean(message));
		this.propertyText?.inputEl.toggleClass("is-invalid", Boolean(message));
		if (message) {
			this.propertyText?.inputEl.setAttribute("aria-invalid", "true");
		} else {
			this.propertyText?.inputEl.removeAttribute("aria-invalid");
		}
		this.submitButtonEl?.toggleAttribute("disabled", !property);
	}

	private updatePreview(): void {
		const text =
			this.action === DEFAULT_ZONE_ACTION
				? this.getPropertyPreviewText()
				: this.options.t("view.group.previewAction", {
						action: this.options.actionOptions[this.action] ?? this.action,
					});

		if (this.previewEl) {
			this.previewEl.style.setProperty("--canvas-bases-zone-modal-color", this.color);
		}
		if (this.previewSwatchEl) {
			this.previewSwatchEl.style.backgroundColor = this.color;
		}
		this.previewTextEl?.setText(text);
	}

	private getPropertyPreviewText(): string {
		const property = this.formatPropertyForPreview(this.property);
		const value = this.value.trim() || this.options.t("view.group.emptyValue");
		return this.updateMode === "clear"
			? this.options.t("view.group.previewClear", {
					mode: this.options.updateModeOptions[this.updateMode],
					property,
				})
				: this.options.t("view.group.previewWrite", {
						mode: this.options.updateModeOptions[this.updateMode],
						property,
						value,
					});
	}

	private submit(): void {
		const property =
			this.action === DEFAULT_ZONE_ACTION ? this.resolvePropertyInput(this.property).trim() : "";
		if (this.action === DEFAULT_ZONE_ACTION && !property) {
			this.updateValidation();
			this.propertyText?.inputEl.focus();
			return;
		}

		this.onSubmit({
			label: this.label.trim(),
			action: normalizeZoneAction(this.action),
			property,
			value: this.action === DEFAULT_ZONE_ACTION ? this.value.trim() : "",
			updateMode: normalizeZoneUpdateMode(this.updateMode),
			valueType: normalizeZoneValueType(this.valueType),
			color: normalizeZoneColor(this.color) ?? DEFAULT_ACTIVE_GROUP_COLOR,
		});
		this.close();
	}

	private formatPropertyForInput(property: string): string {
		const normalized = normalizeZoneProperty(property);
		return this.propertyLabelsById.get(normalized) ?? getFriendlyZonePropertyLabel(
			normalized || property,
			this.options.t("settings.tasknotes.heading")
		);
	}

	private formatPropertyForPreview(property: string): string {
		const resolved = this.resolvePropertyInput(property);
		return resolved
			? getFriendlyZonePropertyLabel(resolved, this.options.t("settings.tasknotes.heading"))
			: this.options.propertyLabel;
	}

	private resolvePropertyInput(property: string): string {
		const trimmed = property.trim();
		const mapped = this.propertyIdsByInput.get(trimmed);
		if (mapped) return mapped;

		const taskProperty = getFriendlyTaskPropertyId(
			trimmed,
			this.options.t("settings.tasknotes.heading")
		);
		return taskProperty ?? normalizeZoneProperty(trimmed);
	}
}

interface FriendlyZonePropertyOption {
	id: string;
	label: string;
}

function getFriendlyZonePropertyOptions(
	propertyIds: string[],
	taskPrefix: string
): FriendlyZonePropertyOption[] {
	const labelsById = new Map<string, string>();
	const labelCounts = new Map<string, number>();

	for (const propertyId of propertyIds) {
		const label = getFriendlyZonePropertyLabel(propertyId, taskPrefix);
		labelsById.set(propertyId, label);
		labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
	}

	return propertyIds
		.map((propertyId) => {
			const label = labelsById.get(propertyId) ?? propertyId;
			return {
				id: propertyId,
				label: labelCounts.get(label) === 1 ? label : `${label} (${propertyId})`,
			};
		})
		.sort((left, right) => left.label.localeCompare(right.label));
}

function getFriendlyZonePropertyLabel(propertyId: string, taskPrefix: string): string {
	const trimmed = propertyId.trim();
	if (/^note\./iu.test(trimmed)) return trimmed.slice("note.".length);
	if (/^task\./iu.test(trimmed)) return `${taskPrefix}: ${trimmed.slice("task.".length)}`;

	return trimmed;
}

function getFriendlyTaskPropertyId(property: string, taskPrefix: string): string | null {
	const prefix = `${taskPrefix}:`;
	if (!property.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase())) return null;

	const taskProperty = property.slice(prefix.length).trim();
	return taskProperty ? `task.${taskProperty}` : null;
}

function getColorPickerValue(color: string | undefined, fallback: string): string {
	return color?.startsWith("#") ? color : fallback;
}

function setZoneConfigColor(
	zone: CanvasBasesZoneConfig,
	color: string | undefined
): CanvasBasesZoneConfig {
	const nextZone = { ...zone };
	const nextColor = normalizeZoneColor(color);
	if (nextColor) {
		nextZone.color = nextColor;
	} else {
		delete nextZone.color;
	}

	return nextZone;
}

class ManualGroupNameModal extends Modal {
	private readonly options: {
		title: string;
		initialValue: string;
		submitLabel: string;
		cancelLabel: string;
	};
	private readonly onSubmit: (label: string) => void;
	private value: string;

	constructor(
		app: App,
		options: {
			title: string;
			initialValue: string;
			submitLabel: string;
			cancelLabel: string;
		},
		onSubmit: (label: string) => void
	) {
		super(app);
		this.options = options;
		this.value = options.initialValue;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		this.contentEl.empty();
		this.contentEl.addClass("canvas-bases-modal");
		this.contentEl.createEl("h2", { text: this.options.title });

		new Setting(this.contentEl)
			.setName(this.options.title)
			.addText((text) => {
				text
					.setValue(this.value)
					.onChange((value) => {
						this.value = value;
					});
				text.inputEl.addEventListener("keydown", (event) => {
					if (event.key !== "Enter") return;
					event.preventDefault();
					this.submit();
				});
				text.inputEl.focus();
				text.inputEl.select();
		});

		const actionsEl = this.contentEl.createDiv({ cls: "canvas-bases-modal__actions" });
		actionsEl
			.createEl("button", { text: this.options.cancelLabel })
			.addEventListener("click", () => {
				this.close();
			});
		const submitButton = actionsEl.createEl("button", {
			text: this.options.submitLabel,
			cls: "mod-cta",
		});
		submitButton.addEventListener("click", () => {
			this.submit();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private submit(): void {
		const label = this.value.trim();
		if (!label) return;

		this.onSubmit(label);
		this.close();
	}
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

function createItemId(): string {
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
	relationships: CanvasBasesRelationship[]
): Map<string, CanvasBasesRelationship> {
	const map = new Map<string, CanvasBasesRelationship>();
	for (const relationship of relationships) {
		map.set(getRelationshipEdgeId(relationship), relationship);
	}

	return map;
}

function mergeEdgeRelationshipMaps(
	...maps: Array<Map<string, CanvasBasesRelationship>>
): Map<string, CanvasBasesRelationship> {
	const merged = new Map<string, CanvasBasesRelationship>();
	for (const map of maps) {
		for (const [edgeId, relationship] of map) {
			merged.set(edgeId, relationship);
		}
	}

	return merged;
}

function isRemovableRelationship(relationship: CanvasBasesRelationship): boolean {
	return (
		relationship.metadata?.source === "property" ||
		relationship.metadata?.source === "tasknotes"
	);
}

function isTaskDependencyRelationship(
	relationship: CanvasBasesRelationship,
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
	relationship: CanvasBasesRelationship,
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
	snapshot: CanvasBasesViewSnapshot,
	options: MaterializeOptions
): string | null {
	if (options.taskNotesMode === "off" || options.taskNotesRelationships === "none") {
		return null;
	}

	const paths = getSnapshotPaths(snapshot).sort();

	return [options.taskNotesRelationships, ...paths].join("\u0000");
}

function applyStoredNodePositions(
	snapshot: CanvasBasesViewSnapshot,
	positions: CanvasBasesNodePositionMap
): CanvasBasesViewSnapshot {
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
		manualEntries: snapshot.manualEntries.map((entry) => ({
			...entry,
			position: positions[getFileNodeId(entry.path)],
		})),
		manualGroups: snapshot.manualGroups.map((group) => ({
			...group,
			position: positions[getManualGroupNodeId(group.id)],
		})),
		textCards: snapshot.textCards.map((card) => ({
			...card,
			position: positions[getTextCardNodeId(card.id)],
		})),
	};
}

function normalizeNodePositions(value: unknown): CanvasBasesNodePositionMap {
	if (!isRecord(value)) return {};

	const positions: CanvasBasesNodePositionMap = {};
	for (const [id, position] of Object.entries(value)) {
		if (typeof id !== "string" || !isRecord(position)) continue;

		const normalized = normalizeNodePosition(position);
		if (normalized) {
			positions[id] = normalized;
		}
	}

	return positions;
}

function normalizeNodePosition(value: Record<string, unknown>): CanvasBasesNodePosition | null {
	const x = normalizeCoordinate(value.x);
	const y = normalizeCoordinate(value.y);
	const width = normalizeSize(value.width);
	const height = normalizeSize(value.height);
	const color = normalizeCanvasNodeColor(value.color);

	if (x === null || y === null || width === null || height === null) return null;

	return {
		x,
		y,
		width,
		height,
		...(color ? { color } : {}),
	};
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

function clampResizeOrigin(value: number, max: number): number {
	return Math.max(MIN_NODE_COORDINATE, Math.min(Math.round(value), Math.round(max)));
}

function isRenderableCanvasNode(node: CanvasNode): node is CanvasRenderableNode {
	return node.type === "file" || node.type === "group" || node.type === "text";
}

function isSelectableCanvasNode(node: CanvasRenderableNode): node is CanvasFileNode | CanvasTextNode {
	return node.type === "file" || node.type === "text";
}

function getCanvasNodePosition(node: CanvasRenderableNode): CanvasBasesNodePosition {
	const color = normalizeCanvasNodeColor(node.color);
	return {
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height,
		...(color ? { color } : {}),
	};
}

function applyCanvasNodePosition<TNode extends CanvasRenderableNode>(
	node: TNode,
	position: CanvasBasesNodePosition | undefined
): TNode {
	return position
		? { ...node, ...position, color: normalizeCanvasNodeColor(position.color) }
		: node;
}

function buildGroupContainmentMap(
	nodes: CanvasRenderableNode[],
	positions: Map<string, CanvasBasesNodePosition>
): Map<string, string[]> {
	const positionedNodes = nodes.map((node) => ({
		node,
		position: positions.get(node.id) ?? getCanvasNodePosition(node),
	}));
	const cards = positionedNodes.filter(
		(entry) => entry.node.type === "file" || entry.node.type === "text"
	);
	const groups = positionedNodes.filter((entry) => entry.node.type === "group");
	const containment = new Map<string, string[]>();

	for (const group of groups) {
		containment.set(
			group.node.id,
			cards
				.filter((card) => positionsOverlap(card.position, group.position))
				.map((card) => card.node.id)
		);
	}

	return containment;
}

function positionsOverlap(
	first: CanvasBasesNodePosition,
	second: CanvasBasesNodePosition
): boolean {
	return (
		first.x < second.x + second.width &&
		first.x + first.width > second.x &&
		first.y < second.y + second.height &&
		first.y + first.height > second.y
	);
}

function positionCenterInside(
	position: CanvasBasesNodePosition,
	container: CanvasBasesNodePosition
): boolean {
	const centerX = position.x + position.width / 2;
	const centerY = position.y + position.height / 2;
	return (
		centerX >= container.x &&
		centerX <= container.x + container.width &&
		centerY >= container.y &&
		centerY <= container.y + container.height
	);
}

function getPositionArea(position: CanvasBasesNodePosition): number {
	return position.width * position.height;
}

function getBoundingGroupPosition(
	positions: CanvasBasesNodePosition[]
): CanvasBasesNodePosition | null {
	if (positions.length === 0) return null;

	const left = Math.min(...positions.map((position) => position.x));
	const top = Math.min(...positions.map((position) => position.y));
	const right = Math.max(...positions.map((position) => position.x + position.width));
	const bottom = Math.max(...positions.map((position) => position.y + position.height));

	return {
		x: clampCoordinate(left - GROUP_PADDING),
		y: clampCoordinate(top - GROUP_HEADER_HEIGHT),
		width: Math.max(MIN_GROUP_NODE_WIDTH, right - left + GROUP_PADDING * 2),
		height: Math.max(MIN_GROUP_NODE_HEIGHT, bottom - top + GROUP_HEADER_HEIGHT + GROUP_PADDING),
	};
}

function getRectFromPoints(first: LinkPoint, second: LinkPoint): CanvasBasesNodePosition {
	const x = Math.min(first.x, second.x);
	const y = Math.min(first.y, second.y);

	return {
		x: clampCoordinate(x),
		y: clampCoordinate(y),
		width: Math.round(Math.abs(second.x - first.x)),
		height: Math.round(Math.abs(second.y - first.y)),
	};
}

function getNodePositionAtPoint(
	point: LinkPoint,
	width: number,
	height: number
): CanvasBasesNodePosition {
	return {
		x: clampCoordinate(point.x),
		y: clampCoordinate(point.y),
		width,
		height,
	};
}

function setNodeGeometry(element: HTMLElement, position: CanvasBasesNodePosition): void {
	element.style.setProperty("left", `${position.x}px`);
	element.style.setProperty("top", `${position.y}px`);
	element.style.setProperty("width", `${position.width}px`);
	element.style.setProperty("height", `${position.height}px`);
}

function setNodeColor(element: HTMLElement, color: string | undefined): void {
	const cssColor = getCanvasNodeCssColor(color);
	element.toggleClass("has-node-color", Boolean(cssColor));
	if (cssColor) {
		element.style.setProperty("--canvas-bases-node-color", cssColor);
	} else {
		element.style.removeProperty("--canvas-bases-node-color");
	}
}

function getNodePositionWithElementGeometry(
	element: HTMLElement | null,
	fallback: CanvasBasesNodePosition | undefined
): CanvasBasesNodePosition | undefined {
	const elementPosition = element ? getElementNodePosition(element) : null;
	return elementPosition ? { ...(fallback ?? {}), ...elementPosition } : fallback;
}

function getElementNodePosition(element: HTMLElement): CanvasBasesNodePosition | null {
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

function getNodeCenter(position: CanvasBasesNodePosition): LinkPoint {
	return {
		x: position.x + position.width / 2,
		y: position.y + position.height / 2,
	};
}

function getNodeEdgeAnchor(position: CanvasBasesNodePosition, toward: LinkPoint): LinkPoint {
	const center = getNodeCenter(position);
	const dx = toward.x - center.x;
	const dy = toward.y - center.y;

	if (dx === 0 && dy === 0) {
		return {
			x: position.x + position.width,
			y: center.y,
		};
	}

	const halfWidth = Math.max(position.width / 2, 1);
	const halfHeight = Math.max(position.height / 2, 1);
	const hitsHorizontalEdge = Math.abs(dx) / halfWidth > Math.abs(dy) / halfHeight;
	const scale = hitsHorizontalEdge
		? halfWidth / Math.abs(dx)
		: halfHeight / Math.abs(dy);

	return {
		x: center.x + dx * scale,
		y: center.y + dy * scale,
	};
}

function getNodeEdgeVector(position: CanvasBasesNodePosition, point: LinkPoint): LinkPoint {
	const edgeDistances = [
		{ distance: Math.abs(point.x - position.x), vector: { x: -1, y: 0 } },
		{ distance: Math.abs(point.x - (position.x + position.width)), vector: { x: 1, y: 0 } },
		{ distance: Math.abs(point.y - position.y), vector: { x: 0, y: -1 } },
		{ distance: Math.abs(point.y - (position.y + position.height)), vector: { x: 0, y: 1 } },
	];

	return edgeDistances.reduce((closest, candidate) =>
		candidate.distance < closest.distance ? candidate : closest
	).vector;
}

function clampNumber(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function roundCoordinate(value: number): number {
	return Math.round(value * 100) / 100;
}

function getCanvasNodeKind(element: HTMLElement): CanvasNodeKind | null {
	const kind = element.getAttribute("data-canvas-bases-node-kind");
	return kind === "file" || kind === "group" || kind === "text" ? kind : null;
}

function getResizeDirection(value: string | null): ResizeDirection | null {
	return RESIZE_HANDLE_DIRECTIONS.includes(value as ResizeDirection)
		? (value as ResizeDirection)
		: null;
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

function normalizeGroupByProperty(groupBy: CanvasBasesControllerViewConfig["groupBy"]): string | null {
	const property = typeof groupBy === "string" ? groupBy : groupBy?.property;
	if (typeof property !== "string") return null;

	const normalized = normalizeZoneProperty(property);
	return normalized ? normalized : null;
}

function isWritableActiveGroupProperty(propertyId: string): boolean {
	const property = propertyId.trim();
	return toWritableNotePropertyName(property) !== null || /^task\./iu.test(property);
}

function activeGroupTargetsMatch(left: ActiveGroupTarget, right: ActiveGroupTarget): boolean {
	return left.id === right.id;
}

function getVisibleGroupCount(snapshot: CanvasBasesViewSnapshot): number {
	return snapshot.groups.filter((group) => !group.isImplicit).length + snapshot.manualGroups.length;
}

function setsEqual<T>(left: Set<T>, right: Set<T>): boolean {
	if (left.size !== right.size) return false;
	for (const value of left) {
		if (!right.has(value)) return false;
	}
	return true;
}

function toWritableNotePropertyName(propertyId: string): string | null {
	const property = propertyId.trim();
	if (
		!property ||
		/^(file|formula|task)\./iu.test(property)
	) {
		return null;
	}

	return property.replace(/^(note\.|properties\.)/iu, "");
}

function getPropertyInfoNames(value: unknown): string[] {
	const properties = new Set<string>();
	const addName = (name: unknown) => {
		if (typeof name === "string" && name.trim()) properties.add(name.trim());
	};
	const addInfo = (info: unknown) => {
		if (typeof info === "string") {
			addName(info);
			return;
		}
		if (!isRecord(info)) return;
		addName(info.name);
		addName(info.id);
		addName(info.key);
	};

	if (Array.isArray(value)) {
		for (const info of value) addInfo(info);
		return [...properties];
	}
	if (!isRecord(value)) return [];

	for (const [key, info] of Object.entries(value)) {
		addName(key);
		addInfo(info);
	}
	return [...properties];
}

function getPropertyInfoType(value: unknown, propertyName: string): string | null {
	const normalizedPropertyName = propertyName.trim().toLowerCase();
	if (!normalizedPropertyName) return null;

	const readType = (info: unknown): string | null => {
		if (!isRecord(info)) return null;
		const type = [info.type, info.widget, info.kind].find(
			(candidate) => typeof candidate === "string" && candidate.trim()
		);
		return typeof type === "string" ? type.trim() : null;
	};
	const matchesProperty = (info: unknown): boolean => {
		if (!isRecord(info)) return false;
		return [info.name, info.id, info.key].some(
			(candidate) =>
				typeof candidate === "string" &&
				candidate.trim().toLowerCase() === normalizedPropertyName
		);
	};

	if (Array.isArray(value)) {
		return readType(value.find(matchesProperty)) ?? null;
	}
	if (!isRecord(value)) return null;

	for (const [key, info] of Object.entries(value)) {
		if (key.trim().toLowerCase() === normalizedPropertyName || matchesProperty(info)) {
			return readType(info);
		}
	}
	return null;
}

function toFrontmatterPropertyName(propertyId: string): string | null {
	return toWritableNotePropertyName(propertyId);
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

	if (isUnknownArray(value)) {
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
					".canvas-bases-canvas-control-button",
					".canvas-bases-canvas-resize-handle",
					".canvas-bases-canvas-card-action",
					".canvas-bases-canvas-link-handle",
					".canvas-bases-canvas-file__editor",
					".canvas-bases-canvas-text-card__editor",
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
					".canvas-bases-canvas-file",
					".canvas-bases-canvas-group",
					".canvas-bases-canvas-text-card",
					".canvas-bases-canvas-control-button",
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

function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}
