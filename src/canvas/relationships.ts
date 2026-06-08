import { App, TFile } from "obsidian";
import type {
	BaseboardRelationship,
	BaseboardViewSnapshot,
	MaterializeOptions,
} from "../types";

type LinkLike = {
	link: string;
};

export function collectRelationships(
	app: App,
	snapshot: BaseboardViewSnapshot,
	options: MaterializeOptions
): BaseboardRelationship[] {
	if (options.edgeMode === "none") return [];

	const visiblePaths = new Set(
		snapshot.groups.flatMap((group) => group.entries.map((entry) => entry.path))
	);
	const relationships: BaseboardRelationship[] = [];

	for (const group of snapshot.groups) {
		for (const entry of group.entries) {
			const file = getFile(app, entry.path);
			if (!file) continue;

			if (options.edgeMode === "wikilinks" || options.edgeMode === "all") {
				relationships.push(...collectContentLinks(app, file, visiblePaths));
			}

			if (options.edgeMode === "properties" || options.edgeMode === "all") {
				relationships.push(
					...collectPropertyLinks(app, file, visiblePaths, options.edgeProperties)
				);
			}
		}
	}

	return dedupeRelationships(relationships);
}

function collectContentLinks(
	app: App,
	file: TFile,
	visiblePaths: Set<string>
): BaseboardRelationship[] {
	const cache = app.metadataCache.getFileCache(file);
	const links = [...(cache?.links ?? []), ...(cache?.embeds ?? [])] as LinkLike[];

	return links
		.map((link) => resolveRelationship(app, file, link.link, visiblePaths))
		.filter((relationship): relationship is BaseboardRelationship => relationship !== null)
		.map((relationship) => ({
			...relationship,
			metadata: { source: "wikilink" as const },
		}));
}

function collectPropertyLinks(
	app: App,
	file: TFile,
	visiblePaths: Set<string>,
	properties: string[]
): BaseboardRelationship[] {
	if (properties.length === 0) return [];

	const cache = app.metadataCache.getFileCache(file);
	const frontmatter = cache?.frontmatter;
	if (!frontmatter) return [];

	const relationships: BaseboardRelationship[] = [];

	for (const property of properties) {
		const rawValue = frontmatter[property];
		for (const target of extractLinkTargets(rawValue)) {
			const relationship = resolveRelationship(app, file, target, visiblePaths, property);
			if (relationship) {
				relationships.push({
					...relationship,
					metadata: { source: "property", property },
				});
			}
		}
	}

	return relationships;
}

function resolveRelationship(
	app: App,
	sourceFile: TFile,
	linkText: string,
	visiblePaths: Set<string>,
	label?: string
): BaseboardRelationship | null {
	const normalizedLinkText = normalizeLinkText(linkText);
	if (!normalizedLinkText) return null;

	const target = app.metadataCache.getFirstLinkpathDest(normalizedLinkText, sourceFile.path);
	if (!target || !visiblePaths.has(target.path)) return null;

	return {
		sourcePath: sourceFile.path,
		targetPath: target.path,
		label,
	};
}

function extractLinkTargets(value: unknown): string[] {
	if (typeof value === "string") {
		return extractTargetsFromString(value);
	}

	if (Array.isArray(value)) {
		return value.flatMap(extractLinkTargets);
	}

	if (isRecord(value)) {
		const candidates = [value.path, value.file, value.link, value.uid].filter(
			(candidate): candidate is string => typeof candidate === "string"
		);
		return candidates.flatMap(extractTargetsFromString);
	}

	return [];
}

function extractTargetsFromString(value: string): string[] {
	const targets: string[] = [];
	const wikiLinkPattern = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/gu;
	let match = wikiLinkPattern.exec(value);

	while (match) {
		targets.push(match[1]);
		match = wikiLinkPattern.exec(value);
	}

	if (targets.length === 0 && value.trim().length > 0) {
		targets.push(value);
	}

	return targets;
}

function normalizeLinkText(value: string): string {
	return value
		.trim()
		.replace(/^\[\[/u, "")
		.replace(/\]\]$/u, "")
		.split("|")[0]
		.split("#")[0]
		.trim();
}

function dedupeRelationships(
	relationships: BaseboardRelationship[]
): BaseboardRelationship[] {
	const seen = new Set<string>();
	const result: BaseboardRelationship[] = [];

	for (const relationship of relationships) {
		const key = `${relationship.sourcePath}\u0000${relationship.targetPath}\u0000${
			relationship.label ?? ""
		}`;
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(relationship);
	}

	return result;
}

function getFile(app: App, path: string): TFile | null {
	const file = app.vault.getAbstractFileByPath(path);
	return file instanceof TFile ? file : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
