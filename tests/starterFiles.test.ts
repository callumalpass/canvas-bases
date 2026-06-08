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

describe("starter files", () => {
	it("creates starter files, opens the start note, and configures property links", async () => {
		const { app, vault, openedFiles } = makeApp();

		await expect(createStarterFiles(app)).resolves.toBe("created");

		expect(openedFiles).toEqual([STARTER_NOTE_PATH]);
		expect(vault.createdFolders).toEqual([
			"Baseboard",
			"Baseboard/Canvases",
			"Baseboard/Views",
			"Baseboard/Demo",
		]);
		expect(vault.contents.get(STARTER_NOTE_PATH)).toContain(
			"Baseboard will not recreate it automatically"
		);
		expect(vault.contents.get(STARTER_NOTE_PATH)).toContain(
			"![[Baseboard/Views/Getting Started.base]]"
		);
		expect(vault.contents.get(STARTER_NOTE_PATH)).toContain(
			"## How note links work"
		);
		expect(vault.contents.get(STARTER_NOTE_PATH)).toContain(
			"Baseboard writes a Markdown wiki link"
		);
		expect(vault.contents.get(STARTER_NOTE_PATH)).toContain(
			"[[Baseboard/Demo/Arrange the board]]"
		);
		expect(vault.contents.get(STARTER_NOTE_PATH)).not.toContain(
			"not from TaskNotes"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"baseboardEdgeMode: properties"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"baseboardEdgeProperties: related"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"baseboardTaskNotesRelationships: none"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"baseboardNodeWidth: 360"
		);
		expect(vault.contents.get(STARTER_BASE_PATH)).toContain(
			"baseboardNodeHeight: 190"
		);
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
	const file = Object.create(TFile.prototype) as TFile;
	file.path = path;
	file.name = path.split("/").pop() ?? path;
	file.basename = file.name.replace(/\.[^.]+$/u, "");
	file.extension = file.name.includes(".") ? file.name.split(".").pop() : "";
	return file;
}
