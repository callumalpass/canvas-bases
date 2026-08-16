import { describe, expect, it } from "vitest";
import { getBoardPointerAction } from "../src/bases/boardPointer";

describe("getBoardPointerAction", () => {
	it("pans for a primary touch drag", () => {
		expect(
			getBoardPointerAction({ button: 0, pointerType: "touch", isPrimary: true })
		).toBe("pan");
	});

	it("ignores additional touch pointers", () => {
		expect(
			getBoardPointerAction({ button: 0, pointerType: "touch", isPrimary: false })
		).toBeNull();
	});

	it("keeps primary mouse drags for selection", () => {
		expect(
			getBoardPointerAction({ button: 0, pointerType: "mouse", isPrimary: true })
		).toBe("select");
	});

	it("keeps middle mouse drags for panning", () => {
		expect(
			getBoardPointerAction({ button: 1, pointerType: "mouse", isPrimary: true })
		).toBe("pan");
	});
});
