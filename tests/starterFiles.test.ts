import { describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { TFile } from "obsidian";
import {
	STARTER_BASE_PATH,
	STARTER_FOLDER_PATH,
	STARTER_NOTE_PATH,
	createStarterFiles,
	ensureStarterFiles,
	getStarterFileSpecs,
} from "../src/bootstrap/starterFiles";
import { makeMockTFile } from "./obsidianMockUtils";

describe("starter files", () => {
	it("creates starter files, opens the start note, and configures property links", async () => {
		const { app, vault, openedFiles } = makeApp();

		await expect(createStarterFiles(app)).resolves.toBe("created");

		expect(openedFiles).toEqual([STARTER_NOTE_PATH]);
		expect(vault.createdFolders).toEqual([
			"Canvas Bases",
			"Canvas Bases/Canvases",
			"Canvas Bases/Views",
			"Canvas Bases/Demo",
		]);
		const startNote = vault.contents.get(STARTER_NOTE_PATH) ?? "";
		const defaultEmbed = "![[Canvas Bases/Views/Getting Started.base]]";
		const zonesEmbed = "![[Canvas Bases/Views/Getting Started.base#Assignment zones]]";
		expect(startNote).toContain("Canvas Bases will not recreate it automatically");
		expect(startNote).toContain(defaultEmbed);
		expect(startNote).toContain(zonesEmbed);
		expect(startNote).not.toContain(`${defaultEmbed}\n\n${zonesEmbed}`);
		expect(startNote.indexOf(defaultEmbed)).toBeLessThan(
			startNote.indexOf("## How note links work")
		);
		expect(startNote.indexOf("## How note links work")).toBeLessThan(
			startNote.indexOf(zonesEmbed)
		);
		expect(startNote.indexOf(zonesEmbed)).toBeLessThan(
			startNote.indexOf("Grouping still comes from the Base view")
		);
		expect(startNote).toContain("## 2. Try active zones and grouping");
		expect(startNote).toContain("switches the board to columns");
		expect(startNote).toContain("review: Needs review");
		expect(startNote).toContain("Canvas Bases writes a Markdown wiki link");
		expect(startNote).toContain("[[Canvas Bases/Demo/Arrange the board]]");
		expect(startNote).toContain("canvas-bases-demo");
		expect(startNote).not.toContain("What to try in this view");
		expect(startNote).not.toContain("Move and resize the cards");
		expect(startNote).not.toContain("not from TaskNotes");
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"canvasBasesEdgeMode: properties"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"canvasBasesEdgeProperties: related"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"canvasBasesTaskNotesRelationships: none"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			'name: "Assignment zones"'
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"canvasBasesZones:"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"origin: bases"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"action: set-property"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"property: note.status"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"id: review-needed"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"property: note.review"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"value: Needs review"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			'color: "#f59e0b"'
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"canvas-bases-manual-group-57hwgp:"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain("x: 444");
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain("y: 316");
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain("canvas-bases-text-1yj0j87:");
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"updateMode: replace"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"valueType: string"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"canvasBasesTextCards:"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"canvasBasesNodeWidth: 360"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"canvasBasesNodeHeight: 190"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"canvas-bases-file-1l8qzm:"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain("x: 560");
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain("y: 250");
		expect(getStarterFileSpecs().map((spec) => vault.contents.get(spec.path))).toSatisfy(
			(contents: Array<string | undefined>) =>
				contents.every((content) => content?.includes("related") ?? false)
		);
	});

	it("does not overwrite existing starter files when the command is rerun", async () => {
		const { app, vault } = makeApp();

		await createStarterFiles(app);
		await vault.modifyFile(STARTER_NOTE_PATH, "# Custom start note\n");

		await expect(createStarterFiles(app)).resolves.toBe("opened-existing");

		expect(vault.contents.get(STARTER_NOTE_PATH)).toBe("# Custom start note\n");
	});

	it("creates once on first install and records that the starter files were created", async () => {
		const { app } = makeApp();
		const settings = { starterFilesCreated: false };
		const saveSettings = vi.fn(async () => undefined);

		await expect(
			ensureStarterFiles({
				app,
				settings,
				shouldCreateStarterFiles: true,
				saveSettings,
			})
		).resolves.toBe("created");

		expect(settings.starterFilesCreated).toBe(true);
		expect(saveSettings).toHaveBeenCalledOnce();
	});

	it("does not create files for existing installs that have plugin data already", async () => {
		const { app, vault } = makeApp();
		const settings = { starterFilesCreated: false };
		const saveSettings = vi.fn(async () => undefined);

		await expect(
			ensureStarterFiles({
				app,
				settings,
				shouldCreateStarterFiles: false,
				saveSettings,
			})
		).resolves.toBe("not-first-install");

		expect(vault.contents.size).toBe(0);
		expect(settings.starterFilesCreated).toBe(false);
		expect(saveSettings).not.toHaveBeenCalled();
	});

	it("does not recreate files after the starter flag has been set", async () => {
		const { app, vault } = makeApp();
		const settings = { starterFilesCreated: true };

		await expect(
			ensureStarterFiles({
				app,
				settings,
				shouldCreateStarterFiles: true,
				saveSettings: async () => undefined,
			})
		).resolves.toBe("already-created");

		expect(vault.contents.size).toBe(0);
	});

	it("returns blocked when a starter path is occupied by a folder", async () => {
		const { app, vault } = makeApp();
		vault.addFolder(STARTER_FOLDER_PATH);
		vault.addFolder(STARTER_NOTE_PATH);

		await expect(createStarterFiles(app)).resolves.toBe("blocked");
		expect(vault.contents.size).toBe(0);
	});
});

function makeApp(): {
	app: App;
	vault: FakeVault;
	openedFiles: string[];
} {
	const vault = new FakeVault();
	const openedFiles: string[] = [];
	const app = {
		vault,
		workspace: {
			getLeaf: () => ({
				openFile: async (file: TFile) => {
					openedFiles.push(file.path);
				},
			}),
		},
	} as unknown as App;

	return { app, vault, openedFiles };
}

class FakeVault {
	readonly contents = new Map<string, string>();
	readonly createdFolders: string[] = [];
	private readonly entries = new Map<string, TFile | { path: string; type: "folder" }>();

	getAbstractFileByPath(path: string): TFile | { path: string; type: "folder" } | null {
		return this.entries.get(path) ?? null;
	}

	async create(path: string, contents: string): Promise<TFile> {
		const file = makeTFile(path);
		this.entries.set(path, file);
		this.contents.set(path, contents);
		return file;
	}

	async createFolder(path: string): Promise<void> {
		this.addFolder(path);
		this.createdFolders.push(path);
	}

	async modifyFile(path: string, contents: string): Promise<void> {
		if (!(this.entries.get(path) instanceof TFile)) {
			throw new Error(`Cannot modify missing file: ${path}`);
		}
		this.contents.set(path, contents);
	}

	addFolder(path: string): void {
		this.entries.set(path, { path, type: "folder" });
	}
}

function makeTFile(path: string): TFile {
	return makeMockTFile(path);
}
