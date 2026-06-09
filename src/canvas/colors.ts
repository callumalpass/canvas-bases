const CANVAS_PALETTE_COLORS: Record<string, string> = {
	"1": "var(--color-red, #e93147)",
	"2": "var(--color-orange, #ec7500)",
	"3": "var(--color-yellow, #e0ac00)",
	"4": "var(--color-green, #08b94e)",
	"5": "var(--color-cyan, #00bfbc)",
	"6": "var(--color-purple, #8b5cf6)",
};

export function normalizeCanvasNodeColor(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;

	const color = value.trim();
	if (/^#[0-9a-f]{6}$/iu.test(color)) return color.toLowerCase();
	if (/^[1-6]$/u.test(color)) return color;

	return undefined;
}

export function getCanvasNodeCssColor(value: unknown): string | undefined {
	const color = normalizeCanvasNodeColor(value);
	if (!color) return undefined;

	return CANVAS_PALETTE_COLORS[color] ?? color;
}
