import {
	App,
	Constructor,
	Scope,
	TFile,
	type Editor,
	type EditorPosition,
	type EditorSelection,
	type EditorSelectionOrCaret,
	type EditorTransaction,
} from "obsidian";
import { EditorSelection as CMEditorSelection, Extension, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder, ViewUpdate, tooltips } from "@codemirror/view";

declare const app: App;

type Nullable<T> = T | null;
type OneOf<T, U> = T | U;

interface ScrollableMarkdownEditor {
	app: App;
	containerEl: HTMLElement;
	editor: MarkdownEditorInternal;
	editorEl: HTMLElement;
	activeCM: unknown;
	owner: MarkdownEditorOwner;
	_loaded: boolean;
	set(value: string): void;
	onUpdate(update: ViewUpdate, changed: boolean): void;
	buildLocalExtensions(): Extension[];
	destroy(): void;
	unload(): void;
}

interface WidgetEditorView {
	editable: boolean;
	editMode: unknown;
	showEditor(): void;
	unload(): void;
}

type MarkdownEditorPrototype = {
	constructor?: unknown;
};

type MarkdownEditorInternal = {
	cm: {
		cm?: unknown;
		contentDOM: HTMLElement;
		focus(): void;
		scrollDOM: HTMLElement;
		dispatch(spec: unknown): void;
		state: {
			doc: {
				length: number;
				lines: number;
				line(lineNumber: number): { from: number; to: number; text: string };
				lineAt(offset: number): { from: number; number: number };
				sliceString(from: number, to: number): string;
				toString(): string;
			};
			selection: {
				main: {
					anchor: number;
					empty: boolean;
					from: number;
					head: number;
					to: number;
				};
				ranges: Array<{
					anchor: number;
					empty: boolean;
					from: number;
					head: number;
					to: number;
				}>;
			};
			changeByRange(
				callback: (range: { from: number; to: number }) => {
					changes: { from: number; to: number; insert: string };
					range: unknown;
				}
			): unknown;
		};
	};
};

type MarkdownEditorOwner = {
	editMode: unknown;
	editor: MarkdownEditorInternal | null;
};

type ActiveMarkdownEditorOwner = {
	editMode: unknown;
	editor: Editor;
	file: Nullable<TFile>;
	getMode(): "source";
};

type WorkspaceWithActiveEditor = {
	activeEditor: ActiveMarkdownEditorOwner | null;
};

type VaultWithConfig = {
	getConfig(key: string): unknown;
};

type WindowWithCodeMirrorAdapter = Window & {
	CodeMirrorAdapter?: {
		Vim?: {
			handleKey(cm: unknown, key: string, origin: string): void;
		};
	};
};

function getEditorDocument(): Document {
	if (typeof activeDocument !== "undefined") return activeDocument;
	if (typeof activeWindow !== "undefined") return activeWindow.document;
	return window.document;
}

function getPrototypeFile(app: App): TFile | null {
	const activeFile = app.workspace.getActiveFile();
	if (activeFile instanceof TFile) return activeFile;
	return app.vault.getMarkdownFiles()[0] ?? null;
}

function resolveEditorPrototype(app: App): Constructor<ScrollableMarkdownEditor> {
	const prototypeFile = getPrototypeFile(app);
	if (!(prototypeFile instanceof TFile)) {
		throw new Error("Cannot resolve markdown editor prototype without a markdown file.");
	}

	// @ts-expect-error - Canvas Bases intentionally uses Obsidian's internal markdown embed editor.
	const widgetEditorView = app.embedRegistry.embedByExtension.md(
		{ app, containerEl: getEditorDocument().createElement("div") },
		prototypeFile,
		""
	) as WidgetEditorView;

	widgetEditorView.editable = true;
	widgetEditorView.showEditor();

	const editMode = widgetEditorView.editMode;
	if (!isPrototypeSource(editMode)) {
		widgetEditorView.unload();
		throw new Error("Markdown editor edit mode was not initialized.");
	}

	const editModePrototype = Object.getPrototypeOf(editMode) as object | null;
	const markdownEditorPrototype = editModePrototype
		? (Object.getPrototypeOf(editModePrototype) as MarkdownEditorPrototype | null)
		: null;
	const MarkdownEditor = markdownEditorPrototype?.constructor;
	widgetEditorView.unload();
	if (typeof MarkdownEditor !== "function") {
		throw new Error("Markdown editor constructor was not initialized.");
	}

	return MarkdownEditor as Constructor<ScrollableMarkdownEditor>;
}

