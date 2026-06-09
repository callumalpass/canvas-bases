import type {
	CanvasBasesEntrySnapshot,
	CanvasBasesViewSnapshot,
} from "../types";

export function getSnapshotEntries(snapshot: CanvasBasesViewSnapshot): CanvasBasesEntrySnapshot[] {
	return [
		...snapshot.groups.flatMap((group) => group.entries),
		...(snapshot.manualEntries ?? []),
	];
}

export function getSnapshotPaths(snapshot: CanvasBasesViewSnapshot): string[] {
	return getSnapshotEntries(snapshot).map((entry) => entry.path);
}

export function getSnapshotEntriesByPath(
	snapshot: CanvasBasesViewSnapshot
): Map<string, CanvasBasesEntrySnapshot> {
	return new Map(getSnapshotEntries(snapshot).map((entry) => [entry.path, entry]));
}
