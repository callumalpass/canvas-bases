import type { TFile } from "obsidian";
import { App as MockApp } from "obsidian-test-mocks/obsidian";

export function makeMockTFile(path: string): TFile {
	const app = MockApp.createConfigured__({
		files: {
			[path]: "",
		},
	});
	const file = app.vault.getFileByPath(path);
	if (!file) throw new Error(`Could not create mock TFile: ${path}`);

	return file.asOriginalType2__();
}
