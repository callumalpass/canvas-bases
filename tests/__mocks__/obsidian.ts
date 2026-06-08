export class TFile {
	path = "";
	name = "";
	basename = "";
}

export class Notice {
	constructor(_message: string) {}
}

export function normalizePath(path: string): string {
	return path.replace(/\\/gu, "/").replace(/\/+/gu, "/");
}
