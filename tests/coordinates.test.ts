import { describe, expect, it } from "vitest";
import { getPlanePointFromClient } from "../src/bases/coordinates";

describe("Canvas Bases coordinate helpers", () => {
	it("measures pointer coordinates from the canvas world origin", () => {
		expect(getPlanePointFromClient(
			250,
			300,
			{ left: 46, top: 84 },
			1
		)).toEqual({
			x: 204,
			y: 216,
		});
	});

	it("accounts for zoom after subtracting the world origin", () => {
		expect(getPlanePointFromClient(
			446,
			484,
			{ left: 46, top: 84 },
			2
		)).toEqual({
			x: 200,
			y: 200,
		});
	});
});
