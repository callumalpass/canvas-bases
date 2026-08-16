import { describe, expect, it } from "vitest";
import type { BasesAllOptions, BasesOptions } from "obsidian";
import { VIEW_CONFIG_KEYS } from "../src/constants";
import { buildCanvasBasesViewOptions } from "../src/bases/viewOptions";
import { DEFAULT_SETTINGS } from "../src/settings/defaults";

describe("buildCanvasBasesViewOptions", () => {
	it("uses the configured plugin defaults for new views", () => {
		const defaults = {
			...DEFAULT_SETTINGS,
			defaultLayout: "grid" as const,
			defaultEdgeMode: "properties" as const,
			defaultEdgeProperties: "depends_on, related",
			defaultShowBodyEditor: false,
			defaultTaskNotesMode: "off" as const,
			defaultTaskNotesShowBadges: false,
			defaultTaskNotesShowActions: false,
			defaultTaskNotesRelationships: "all" as const,
			preservePositions: false,
			removeMissingNodes: false,
			nodeWidth: 420,
			nodeHeight: 240,
		};

		const options = flattenOptions(buildCanvasBasesViewOptions((key) => key, defaults));

		expect(getDefault(options, VIEW_CONFIG_KEYS.layout)).toBe("grid");
		expect(getDefault(options, VIEW_CONFIG_KEYS.edgeMode)).toBe("properties");
		expect(getDefault(options, VIEW_CONFIG_KEYS.edgeProperties)).toBe(
			"depends_on, related"
		);
		expect(getDefault(options, VIEW_CONFIG_KEYS.showBodyEditor)).toBe(false);
		expect(getDefault(options, VIEW_CONFIG_KEYS.taskNotesMode)).toBe("off");
		expect(getDefault(options, VIEW_CONFIG_KEYS.taskNotesShowBadges)).toBe(false);
		expect(getDefault(options, VIEW_CONFIG_KEYS.taskNotesShowActions)).toBe(false);
		expect(getDefault(options, VIEW_CONFIG_KEYS.taskNotesRelationships)).toBe("all");
		expect(getDefault(options, VIEW_CONFIG_KEYS.preservePositions)).toBe(false);
		expect(getDefault(options, VIEW_CONFIG_KEYS.removeMissingNodes)).toBe(false);
		expect(getDefault(options, VIEW_CONFIG_KEYS.nodeWidth)).toBe(420);
		expect(getDefault(options, VIEW_CONFIG_KEYS.nodeHeight)).toBe(240);
	});
});

function flattenOptions(options: BasesAllOptions[]): BasesOptions[] {
	return options.flatMap((option) => ("items" in option ? option.items : [option]));
}

function getDefault(options: BasesOptions[], key: string): unknown {
	return options.find((option) => option.key === key)?.default;
}