function getEditorBase(): Constructor<ScrollableMarkdownEditor> {
	if (typeof app === "undefined") {
		return class MockScrollableMarkdownEditor {
			app: App;
			containerEl: HTMLElement;
			editor: MarkdownEditorInternal;
			editorEl: HTMLElement;
			activeCM: unknown;
			owner: MarkdownEditorOwner = { editMode: null, editor: null };
			_loaded = false;

			constructor(appInstance: App, container: HTMLElement) {
				this.app = appInstance;
				this.containerEl = container;
				this.editorEl = getEditorDocument().createElement("div");
				container.appendChild(this.editorEl);
				const view = new EditorView({ parent: this.editorEl });
				this.editor = { cm: view as unknown as MarkdownEditorInternal["cm"] };
			}

			set(value: string): void {
				const view = this.editor.cm as unknown as EditorView;
				view.dispatch({
					changes: {
						from: 0,
						to: view.state.doc.length,
						insert: value,
					},
				});
			}

			onUpdate(_update: ViewUpdate, _changed: boolean): void {}

			buildLocalExtensions(): Extension[] {
				return [];
			}

			destroy(): void {
				const view = this.editor.cm as unknown as EditorView;
				view.destroy();
			}

			unload(): void {}
		};
	}

	return resolveEditorPrototype(app);
}

export interface MarkdownEditorProps {
	value?: string;
	cls?: string;
	placeholder?: string;
	onSubmit?: (editor: EmbeddableMarkdownEditor, shift: boolean) => void;
	onEscape?: (editor: EmbeddableMarkdownEditor) => void;
	onBlur?: (editor: EmbeddableMarkdownEditor) => void;
	onChange?: (value: string, update: ViewUpdate) => void;
	extensions?: Extension[];
	enterVimInsertMode?: boolean;
	file?: Nullable<TFile>;
}

type ResolvedMarkdownEditorProps = Required<Omit<MarkdownEditorProps, "file">> &
	Pick<MarkdownEditorProps, "file">;

const defaultProperties: ResolvedMarkdownEditorProps = {
	value: "",
	cls: "",
	placeholder: "",
	onSubmit: () => {},
	onEscape: () => {},
	onBlur: () => {},
	onChange: () => {},
	extensions: [],
	enterVimInsertMode: false,
	file: undefined,
};

function getMarkdownEditorTooltipParent(container: HTMLElement): HTMLElement {
	return container.ownerDocument?.body ?? getEditorDocument().body;
}

function isPrototypeSource(value: unknown): value is object {
	return (typeof value === "object" && value !== null) || typeof value === "function";
}

class CodeMirrorEditorAdapter {
	constructor(private readonly view: EditorView) {}

	getDoc(): CodeMirrorEditorAdapter {
		return this;
	}

	getValue(): string {
		return this.view.state.doc.toString();
	}

	setValue(content: string): void {
		this.view.dispatch({
			changes: {
				from: 0,
				to: this.view.state.doc.length,
				insert: content,
			},
		});
	}

	getLine(line: number): string {
		return this.view.state.doc.line(line + 1).text;
	}

	lineCount(): number {
		return this.view.state.doc.lines;
	}

	lastLine(): number {
		return this.lineCount() - 1;
	}

	getSelection(): string {
		const range = this.view.state.selection.main;
		return this.view.state.doc.sliceString(range.from, range.to);
	}

	somethingSelected(): boolean {
		return !this.view.state.selection.main.empty;
	}

