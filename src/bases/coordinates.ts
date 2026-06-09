export interface PlaneOrigin {
	left: number;
	top: number;
}

export interface PlanePoint {
	x: number;
	y: number;
}

export function getPlanePointFromClient(
	clientX: number,
	clientY: number,
	origin: PlaneOrigin,
	zoom: number
): PlanePoint {
	return {
		x: (clientX - origin.left) / zoom,
		y: (clientY - origin.top) / zoom,
	};
}
