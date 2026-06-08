import { TFile, normalizePath } from "obsidian";
import type { App, Vault } from "obsidian";
import type { BaseboardSettings } from "../types";

export const STARTER_FOLDER_PATH = "Baseboard";
export const STARTER_NOTE_PATH = `${STARTER_FOLDER_PATH}/Start Here.md`;
export const STARTER_BASE_PATH = `${STARTER_FOLDER_PATH}/Views/Getting Started.base`;
export const STARTER_CANVAS_PATH = `${STARTER_FOLDER_PATH}/Canvases/Getting Started.canvas`;

const DEMO_NOTE_FOLDER_PATH = `${STARTER_FOLDER_PATH}/Demo`;
const CHOOSE_NOTES_PATH = `${DEMO_NOTE_FOLDER_PATH}/Choose notes with a Base.md`;
const ARRANGE_BOARD_PATH = `${DEMO_NOTE_FOLDER_PATH}/Arrange the board.md`;
const CREATE_CANVAS_PATH = `${DEMO_NOTE_FOLDER_PATH}/Create a Canvas snapshot.md`;

export type StarterFilesResult =
	| "created"
	| "opened-existing"
	| "already-created"
	| "not-first-install"
	| "blocked";

export interface StarterFilesHost {
	app: App;
	settings: Pick<BaseboardSettings, "starterFilesCreated">;
	shouldCreateStarterFiles: boolean;
	saveSettings(): Promise<void>;
	warn?(this: void, message: string, error?: unknown): void;
}

interface CreateStarterFilesOptions {
	openStartHere?: boolean;
	warn?(this: void, message: string, error?: unknown): void;
}

interface StarterFileSpec {
	path: string;
	contents: string;
}

export const STARTER_NOTE_CONTENT = [
	"# Start Here",
	"",
	"Baseboard created this folder so the first board has notes to show.",
	"",
	"You can delete the whole `Baseboard/` folder when you are done. Baseboard will not recreate it automatically. To create it again later, run `Baseboard: Create starter files` from the command palette.",
	"",
	"## Open the board",
	"",
	"![[Baseboard/Views/Getting Started.base]]",
	"",
	"## What to try",
	"",
	"1. Move and resize the cards in the embedded Baseboard view.",
	"2. Follow the visible links between the demo notes. This starter board draws them from the `related` frontmatter property.",
	"3. Use the board toolbar to create or update the linked Canvas at `Baseboard/Canvases/Getting Started.canvas`.",
	"4. Edit the `related` property on a demo note and watch the relationship edge change.",
	"",
	"## How note links work",
	"",
	"Baseboard can draw edges from Markdown links stored in frontmatter properties. This starter board is configured to use the `related` property.",
	"",
	"When you drag a link from one card to another and choose `related`, Baseboard writes a Markdown wiki link to the source note's frontmatter. For example:",
	"",
	"```yaml",
	"related:",
	"  - \"[[Baseboard/Demo/Arrange the board]]\"",
	"```",
	"",
	"If the property already has a value, Baseboard appends the new link instead of replacing the existing links.",
	"",
	"## Files in this folder",
	"",
	"- `Views/Getting Started.base` selects notes tagged `baseboard-demo` and opens them with the Baseboard layout.",
	"- `Demo/` contains the sample notes and their `related` links.",
	"- `Canvases/` is where the linked Canvas snapshot is written when you create it.",
	"",
].join("\n");

const STARTER_BASE_CONTENT = [
	'filters:',
	'  and:',
	'    - file.hasTag("baseboard-demo")',
	'views:',
	'  - type: baseboard',
	'    name: "Getting Started"',
	'    order:',
	'      - file.name',
	'      - status',
	'      - area',
	'      - related',
	'    sort:',
	'      - column: status',
	'        direction: ASC',
	'      - column: file.name',
	'        direction: ASC',
	'    groupBy:',
	'      property: status',
	'      direction: ASC',
	'    baseboardLayout: grid',
	'    baseboardEdgeMode: properties',
	'    baseboardEdgeProperties: related',
	'    baseboardShowBodyEditor: true',
	'    baseboardTaskNotesMode: off',
	'    baseboardTaskNotesShowBadges: false',
	'    baseboardTaskNotesShowActions: false',
	'    baseboardTaskNotesRelationships: none',
	`    baseboardCanvasPath: "${STARTER_CANVAS_PATH}"`,
	'    baseboardPreservePositions: true',
	'    baseboardRemoveMissingNodes: true',
	'    baseboardNodeWidth: 360',
	'    baseboardNodeHeight: 190',
	'',
].join("\n");

