import type { App, TFile } from "obsidian";
import type { EmbeddableMarkdownEditor } from "./EmbeddableMarkdownEditor";

type Nullable<T> = T | null;

export interface BaseboardInlineMarkdownEditor {
	getValue(): string;
	setValue(value: string): void;
	focus(): void;
	blur(): void;
	destroy(): void;
}

export interface BaseboardInlineMarkdownEditorOptions {
	value: string;
	placeholder: string;
	file?: Nullable<TFile>;
	onChange: (value: string) => void;
	onSubmit: () => void;
	onEscape: () => void;
	onBlur: () => void;
}

export async function createBaseboardInlineMarkdownEditor(
	app: App,
	container: HTMLElement,
	options: BaseboardInlineMarkdownEditorOptions
): Promise<BaseboardInlineMarkdownEditor> {
	const { EmbeddableMarkdownEditor } = await import("./EmbeddableMarkdownEditor");
	const editor = new EmbeddableMarkdownEditor(app, container, {
		value: options.value,
		placeholder: options.placeholder,
		cls: "baseboard-canvas-file__markdown-editor-view",
		file: options.file ?? null,
		onChange: options.onChange,
		onSubmit: () => options.onSubmit(),
		onEscape: () => options.onEscape(),
		onBlur: () => options.onBlur(),
	});

	return new BaseboardMarkdownEditorHandle(editor);
}

class BaseboardMarkdownEditorHandle implements BaseboardInlineMarkdownEditor {
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
