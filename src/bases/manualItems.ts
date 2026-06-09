import { TFile } from "obsidian";
import type { App, BasesViewConfig } from "obsidian";
import { VIEW_CONFIG_KEYS } from "../constants";
import type {
	CanvasBasesEntrySnapshot,
	CanvasBasesManualGroupSnapshot,
	CanvasBasesTextCardSnapshot,
	CanvasBasesViewSnapshot,
} from "../types";
import { normalizeZones } from "./zones";

const MANUAL_GROUP_LABEL = "Pinned notes";
const DEFAULT_MANUAL_GROUP_ID = "pinned";

export function applyManualViewItems(
	app: App,
	snapshot: CanvasBasesViewSnapshot,
	config: BasesViewConfig
): CanvasBasesViewSnapshot {
	const manualEntries = buildManualEntries(app, snapshot, config);
	const textCards = normalizeTextCards(config.get(VIEW_CONFIG_KEYS.textCards));
	const manualGroups = mergeManualGroups(
		normalizeConfiguredManualGroups(
			config.get(VIEW_CONFIG_KEYS.manualGroups),
			manualEntries.length > 0
		),
		getCustomZoneGroups(config)
	);

	if (manualEntries.length === 0 && textCards.length === 0 && manualGroups.length === 0) {
		return snapshot;
	}

	return {
		...snapshot,
		manualEntries,
		manualGroups,
		textCards,
		totalEntries: snapshot.totalEntries + manualEntries.length,
	};
}

export function normalizeManualNotePaths(value: unknown): string[] {
	const paths =
		typeof value === "string"
			? value.split(/[\n,]/u)
			: Array.isArray(value)
				? value
				: [];
	const seen = new Set<string>();
	const result: string[] = [];

	for (const entry of paths) {
		if (typeof entry !== "string") continue;
		const path = entry.trim();
		if (!path || seen.has(path)) continue;
		seen.add(path);
		result.push(path);
	}

	return result;
}

export function normalizeTextCards(value: unknown): CanvasBasesTextCardSnapshot[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((entry) => normalizeTextCard(entry))
		.filter((entry): entry is CanvasBasesTextCardSnapshot => entry !== null);
}

export function normalizeManualGroups(value: unknown): CanvasBasesManualGroupSnapshot[] {
	if (!Array.isArray(value)) return [];

	const seen = new Set<string>();
	const groups: CanvasBasesManualGroupSnapshot[] = [];

	for (const entry of value) {
		const group = normalizeManualGroup(entry);
		if (!group || seen.has(group.id)) continue;
		seen.add(group.id);
		groups.push(group);
	}

	return groups;
}

export function setManualNotePaths(config: BasesViewConfig, paths: string[]): void {
	config.set(VIEW_CONFIG_KEYS.manualNotePaths, normalizeManualNotePaths(paths));
}

export function setManualGroups(
	config: BasesViewConfig,
	groups: CanvasBasesManualGroupSnapshot[]
): void {
	config.set(
		VIEW_CONFIG_KEYS.manualGroups,
		normalizeManualGroups(groups).map((group) => ({
			id: group.id,
			label: group.label,
		}))
	);
}

export function setTextCards(config: BasesViewConfig, cards: CanvasBasesTextCardSnapshot[]): void {
	config.set(
		VIEW_CONFIG_KEYS.textCards,
		cards.map((card) => ({
			id: card.id,
			text: card.text,
		}))
	);
}

export function createDefaultManualGroup(): CanvasBasesManualGroupSnapshot {
	return {
		id: DEFAULT_MANUAL_GROUP_ID,
		label: MANUAL_GROUP_LABEL,
	};
}

function buildManualEntries(
	app: App,
	snapshot: CanvasBasesViewSnapshot,
	config: BasesViewConfig
): CanvasBasesEntrySnapshot[] {
	const visiblePaths = new Set(
		snapshot.groups.flatMap((group) => group.entries.map((entry) => entry.path))
	);
	const manualPaths = normalizeManualNotePaths(config.get(VIEW_CONFIG_KEYS.manualNotePaths));
	const entries: CanvasBasesEntrySnapshot[] = [];

	for (const path of manualPaths) {
		if (visiblePaths.has(path)) continue;
		const file = app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile) || file.extension !== "md") continue;

		visiblePaths.add(path);
		entries.push({
			path: file.path,
			name: file.basename || file.name,
			file,
			properties: [],
			isManual: true,
		});
	}

	return entries;
}

function normalizeConfiguredManualGroups(
	value: unknown,
	hasManualEntries: boolean
): CanvasBasesManualGroupSnapshot[] {
	if (Array.isArray(value)) {
		return normalizeManualGroups(value);
	}

	return hasManualEntries ? [createDefaultManualGroup()] : [];
}

function getCustomZoneGroups(config: BasesViewConfig): CanvasBasesManualGroupSnapshot[] {
	return normalizeZones(config.get(VIEW_CONFIG_KEYS.zones))
		.filter((zone) => zone.origin === "custom" && typeof zone.id === "string")
		.map((zone) => ({
			id: zone.id ?? "",
			label: zone.label?.trim() || zone.value || zone.property,
		}));
}

function mergeManualGroups(
	manualGroups: CanvasBasesManualGroupSnapshot[],
	customZoneGroups: CanvasBasesManualGroupSnapshot[]
): CanvasBasesManualGroupSnapshot[] {
	const groupsById = new Map<string, CanvasBasesManualGroupSnapshot>();
	for (const group of manualGroups) groupsById.set(group.id, group);
	for (const group of customZoneGroups) groupsById.set(group.id, group);

	return [...groupsById.values()];
}

function normalizeManualGroup(value: unknown): CanvasBasesManualGroupSnapshot | null {
	if (!isRecord(value) || typeof value.id !== "string") return null;

	const id = value.id.trim();
	if (!id) return null;
	const label = typeof value.label === "string" ? value.label.trim() : "";

	return {
		id,
		label: label || MANUAL_GROUP_LABEL,
	};
}

function normalizeTextCard(value: unknown): CanvasBasesTextCardSnapshot | null {
	if (!isRecord(value) || typeof value.id !== "string") return null;

	return {
		id: value.id,
		text: typeof value.text === "string" ? value.text : "",
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