const DEMO_NOTE_CONTENTS: Record<string, string> = {
	[CHOOSE_NOTES_PATH]: [
		"---",
		"tags:",
		"  - baseboard-demo",
		"status: 1. Choose",
		"area: Setup",
		"related:",
		`  - "[[${ARRANGE_BOARD_PATH.replace(/\.md$/u, "")}]]"`,
		"---",
		"",
		"# Choose notes with a Base",
		"",
		"The starter Base selects notes tagged `baseboard-demo`. Add or remove that tag on a note to change what appears on the board.",
		"",
		"The `related` frontmatter property stores a Markdown link to the next note.",
		"",
	].join("\n"),
	[ARRANGE_BOARD_PATH]: [
		"---",
		"tags:",
		"  - baseboard-demo",
		"status: 2. Arrange",
		"area: Board",
		"related:",
		`  - "[[${CREATE_CANVAS_PATH.replace(/\.md$/u, "")}]]"`,
		"---",
		"",
		"# Arrange the board",
		"",
		"Drag cards, resize them, zoom, and pan. The Baseboard layout stores those positions in the Base view config.",
		"",
		"The visible edge from this card is read from the `related` frontmatter property.",
		"",
	].join("\n"),
	[CREATE_CANVAS_PATH]: [
		"---",
		"tags:",
		"  - baseboard-demo",
		"status: 3. Snapshot",
		"area: Canvas",
		"related:",
		`  - "[[${CHOOSE_NOTES_PATH.replace(/\.md$/u, "")}]]"`,
		"---",
		"",
		"# Create a Canvas snapshot",
		"",
		"Use the Baseboard toolbar to write the current board to a JSON Canvas file. The starter Base is linked to `Baseboard/Canvases/Getting Started.canvas`.",
		"",
		"Updating the Canvas preserves Baseboard-owned node positions and keeps manual Canvas nodes that are not owned by Baseboard.",
		"",
	].join("\n"),
};

export async function ensureStarterFiles(host: StarterFilesHost): Promise<StarterFilesResult> {
	const warn = host.warn;
	if (host.settings.starterFilesCreated) {
		return "already-created";
	}

	if (!host.shouldCreateStarterFiles) {
		return "not-first-install";
	}

	const result = await createStarterFiles(host.app, {
		openStartHere: true,
		warn: warn ? (message, error) => warn(message, error) : undefined,
	});
	if (result === "blocked") {
		return result;
	}

	host.settings.starterFilesCreated = true;
	await host.saveSettings();
	return result;
}

export async function createStarterFiles(
	app: App,
	options: CreateStarterFilesOptions = {}
): Promise<StarterFilesResult> {
	const warn = options.warn;
	let createdAny = false;

	if (!(await ensureFolderHierarchy(app.vault, getParentPath(STARTER_CANVAS_PATH)))) {
		return "blocked";
	}

	for (const spec of getStarterFileSpecs()) {
		const result = await createVaultFileIfMissing(app.vault, spec);
		if (result === "blocked") {
			return "blocked";
		}
		createdAny ||= result === "created";
	}

	const startHereFile = app.vault.getAbstractFileByPath(STARTER_NOTE_PATH);
	if (!(startHereFile instanceof TFile)) {
		return "blocked";
	}

	if (options.openStartHere !== false) {
		await openStartHere(
			app,
			startHereFile,
			warn ? (message, error) => warn(message, error) : undefined
		);
	}

	return createdAny ? "created" : "opened-existing";
}

export function getStarterFileSpecs(): StarterFileSpec[] {
	return [
		{ path: STARTER_NOTE_PATH, contents: STARTER_NOTE_CONTENT },
		{ path: STARTER_BASE_PATH, contents: STARTER_BASE_CONTENT },
		...Object.entries(DEMO_NOTE_CONTENTS).map(([path, contents]) => ({
			path,
			contents,
		})),
	];
}

async function createVaultFileIfMissing(
	vault: Vault,
	spec: StarterFileSpec
): Promise<"created" | "exists" | "blocked"> {
	const path = normalizePath(spec.path);
	const existing = vault.getAbstractFileByPath(path);
	if (existing) {
		return existing instanceof TFile ? "exists" : "blocked";
	}

	if (!(await ensureFolderHierarchy(vault, getParentPath(path)))) {
		return "blocked";
	}

	await vault.create(path, spec.contents);
	return "created";
}

async function ensureFolderHierarchy(vault: Vault, folderPath: string): Promise<boolean> {
	const normalizedPath = normalizePath(folderPath);
	if (!normalizedPath || normalizedPath === ".") return true;

	let currentPath = "";
	for (const segment of normalizedPath.split("/").filter(Boolean)) {
		currentPath = currentPath ? `${currentPath}/${segment}` : segment;
		const existing = vault.getAbstractFileByPath(currentPath);
		if (existing) {
			if (existing instanceof TFile) {
				return false;
			}
			continue;
		}

		await vault.createFolder(currentPath);
	}

	return true;
}

function getParentPath(path: string): string {
	const index = path.lastIndexOf("/");
	return index > 0 ? path.slice(0, index) : "";
}

async function openStartHere(
	app: App,
	file: TFile,
	warn?: (message: string, error?: unknown) => void
): Promise<void> {
	try {
		await app.workspace.getLeaf("tab").openFile(file);
	} catch (error) {
		warn?.("Baseboard could not open the starter note.", error);
	}
}
