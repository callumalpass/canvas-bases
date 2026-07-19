import type { TFile } from "obsidian";

export type CanvasBasesFileKind = "markdown" | "image" | "pdf" | "attachment";

const IMAGE_FILE_EXTENSIONS = new Set([
	"avif",
	"bmp",
	"gif",
	"jpeg",
	"jpg",
	"png",
	"svg",
	"webp",
]);

export function getCanvasBasesFileKind(
	path: string,
	file?: TFile | null
): CanvasBasesFileKind {
	const extension = getCanvasBasesFileExtension(path, file);
	if (extension === "md") return "markdown";
	if (IMAGE_FILE_EXTENSIONS.has(extension)) return "image";
	if (extension === "pdf") return "pdf";

	return "attachment";
}

export function getCanvasBasesFileExtension(path: string, file?: TFile | null): string {
	return (file?.extension || getPathExtension(path)).toLowerCase();
}

export function isCanvasBasesMarkdownFile(path: string, file?: TFile | null): boolean {
	return getCanvasBasesFileKind(path, file) === "markdown";
}

export function getCanvasBasesFileIcon(kind: CanvasBasesFileKind): string {
	switch (kind) {
		case "image":
			return "lucide-image";
		case "pdf":
			return "lucide-file-text";
		case "markdown":
			return "lucide-file-text";
		case "attachment":
			return "lucide-file";
	}
}

function getPathExtension(path: string): string {
	const filename = path.split("/").pop() ?? path;
	const dotIndex = filename.lastIndexOf(".");
	if (dotIndex <= 0 || dotIndex === filename.length - 1) return "";

	return filename.slice(dotIndex + 1);
}
