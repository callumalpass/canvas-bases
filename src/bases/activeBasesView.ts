import { App, TFile } from "obsidian";
import type { BasesQueryResult, BasesViewConfig } from "obsidian";
import type { CanvasBasesViewSnapshot } from "../types";
import { buildCanvasBasesSnapshot } from "./snapshot";

const BASES_VIEW_TYPE = "bases";
const KEY_SEPARATOR = "\u001f";

export interface ActiveBasesViewSource {
	basePath: string;
	defaultCanvasName: string;
	sourceKey: string;
	sourceLabel: string;
	snapshot: CanvasBasesViewSnapshot;
	viewType: string;
}

type ViewConfigProvider = {
	getViewConfig(): unknown;
};

type ViewTypeProvider = {
	getViewType(): unknown;
};

export function getActiveBasesViewSource(app: App): ActiveBasesViewSource | null {
	const leafView = app.workspace.getMostRecentLeaf()?.view;
	if (!isRecord(leafView) || getViewType(leafView) !== BASES_VIEW_TYPE) {
		return null;
	}

	const controller = toRecord(leafView.controller);
	const activeView = toRecord(controller?.view);
	const config = getBasesViewConfig(activeView, controller);
	const data = getBasesQueryResult(activeView);
	const baseFile = getBaseFile(leafView, controller);

	if (!config || !data || !baseFile) {
		return null;
	}

	const viewName = config.name?.trim() || readString(controller, "viewName") || "Base";
	const viewType = readString(config, "type") || readString(activeView, "type") || "unknown";
	const snapshot = buildCanvasBasesSnapshot(data, config);
	const sourceKey = buildActiveBasesViewKey(baseFile.path, viewName, viewType);

	return {
		basePath: baseFile.path,
		defaultCanvasName: `${baseFile.basename} - ${viewName}`,
		sourceKey,
		sourceLabel: `${baseFile.basename}: ${viewName}`,
		snapshot,
		viewType,
	};
}

export function buildActiveBasesViewKey(
	basePath: string,
	viewName: string,
	viewType: string
): string {
	return [basePath, viewName, viewType].join(KEY_SEPARATOR);
}

function getBasesViewConfig(
	activeView: Record<string, unknown> | null,
	controller: Record<string, unknown> | null
): BasesViewConfig | null {
	const viewConfig = activeView?.config;
	if (isBasesViewConfig(viewConfig)) return viewConfig;

	const getViewConfig = controller?.getViewConfig;
	if (typeof getViewConfig !== "function" || !isViewConfigProvider(controller)) return null;

	const controllerConfig = controller.getViewConfig();
	return isBasesViewConfig(controllerConfig) ? controllerConfig : null;
}

function getBasesQueryResult(
	activeView: Record<string, unknown> | null
): BasesQueryResult | null {
	const data = activeView?.data;
	return isBasesQueryResult(data) ? data : null;
}

function getBaseFile(
	leafView: Record<string, unknown>,
	controller: Record<string, unknown> | null
): TFile | null {
	const currentFile = controller?.currentFile;
	if (currentFile instanceof TFile) return currentFile;

	const viewFile = leafView.file;
	return viewFile instanceof TFile ? viewFile : null;
}

function getViewType(view: Record<string, unknown>): string | null {
	const getType = view.getViewType;
	if (typeof getType !== "function" || !isViewTypeProvider(view)) return null;

	const viewType = view.getViewType();
	return typeof viewType === "string" ? viewType : null;
}

function isBasesViewConfig(value: unknown): value is BasesViewConfig {
	return (
		isRecord(value) &&
		typeof value.name === "string" &&
		typeof value.get === "function" &&
		typeof value.set === "function"
	);
}

function isBasesQueryResult(value: unknown): value is BasesQueryResult {
	if (!isRecord(value) || !Array.isArray(value.data)) return false;

	const groupedData = value.groupedData;
	return Array.isArray(groupedData);
}

function readString(value: unknown, key: string): string | null {
	if (!isRecord(value)) return null;

	const entry = value[key];
	return typeof entry === "string" && entry.trim().length > 0 ? entry.trim() : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
	return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isViewConfigProvider(
	value: Record<string, unknown> | null
): value is Record<string, unknown> & ViewConfigProvider {
	return typeof value?.getViewConfig === "function";
}

function isViewTypeProvider(
	value: Record<string, unknown>
): value is Record<string, unknown> & ViewTypeProvider {
	return typeof value.getViewType === "function";
}
