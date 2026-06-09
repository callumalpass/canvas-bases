import { TFile, normalizePath } from "obsidian";
import type { App, Vault } from "obsidian";
import type { CanvasBasesSettings } from "../types";

export const STARTER_FOLDER_PATH = "Canvas Bases";
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
	settings: Pick<CanvasBasesSettings, "starterFilesCreated">;
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
	"Canvas Bases created this folder so the first board has notes to show.",
	"",
	"You can delete the whole `Canvas Bases/` folder when you are done. Canvas Bases will not recreate it automatically. To create it again later, run `Canvas Bases: Create starter files` from the command palette.",
	"",
	"## 1. See linked notes",
	"",
	"![[Canvas Bases/Views/Getting Started.base]]",
	"",
	"This first view is a live Canvas Bases layout backed by a Base. The Base selects the demo notes tagged `canvas-bases-demo`, groups them by `status`, and sorts them by status and file name.",
	"",
	"Canvas Bases draws the visible edges from Markdown links stored in the `related` frontmatter property. That keeps the board connected to normal note metadata instead of a separate diagram-only model.",
	"",
	"## How note links work",
	"",
	"When you drag a link from one card to another and choose `related`, Canvas Bases writes a Markdown wiki link to the source note's frontmatter. For example:",
	"",
	"```yaml",
	"related:",
	"  - \"[[Canvas Bases/Demo/Arrange the board]]\"",
	"```",
	"",
	"If the property already has a value, Canvas Bases appends the new link instead of replacing the existing links.",
	"",
	"## 2. Try active zones and grouping",
	"",
	"![[Canvas Bases/Views/Getting Started.base#Assignment zones]]",
	"",
	"The `Assignment zones` view uses the same Base results, but switches the board to columns and turns each `status` group into an active assignment zone. Dragging a card into another status group writes that status back to the note frontmatter.",
	"",
	"The orange `Needs review` frame is a custom active zone, not a Bases group. Dropping a card there writes a separate `review: Needs review` property, so the card can keep its current status while gaining a review marker.",
	"",
	"Grouping still comes from the Base view. Change the Base's `groupBy` property to change which automatic frames Canvas Bases renders; Canvas Bases stores board geometry, card colors, zones, text cards, and linked Canvas settings in the view config.",
	"",
	"## Files in this folder",
	"",
	"- `Views/Getting Started.base` selects notes tagged `canvas-bases-demo` and opens them with the Canvas Bases layout.",
	"- `Demo/` contains the sample notes and their `related` links.",
	"- `Canvases/` is where the linked Canvas snapshot is written when you create it.",
	"",
].join("\n");