	replaceSelection(replacement: string): void {
		const transaction = this.view.state.changeByRange((range) => ({
			changes: {
				from: range.from,
				to: range.to,
				insert: replacement,
			},
			range: CMEditorSelection.cursor(range.from + replacement.length),
		}));

		this.view.dispatch(transaction);
	}

	replaceRange(replacement: string, from: EditorPosition, to?: EditorPosition): void {
		this.view.dispatch({
			changes: {
				from: this.posToOffset(from),
				to: this.posToOffset(to ?? from),
				insert: replacement,
			},
		});
	}

	getCursor(side: "from" | "to" | "head" | "anchor" = "head"): EditorPosition {
		const range = this.view.state.selection.main;
		switch (side) {
			case "from":
				return this.offsetToPos(range.from);
			case "to":
				return this.offsetToPos(range.to);
			case "anchor":
				return this.offsetToPos(range.anchor);
			case "head":
			default:
				return this.offsetToPos(range.head);
		}
	}

	listSelections(): EditorSelection[] {
		return this.view.state.selection.ranges.map((range) => ({
			anchor: this.offsetToPos(range.anchor),
			head: this.offsetToPos(range.head),
		}));
	}

	setCursor(pos: OneOf<EditorPosition, number>, ch?: number): void {
		if (typeof pos === "number") {
			this.setSelection({ line: pos, ch: ch ?? 0 });
			return;
		}

		this.setSelection(pos);
	}

	setSelection(anchor: EditorPosition, head?: EditorPosition): void {
		this.view.dispatch({
			selection: CMEditorSelection.range(
				this.posToOffset(anchor),
				this.posToOffset(head ?? anchor)
			),
		});
	}

	setSelections(ranges: EditorSelectionOrCaret[], main = 0): void {
		if (ranges.length === 0) return;

		this.view.dispatch({
			selection: CMEditorSelection.create(
				ranges.map((range) =>
					CMEditorSelection.range(
						this.posToOffset(range.anchor),
						this.posToOffset(range.head ?? range.anchor)
					)
				),
				main
			),
		});
	}

	focus(): void {
		this.view.focus();
	}

	blur(): void {
		this.view.contentDOM.blur();
	}

	hasFocus(): boolean {
		return this.view.hasFocus;
	}

	transaction(tx: EditorTransaction): void {
		if (tx.replaceSelection !== undefined) {
			this.replaceSelection(tx.replaceSelection);
			return;
		}

		const changes = tx.changes?.map((change) => ({
			from: this.posToOffset(change.from),
			to: this.posToOffset(change.to ?? change.from),
			insert: change.text,
		}));

		const selections = tx.selections ?? (tx.selection ? [tx.selection] : undefined);
		this.view.dispatch({
			...(changes ? { changes } : {}),
			...(selections && selections.length > 0
				? {
						selection: CMEditorSelection.create(
							selections.map((selection) =>
								CMEditorSelection.range(
									this.posToOffset(selection.from),
									this.posToOffset(selection.to ?? selection.from)
								)
							)
						),
					}
				: {}),
		});
	}

	private posToOffset(pos: EditorPosition): number {
		const lineNumber = Math.max(1, Math.min(pos.line + 1, this.view.state.doc.lines));
		const line = this.view.state.doc.line(lineNumber);
		return Math.max(line.from, Math.min(line.from + pos.ch, line.to));
	}

	private offsetToPos(offset: number): EditorPosition {
		const clampedOffset = Math.max(0, Math.min(offset, this.view.state.doc.length));
		const line = this.view.state.doc.lineAt(clampedOffset);
		return {
			line: line.number - 1,
			ch: clampedOffset - line.from,
		};
	}
}

export class EmbeddableMarkdownEditor extends getEditorBase() {
	options: ResolvedMarkdownEditorProps;
	scope: Scope;
	private hasEnteredVimInsertMode = false;
	private activeEditorOwner: ActiveMarkdownEditorOwner;

