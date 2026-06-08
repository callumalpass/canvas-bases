import type {
	BasesEntry,
	BasesPropertyId,
	BasesQueryResult,
	BasesViewConfig,
	Value,
} from "obsidian";
import type {
	BaseboardEntryPropertySnapshot,
	BaseboardGroupSnapshot,
	BaseboardViewSnapshot,
} from "../types";
import { getGroupNodeId } from "../canvas/canvasBuilder";

const UNTITLED_VIEW = "Baseboard";
const UNGROUPED_LABEL = "All notes";
const TITLE_PROPERTY_IDS = new Set(["file.name", "file.basename", "file.fullname", "file.path"]);

export function buildBaseboardSnapshot(
	data: BasesQueryResult,
	config: BasesViewConfig
): BaseboardViewSnapshot {
	const viewName = config.name?.trim() || UNTITLED_VIEW;
	const visibleProperties = getVisibleProperties(config);
	const groups = data.groupedData.map((group) => {
		const label = group.hasKey() ? formatGroupKey(group.key) : UNGROUPED_LABEL;

		return {
			id: getGroupNodeId(viewName, label),
			label,
			entries: group.entries.map((entry) => ({
				path: entry.file.path,
				name: entry.file.basename || entry.file.name,
				file: entry.file,
				properties: buildEntryProperties(entry, visibleProperties, config),
			})),
		} satisfies BaseboardGroupSnapshot;
	});

	return {
		viewName,
		groups,
		manualEntries: [],
		manualGroups: [],
		textCards: [],
		totalEntries: groups.reduce((count, group) => count + group.entries.length, 0),
	};
}

function getVisibleProperties(config: BasesViewConfig): BasesPropertyId[] {
	return config
		.getOrder()
		.filter((propertyId) => !TITLE_PROPERTY_IDS.has(propertyId));
}

function buildEntryProperties(
	entry: BasesEntry,
	propertyIds: BasesPropertyId[],
	config: BasesViewConfig
): BaseboardEntryPropertySnapshot[] {
	return propertyIds.map((propertyId) => {
		const value = entry.getValue(propertyId);
		const text = formatValueText(value);

		return {
			id: propertyId,
			displayName: config.getDisplayName(propertyId),
			value,
			text,
			isEmpty: !value?.isTruthy(),
		};
	});
}

function formatGroupKey(value: Value | undefined): string {
	const text = value?.toString().trim();
	return text && text.length > 0 ? text : "Empty";
}

function formatValueText(value: Value | null): string {
	const text = value?.toString().trim() ?? "";
	return text.length > 0 ? text : "Empty";
}