const STARTER_BASE_CONTENT = [
	'filters:',
	'  and:',
	'    - file.hasTag("canvas-bases-demo")',
	'views:',
	'  - type: canvas-bases',
	'    name: "Getting Started"',
	'    order:',
	'      - file.name',
	'      - status',
	'      - review',
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
	'    canvasBasesLayout: grid',
	'    canvasBasesEdgeMode: properties',
	'    canvasBasesEdgeProperties: related',
	'    canvasBasesShowBodyEditor: true',
	'    canvasBasesTaskNotesMode: off',
	'    canvasBasesTaskNotesShowBadges: false',
	'    canvasBasesTaskNotesShowActions: false',
	'    canvasBasesTaskNotesRelationships: none',
	`    canvasBasesLinkedCanvasPath: "${STARTER_CANVAS_PATH}"`,
	'    canvasBasesPreservePositions: true',
	'    canvasBasesRemoveMissingNodes: true',
	'    canvasBasesNodeWidth: 360',
	'    canvasBasesNodeHeight: 190',
	'    canvasBasesNodePositions:',
	'      canvas-bases-file-3decwn:',
	'        x: 0',
	'        y: 0',
	'        width: 360',
	'        height: 190',
	'      canvas-bases-file-1l8qzm:',
	'        x: 560',
	'        y: 250',
	'        width: 360',
	'        height: 190',
	'      canvas-bases-file-c84cwu:',
	'        x: 0',
	'        y: 500',
	'        width: 360',
	'        height: 190',
	'  - type: canvas-bases',
	'    name: "Assignment zones"',
	'    order:',
	'      - file.name',
	'      - status',
	'      - review',
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
	'    canvasBasesLayout: columns',
	'    canvasBasesEdgeMode: properties',
	'    canvasBasesEdgeProperties: related',
	'    canvasBasesShowBodyEditor: true',
	'    canvasBasesTaskNotesMode: off',
	'    canvasBasesTaskNotesShowBadges: false',
	'    canvasBasesTaskNotesShowActions: false',
	'    canvasBasesTaskNotesRelationships: none',
	'    canvasBasesPreservePositions: true',
	'    canvasBasesRemoveMissingNodes: true',
	'    canvasBasesNodeWidth: 360',
	'    canvasBasesNodeHeight: 190',
	'    canvasBasesZones:',
	'      - origin: bases',
	'        action: set-property',
	'        property: note.status',
	'        value: 1. Choose',
	'        updateMode: replace',
	'        valueType: string',
	'      - origin: bases',
	'        action: set-property',
	'        property: note.status',
	'        value: 2. Arrange',
	'        updateMode: replace',
	'        valueType: string',
	'      - origin: bases',
	'        action: set-property',
	'        property: note.status',
	'        value: 3. Snapshot',
	'        updateMode: replace',
	'        valueType: string',
	'      - origin: custom',
	'        id: review-needed',
	'        label: Needs review',
	'        action: set-property',
	'        property: note.review',
	'        value: Needs review',
	'        updateMode: replace',
	'        valueType: string',
	'        color: "#f59e0b"',
	'    canvasBasesNodePositions:',
	'      canvas-bases-manual-group-57hwgp:',
	'        x: 444',
	'        y: 316',
	'        width: 360',
	'        height: 250',
	'      canvas-bases-text-1yj0j87:',
	'        x: 0',
	'        y: 316',
	'        width: 360',
	'        height: 190',
	'    canvasBasesTextCards:',
	'      - id: active-groups-prompt',
	'        text: "Drag between status zones to update status, or into Needs review to add a review property."',
	'',
].join("\n");

const DEMO_NOTE_CONTENTS: Record<string, string> = {
	[CHOOSE_NOTES_PATH]: [
		"---",
		"tags:",
		"  - canvas-bases-demo",
		"status: 1. Choose",
		"area: Setup",
		"related:",
		`  - "[[${ARRANGE_BOARD_PATH.replace(/\.md$/u, "")}]]"`,
		"---",
		"",
		"# Choose notes with a Base",
		"",
		"The starter Base selects notes tagged `canvas-bases-demo`. Add or remove that tag on a note to change what appears on the board.",
		"",
		"The `related` frontmatter property stores a Markdown link to the next note.",
		"",
	].join("\n"),
	[ARRANGE_BOARD_PATH]: [
		"---",
		"tags:",
		"  - canvas-bases-demo",
		"status: 2. Arrange",
		"area: Board",
		"related:",
		`  - "[[${CREATE_CANVAS_PATH.replace(/\.md$/u, "")}]]"`,
		"---",
		"",
		"# Arrange the board",
		"",
		"Drag cards, resize them, zoom, pan, and set card colors. The Canvas Bases layout stores those positions and colors in the Base view config.",
		"",
		"The visible edge from this card is read from the `related` frontmatter property.",
		"",
	].join("\n"),
	[CREATE_CANVAS_PATH]: [
		"---",
		"tags:",
		"  - canvas-bases-demo",
		"status: 3. Snapshot",
		"area: Canvas",
		"related:",
		`  - "[[${CHOOSE_NOTES_PATH.replace(/\.md$/u, "")}]]"`,
		"---",
		"",
		"# Create a Canvas snapshot",
		"",
		"Use the Canvas Bases toolbar to write the current board to a JSON Canvas file. The starter Base is linked to `Canvas Bases/Canvases/Getting Started.canvas`.",
	"",
		"Updating the Canvas preserves Canvas Bases-owned node positions and keeps manual Canvas nodes that are not owned by Canvas Bases.",
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
		warn?.("Canvas Bases could not open the starter note.", error);
	}
}
