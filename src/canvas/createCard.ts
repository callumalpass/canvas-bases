import { TFile, normalizePath, type App } from "obsidian";
import {
	parseJsonCanvas,
	stringifyJsonCanvas,
	type CanvasNode,
	type JsonCanvas,
} from "./jsonCanvas";

export interface CreateCanvasCardInput {
	canvas_path: string;
	card:
		| { kind: "file"; file: string; subpath?: string }
		| { kind: "text"; text: string };
	position?: { x: number; y: number };
	size?: { width: number; height: number };
	color?: string;
}

export interface CreateCanvasCardOutput {
	canvas_path: string;
	card_id: string;
	created: true;
}

export async function createCanvasCard(
	app: App,
	input: CreateCanvasCardInput,
): Promise<CreateCanvasCardOutput> {
	const canvasPath = normalizePath(input.canvas_path);
	if (!canvasPath.endsWith(".canvas")) {
		throw new Error("canvas_path must identify a .canvas file.");
	}
	const existing = app.vault.getAbstractFileByPath(canvasPath);
	if (existing && !(existing instanceof TFile)) {
		throw new Error(`Canvas path is not a file: ${canvasPath}`);
	}
	const canvas = existing
		? parseJsonCanvas(await app.vault.read(existing))
		: {};
	const node = buildNode(canvas, input);
	canvas.nodes = [...(canvas.nodes ?? []), node];
	canvas.edges ??= [];

	await ensureFolder(app, canvasPath);
	const contents = stringifyJsonCanvas(canvas);
	if (existing) {
		await app.vault.modify(existing, contents);
	} else {
		await app.vault.create(canvasPath, contents);
	}
	return {
		canvas_path: canvasPath,
		card_id: node.id,
		created: true,
	};
}

function buildNode(canvas: JsonCanvas, input: CreateCanvasCardInput): CanvasNode {
	const width = input.size?.width ?? 320;
	const height = input.size?.height ?? (input.card.kind === "file" ? 400 : 180);
	const position = input.position ?? nextPosition(canvas);
	const base = {
		id: uniqueNodeId(canvas),
		x: position.x,
		y: position.y,
		width,
		height,
		...(input.color ? { color: input.color } : {}),
	};
	return input.card.kind === "file"
		? {
				...base,
				type: "file",
				file: normalizePath(input.card.file),
				...(input.card.subpath ? { subpath: input.card.subpath } : {}),
			}
		: {
				...base,
				type: "text",
				text: input.card.text,
			};
}

function nextPosition(canvas: JsonCanvas): { x: number; y: number } {
	const nodes = canvas.nodes ?? [];
	if (nodes.length === 0) return { x: 0, y: 0 };
	return {
		x: Math.max(...nodes.map((node) => node.x + node.width)) + 40,
		y: Math.min(...nodes.map((node) => node.y)),
	};
}

function uniqueNodeId(canvas: JsonCanvas): string {
	const used = new Set((canvas.nodes ?? []).map((node) => node.id));
	let id: string;
	do {
		id = typeof crypto?.randomUUID === "function"
			? crypto.randomUUID().replace(/-/gu, "").slice(0, 16)
			: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
	} while (used.has(id));
	return id;
}

async function ensureFolder(app: App, canvasPath: string): Promise<void> {
	const index = canvasPath.lastIndexOf("/");
	if (index <= 0) return;
	const folder = canvasPath.slice(0, index);
	if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder);
}
