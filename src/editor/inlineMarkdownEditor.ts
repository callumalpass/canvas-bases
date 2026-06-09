import type { App, TFile } from "obsidian";
import type { EmbeddableMarkdownEditor } from "./EmbeddableMarkdownEditor";

type Nullable<T> = T | null;

export interface CanvasBasesInlineMarkdownEditor {
	getValue(): string;
	setValue(value: string): void;
	focus(): void;
	blur(): void;
	destroy(): void;
}

export interface CanvasBasesInlineMarkdownEditorOptions {
	value: string;
	placeholder: string;
	file?: Nullable<TFile>;
	onChange: (value: string) => void;
	onSubmit: () => void;
	onEscape: () => void;
	onBlur: () => void;
}

export async function createCanvasBasesInlineMarkdownEditor(
	app: App,
	container: HTMLElement,
	options: CanvasBasesInlineMarkdownEditorOptions
): Promise<CanvasBasesInlineMarkdownEditor> {
	const { EmbeddableMarkdownEditor } = await import("./EmbeddableMarkdownEditor");
	const editor = new EmbeddableMarkdownEditor(app, container, {
		value: options.value,
		placeholder: options.placeholder,
		cls: "canvas-bases-canvas-file__markdown-editor-view",
		file: options.file ?? null,
		onChange: options.onChange,
		onSubmit: () => options.onSubmit(),
		onEscape: () => options.onEscape(),
		onBlur: () => options.onBlur(),
	});

	return new CanvasBasesMarkdownEditorHandle(editor);
}

class CanvasBasesMarkdownEditorHandle implements CanvasBasesInlineMarkdownEditor {
	constructor(private readonly editor: EmbeddableMarkdownEditor) {}

	getValue(): string {
		return this.editor.value;
	}

	setValue(value: string): void {
		this.editor.setValue(value);
	}

	focus(): void {
		this.editor.focus();
	}

	blur(): void {
		this.editor.blur();
	}

	destroy(): void {
		this.editor.destroy();
	}
}
