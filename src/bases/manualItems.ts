import { TFile } from "obsidian";
import type { App, BasesViewConfig } from "obsidian";
import { VIEW_CONFIG_KEYS } from "../constants";
import type {
	BaseboardEntrySnapshot,
	BaseboardManualGroupSnapshot,
	BaseboardTextCardSnapshot,
	BaseboardViewSnapshot,
} from "../types";

const MANUAL_GROUP_LABEL = "Pinned notes";
const DEFAULT_MANUAL_GROUP_ID = "pinned";

export function applyManualViewItems(
	app: App,
	snapshot: BaseboardViewSnapshot,
	config: BasesViewConfig
): BaseboardViewSnapshot {
	const manualEntries = buildManualEntries(app, snapshot, config);
	const textCards = normalizeTextCards(config.get(VIEW_CONFIG_KEYS.textCards));
	const manualGroups = normalizeConfiguredManualGroups(
		config.get(VIEW_CONFIG_KEYS.manualGroups),
		manualEntries.length > 0
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

export function normalizeTextCards(value: unknown): BaseboardTextCardSnapshot[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((entry) => normalizeTextCard(entry))
		.filter((entry): entry is BaseboardTextCardSnapshot => entry !== null);
}

export function normalizeManualGroups(value: unknown): BaseboardManualGroupSnapshot[] {
	if (!Array.isArray(value)) return [];

	const seen = new Set<string>();
	const groups: BaseboardManualGroupSnapshot[] = [];

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
	groups: BaseboardManualGroupSnapshot[]
): void {
	config.set(
		VIEW_CONFIG_KEYS.manualGroups,
		normalizeManualGroups(groups).map((group) => ({
			id: group.id,
			label: group.label,
		}))
	);
}

export function setTextCards(config: BasesViewConfig, cards: BaseboardTextCardSnapshot[]): void {
	config.set(
		VIEW_CONFIG_KEYS.textCards,
		cards.map((card) => ({
			id: card.id,
			text: card.text,
		}))
	);
}

export function createDefaultManualGroup(): BaseboardManualGroupSnapshot {
	return {
		id: DEFAULT_MANUAL_GROUP_ID,
		label: MANUAL_GROUP_LABEL,
	};
}

function buildManualEntries(
	app: App,
	snapshot: BaseboardViewSnapshot,
	config: BasesViewConfig
): BaseboardEntrySnapshot[] {
	const visiblePaths = new Set(
		snapshot.groups.flatMap((group) => group.entries.map((entry) => entry.path))
	);
	const manualPaths = normalizeManualNotePaths(config.get(VIEW_CONFIG_KEYS.manualNotePaths));
	const entries: BaseboardEntrySnapshot[] = [];

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
): BaseboardManualGroupSnapshot[] {
	if (Array.isArray(value)) {
		return normalizeManualGroups(value);
	}

	return hasManualEntries ? [createDefaultManualGroup()] : [];
}

function normalizeManualGroup(value: unknown): BaseboardManualGroupSnapshot | null {
	if (!isRecord(value) || typeof value.id !== "string") return null;

	const id = value.id.trim();
	if (!id) return null;
	const label = typeof value.label === "string" ? value.label.trim() : "";

	return {
		id,
		label: label || MANUAL_GROUP_LABEL,
	};
}

function normalizeTextCard(value: unknown): BaseboardTextCardSnapshot | null {
	if (!isRecord(value) || typeof value.id !== "string") return null;

	return {
		id: value.id,
		text: typeof value.text === "string" ? value.text : "",
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
