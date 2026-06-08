import { TFile } from "obsidian";
import type { App, BasesViewConfig } from "obsidian";
import { VIEW_CONFIG_KEYS } from "../constants";
import type {
	BaseboardEntrySnapshot,
	BaseboardTextCardSnapshot,
	BaseboardViewSnapshot,
} from "../types";
import { getGroupNodeId } from "../canvas/canvasBuilder";

const MANUAL_GROUP_LABEL = "Pinned notes";

export function applyManualViewItems(
	app: App,
	snapshot: BaseboardViewSnapshot,
	config: BasesViewConfig
): BaseboardViewSnapshot {
	const manualEntries = buildManualEntries(app, snapshot, config);
	const textCards = normalizeTextCards(config.get(VIEW_CONFIG_KEYS.textCards));

	if (manualEntries.length === 0 && textCards.length === 0) {
		return snapshot;
	}

	return {
		...snapshot,
		groups:
			manualEntries.length > 0
				? [
						...snapshot.groups,
						{
							id: getGroupNodeId(snapshot.viewName, MANUAL_GROUP_LABEL),
							label: MANUAL_GROUP_LABEL,
							entries: manualEntries,
						},
					]
				: snapshot.groups,
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

export function setManualNotePaths(config: BasesViewConfig, paths: string[]): void {
	config.set(VIEW_CONFIG_KEYS.manualNotePaths, normalizeManualNotePaths(paths));
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
