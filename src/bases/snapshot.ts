import type {
	BasesEntry,
	BasesPropertyId,
	BasesQueryResult,
	BasesViewConfig,
	Value,
} from "obsidian";
import type {
	CanvasBasesEntryPropertySnapshot,
	CanvasBasesGroupSnapshot,
	CanvasBasesViewSnapshot,
} from "../types";
import { getGroupNodeId } from "../canvas/canvasBuilder";

const UNTITLED_VIEW = "Canvas Bases";
const UNGROUPED_LABEL = "All notes";
const TITLE_PROPERTY_IDS = new Set(["file.name", "file.basename", "file.fullname", "file.path"]);

export function buildCanvasBasesSnapshot(
	data: BasesQueryResult,
	config: BasesViewConfig,
	groupByPropertyId?: string | null
): CanvasBasesViewSnapshot {
	const viewName = config.name?.trim() || UNTITLED_VIEW;
	const visibleProperties = getVisibleProperties(config);
	const hasSemanticGroups = Boolean(groupByPropertyId);
	const hasSingleImplicitGroup = !hasSemanticGroups && data.groupedData.length === 1;
	const groups = data.groupedData.map((group) => {
		const hasKey = group.hasKey();
		const value = hasKey ? formatGroupValue(group.key) : "";
		const label = value || (hasSemanticGroups ? "Empty" : UNGROUPED_LABEL);
		const snapshotGroup: CanvasBasesGroupSnapshot = {
			id: getGroupNodeId(viewName, label),
			label,
			...(hasSingleImplicitGroup && !hasKey ? { isImplicit: true } : {}),
			entries: group.entries.map((entry) => ({
				path: entry.file.path,
				name: entry.file.basename || entry.file.name,
				file: entry.file,
				properties: buildEntryProperties(entry, visibleProperties, config),
			})),
		};
		if (groupByPropertyId) {
			snapshotGroup.property = groupByPropertyId;
			snapshotGroup.value = value;
		}

		return snapshotGroup;
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
): CanvasBasesEntryPropertySnapshot[] {
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

function formatGroupValue(value: Value | undefined): string {
	const text = value?.toString().trim();
	return text && text.length > 0 ? text : "";
}

function formatValueText(value: Value | null): string {
	const text = value?.toString().trim() ?? "";
	return text.length > 0 ? text : "Empty";
}
