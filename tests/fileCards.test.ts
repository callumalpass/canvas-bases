import { describe, expect, it } from "vitest";
import {
	getCanvasBasesFileExtension,
	getCanvasBasesFileIcon,
	getCanvasBasesFileKind,
	isCanvasBasesMarkdownFile,
} from "../src/bases/fileCards";
import { makeMockTFile } from "./obsidianMockUtils";

describe("file card classification", () => {
	it("classifies markdown, image, PDF, and generic attachments", () => {
		expect(getCanvasBasesFileKind("Notes/Alpha.md")).toBe("markdown");
		expect(getCanvasBasesFileKind("Images/Chart.PNG")).toBe("image");
		expect(getCanvasBasesFileKind("Images/Diagram.svg")).toBe("image");
		expect(getCanvasBasesFileKind("Documents/Spec.PDF")).toBe("pdf");
		expect(getCanvasBasesFileKind("Archives/export.zip")).toBe("attachment");
		expect(getCanvasBasesFileKind("Attachments/no-extension")).toBe("attachment");
	});

	it("uses TFile metadata when a file is available", () => {
		const file = makeMockTFile("Attachments/photo.png");

		expect(getCanvasBasesFileKind("Attachments/photo.bin", file)).toBe("image");
		expect(getCanvasBasesFileExtension("Attachments/photo.bin", file)).toBe("png");
	});

	it("only treats markdown files as editor-backed cards", () => {
		expect(isCanvasBasesMarkdownFile("Notes/Alpha.MD")).toBe(true);
		expect(isCanvasBasesMarkdownFile("Images/Chart.png")).toBe(false);
		expect(isCanvasBasesMarkdownFile("Documents/Spec.pdf")).toBe(false);
	});

	it("chooses file-kind icons", () => {
		expect(getCanvasBasesFileIcon("markdown")).toBe("lucide-file-text");
		expect(getCanvasBasesFileIcon("image")).toBe("lucide-image");
		expect(getCanvasBasesFileIcon("pdf")).toBe("lucide-file-text");
		expect(getCanvasBasesFileIcon("attachment")).toBe("lucide-file");
	});
});
