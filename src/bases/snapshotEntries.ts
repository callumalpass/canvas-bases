import type {
	BaseboardEntrySnapshot,
	BaseboardViewSnapshot,
} from "../types";

export function getSnapshotEntries(snapshot: BaseboardViewSnapshot): BaseboardEntrySnapshot[] {
	return [
		...snapshot.groups.flatMap((group) => group.entries),
		...(snapshot.manualEntries ?? []),
	];
}

export function getSnapshotPaths(snapshot: BaseboardViewSnapshot): string[] {
	return getSnapshotEntries(snapshot).map((entry) => entry.path);
}

export function getSnapshotEntriesByPath(
	snapshot: BaseboardViewSnapshot
): Map<string, BaseboardEntrySnapshot> {
	return new Map(getSnapshotEntries(snapshot).map((entry) => [entry.path, entry]));
}
