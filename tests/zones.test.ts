import type { BasesViewConfig } from "obsidian";
import { describe, expect, it } from "vitest";
import {
	getZoneKey,
	normalizeZoneProperty,
	normalizeZones,
	setZones,
} from "../src/bases/zones";
import { VIEW_CONFIG_KEYS } from "../src/constants";

describe("zone config", () => {
	it("normalizes and deduplicates Bases-derived and custom zone entries", () => {
		expect(
			normalizeZones([
				{ origin: "bases", property: "status", value: "Doing" },
				{ origin: "bases", property: "note.status", value: "Doing" },
				{
					origin: "custom",
					id: "zone-1",
					label: "Triage",
					action: "set-property",
					property: "status",
					value: "Doing",
					updateMode: "appendUnique",
					valueType: "list",
					color: "#D946EF",
				},
				{
					origin: "custom",
					id: "zone-2",
					label: "Tracking",
					action: "time.start",
					color: "#22C55E",
				},
				{
					origin: "custom",
					id: "zone-1",
					label: "Duplicate",
					property: "status",
					value: "Later",
					color: "invalid",
				},
				{ origin: "bases", property: "task.status", value: "done" },
				{
					origin: "bases",
					property: "formula.stage",
					value: 2,
					updateMode: "invalid",
					valueType: "invalid",
				},
				{ origin: "custom", property: "status", value: "missing id" },
				{ value: "missing property" },
			])
		).toEqual([
			{
				origin: "bases",
				action: "set-property",
				property: "note.status",
				value: "Doing",
				updateMode: "replace",
				valueType: "auto",
			},
			{
				origin: "custom",
				id: "zone-1",
				label: "Triage",
				action: "set-property",
				property: "note.status",
				value: "Doing",
				updateMode: "appendUnique",
				valueType: "list",
				color: "#d946ef",
			},
			{
				origin: "custom",
				id: "zone-2",
				label: "Tracking",
				action: "time.start",
				property: "",
				value: "",
				updateMode: "replace",
				valueType: "auto",
				color: "#22c55e",
			},
			{
				origin: "bases",
				action: "set-property",
				property: "task.status",
				value: "done",
				updateMode: "replace",
				valueType: "auto",
			},
			{
				origin: "bases",
				action: "set-property",
				property: "formula.stage",
				value: "2",
				updateMode: "replace",
				valueType: "auto",
			},
		]);
	});

	it("stores normalized zones in the Bases view config", () => {
		const writes = new Map<string, unknown>();
		const config = {
			set: (key: string, value: unknown) => writes.set(key, value),
		} as unknown as BasesViewConfig;

		setZones(config, [
			{
				origin: "bases",
				action: "set-property",
				property: "status",
				value: "Doing",
				updateMode: "replace",
				valueType: "auto",
			},
			{
				origin: "bases",
				action: "set-property",
				property: "note.status",
				value: "Doing",
				updateMode: "append",
				valueType: "list",
			},
			{
				origin: "custom",
				id: "zone-1",
				label: "Triage",
				action: "set-property",
				property: "task.status",
				value: "done",
				updateMode: "clear",
				valueType: "string",
				color: "#22c55e",
			},
			{
				origin: "custom",
				id: "zone-2",
				label: "Tracking",
				action: "time.start",
				property: "",
				value: "",
				updateMode: "replace",
				valueType: "auto",
				color: "#d946ef",
			},
		]);

		expect(writes.get(VIEW_CONFIG_KEYS.zones)).toEqual([
			{
				origin: "bases",
				action: "set-property",
				property: "note.status",
				value: "Doing",
				updateMode: "replace",
				valueType: "auto",
			},
			{
				origin: "custom",
				id: "zone-1",
				label: "Triage",
				action: "set-property",
				property: "task.status",
				value: "done",
				updateMode: "clear",
				valueType: "string",
				color: "#22c55e",
			},
			{
				origin: "custom",
				id: "zone-2",
				label: "Tracking",
				action: "time.start",
				color: "#d946ef",
			},
		]);
	});

	it("keeps zone keys stable across shorthand note properties", () => {
		expect(normalizeZoneProperty("status")).toBe("note.status");
		expect(getZoneKey("bases", "status", "Doing")).toBe(
			getZoneKey("bases", "note.status", "Doing")
		);
		expect(getZoneKey("custom", "status", "Doing", "zone-1")).toBe(
			getZoneKey("custom", "status", "Later", "zone-1")
		);
	});
});
