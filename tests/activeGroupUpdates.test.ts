import { describe, expect, it } from "vitest";
import { applyActiveGroupUpdate } from "../src/bases/activeGroupUpdates";

describe("zone updates", () => {
	it("replaces scalar properties using the current value type", () => {
		expect(
			applyActiveGroupUpdate("todo", "done", {
				updateMode: "replace",
				valueType: "auto",
			})
		).toBe("done");
		expect(
			applyActiveGroupUpdate(1, "2", {
				updateMode: "replace",
				valueType: "auto",
			})
		).toBe(2);
	});

	it("replaces list properties with a single-value array", () => {
		expect(
			applyActiveGroupUpdate(["home", "desk"], "work", {
				updateMode: "replace",
				valueType: "auto",
			})
		).toEqual(["work"]);
		expect(
			applyActiveGroupUpdate(undefined, "work", {
				updateMode: "replace",
				valueType: "auto",
				metadataType: "multitext",
			})
		).toEqual(["work"]);
	});

	it("appends unique values to array properties without duplicating existing values", () => {
		expect(
			applyActiveGroupUpdate(["home"], "home", {
				updateMode: "appendUnique",
				valueType: "list",
			})
		).toEqual(["home"]);
		expect(
			applyActiveGroupUpdate(["home"], "work", {
				updateMode: "appendUnique",
				valueType: "list",
			})
		).toEqual(["home", "work"]);
	});

	it("removes matching array values and clears empty arrays", () => {
		expect(
			applyActiveGroupUpdate(["home", "work"], "home", {
				updateMode: "remove",
				valueType: "list",
			})
		).toEqual(["work"]);
		expect(
			applyActiveGroupUpdate(["home"], "home", {
				updateMode: "remove",
				valueType: "list",
			})
		).toBeUndefined();
	});

	it("clears the property explicitly regardless of the configured value", () => {
		expect(
			applyActiveGroupUpdate(["home"], "ignored", {
				updateMode: "clear",
				valueType: "list",
			})
		).toBeUndefined();
	});

	it("uses configured value types when current values are missing", () => {
		expect(
			applyActiveGroupUpdate(undefined, "true", {
				updateMode: "replace",
				valueType: "boolean",
			})
		).toBe(true);
		expect(
			applyActiveGroupUpdate(undefined, "42", {
				updateMode: "replace",
				valueType: "number",
			})
		).toBe(42);
	});
});
