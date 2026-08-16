export type BoardPointerAction = "pan" | "select" | null;

export interface BoardPointerInput {
	button: number;
	pointerType: string;
	isPrimary: boolean;
}

export function getBoardPointerAction(event: BoardPointerInput): BoardPointerAction {
	if (event.pointerType === "touch") {
		return event.isPrimary ? "pan" : null;
	}

	if (event.button === 1) return "pan";
	if (event.button === 0) return "select";
	return null;
}
