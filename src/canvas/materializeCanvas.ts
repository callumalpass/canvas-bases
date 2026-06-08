import { App, TFile, normalizePath } from "obsidian";
import type {
	BaseboardGenerationSummary,
	BaseboardRelationship,
	BaseboardViewSnapshot,
	MaterializeOptions,
} from "../types";
import { buildBaseboardCanvas } from "./canvasBuilder";
import { collectRelationships } from "./relationships";
import { parseJsonCanvas, stringifyJsonCanvas, type JsonCanvas } from "./jsonCanvas";

export async function materializeCanvas({
	app,
	snapshot,
	options,
	relationships,
}: {
	app: App;
	snapshot: BaseboardViewSnapshot;
	options: MaterializeOptions;
	relationships?: BaseboardRelationship[];
}): Promise<BaseboardGenerationSummary> {
	const canvasPath = normalizePath(options.canvasPath);
	const existingCanvas = await readExistingCanvas(app, canvasPath);
	const canvasRelationships = relationships ?? collectRelationships(app, snapshot, options);
	const canvas = buildBaseboardCanvas(snapshot, options, canvasRelationships, existingCanvas);

	await ensureFolder(app, canvasPath);
	await writeCanvas(app, canvasPath, stringifyJsonCanvas(canvas));

	return {
		canvasPath,
		nodeCount: canvas.nodes?.length ?? 0,
		groupCount: snapshot.groups.length,
		edgeCount: canvas.edges?.length ?? 0,
	};
}

export async function openCanvas(app: App, canvasPath: string): Promise<void> {
	await app.workspace.openLinkText(normalizePath(canvasPath), "", false);
}

async function readExistingCanvas(app: App, canvasPath: string): Promise<JsonCanvas> {
	const file = app.vault.getAbstractFileByPath(canvasPath);
	if (!(file instanceof TFile)) return {};

	try {
		return parseJsonCanvas(await app.vault.read(file));
	} catch {
		return {};
	}
}

async function writeCanvas(app: App, canvasPath: string, contents: string): Promise<void> {
	const existing = app.vault.getAbstractFileByPath(canvasPath);

	if (existing instanceof TFile) {
		await app.vault.modify(existing, contents);
		return;
	}

	await app.vault.create(canvasPath, contents);
}

async function ensureFolder(app: App, canvasPath: string): Promise<void> {
	const folder = getParentPath(canvasPath);
	if (!folder || folder === ".") return;

	const existing = app.vault.getAbstractFileByPath(folder);
	if (existing) return;

	await app.vault.createFolder(folder);
}

function getParentPath(path: string): string {
	const index = path.lastIndexOf("/");
	return index > 0 ? path.slice(0, index) : "";
}