	constructor(appInstance: App, container: HTMLElement, options: Partial<MarkdownEditorProps> = {}) {
		super(appInstance, container, {
			app: appInstance,
			onMarkdownScroll: () => {},
			getMode: () => "source",
		});

		this.options = { ...defaultProperties, ...options };
		this.scope = new Scope(this.app.scope);
		this.scope.register(["Mod"], "Enter", () => true);
		this.scope.register(["Mod", "Shift"], "Enter", () => true);

		this.owner.editMode = this;
		this.owner.editor = this.editor;
		this.activeEditorOwner = {
			editMode: this,
			editor: new CodeMirrorEditorAdapter(this.editor.cm as unknown as EditorView) as unknown as Editor,
			file: this.getActiveEditorFile(),
			getMode: () => "source",
		};

		this.set(this.options.value);

		this.editor.cm.contentDOM.addEventListener("blur", () => {
			this.app.keymap.popScope(this.scope);
			if (this._loaded) this.options.onBlur(this);
		});

		this.editor.cm.contentDOM.addEventListener("focusin", () => {
			this.app.keymap.pushScope(this.scope);
			this.activeEditorOwner.file = this.getActiveEditorFile();
			(this.app.workspace as unknown as WorkspaceWithActiveEditor).activeEditor =
				this.activeEditorOwner;

			if (this.options.enterVimInsertMode && !this.hasEnteredVimInsertMode) {
				this.hasEnteredVimInsertMode = true;
				this.enterVimInsertMode();
			}
		});

		if (this.options.cls) {
			this.editorEl.classList.add(this.options.cls);
		}
	}

	get value(): string {
		return this.editor.cm.state.doc.toString();
	}

	setValue(value: string): void {
		this.set(value);
	}

	focus(): void {
		this.editor.cm.focus();
	}

	blur(): void {
		this.editor.cm.contentDOM.blur();
	}

	onUpdate(update: ViewUpdate, changed: boolean): void {
		super.onUpdate(update, changed);
		if (changed) {
			this.options.onChange(this.value, update);
		}
	}

	buildLocalExtensions(): Extension[] {
		const extensions = super.buildLocalExtensions();

		extensions.push(
			tooltips({
				parent: getMarkdownEditorTooltipParent(this.containerEl),
			})
		);

		if (this.options.placeholder) {
			extensions.push(placeholder(this.options.placeholder));
		}

		extensions.push(
			Prec.highest(
				keymap.of([
					{
						key: "Shift-Mod-Enter",
						run: () => {
							this.options.onSubmit(this, true);
							return true;
						},
					},
					{
						key: "Mod-Enter",
						run: () => {
							this.options.onSubmit(this, false);
							return true;
						},
					},
					{
						key: "Escape",
						run: () => {
							this.options.onEscape(this);
							return true;
						},
					},
				])
			)
		);

		if (this.options.extensions.length > 0) {
			extensions.push(...this.options.extensions);
		}

		return extensions;
	}

	destroy(): void {
		if (this._loaded) {
			this.unload();
		}

		this.app.keymap.popScope(this.scope);
		const workspace = this.app.workspace as unknown as WorkspaceWithActiveEditor;
		if (workspace.activeEditor === this.activeEditorOwner) {
			workspace.activeEditor = null;
		}

		this.containerEl.empty();
		super.destroy();
	}

	onunload(): void {
		this.destroy();
	}

	private getActiveEditorFile(): Nullable<TFile> {
		if (this.options.file !== undefined) {
			return this.options.file ?? null;
		}

		return this.app.workspace.getActiveFile();
	}

	private enterVimInsertMode(): void {
		window.setTimeout(() => {
			try {
				const vimModeEnabled = (this.app.vault as VaultWithConfig).getConfig("vimMode");
				if (!vimModeEnabled) return;

				const Vim = (window as unknown as WindowWithCodeMirrorAdapter).CodeMirrorAdapter?.Vim;
				if (!Vim) return;

				const cm5 = this.editor.cm.cm ?? this.activeCM;
				if (!cm5) return;

				Vim.handleKey(cm5, "i", "api");
			} catch {
				// Vim integration is optional and depends on Obsidian internals.
			}
		}, 50);
	}
}
