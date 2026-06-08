export class TFile {
	path = "";
	name = "";
	basename = "";
}

export class Notice {
	constructor(_message: string) {}
}

export class Events {
	private readonly listeners = new Map<string, Set<(...data: unknown[]) => unknown>>();

	on(event: string, callback: (...data: unknown[]) => unknown): { event: string } {
		const listeners = this.listeners.get(event) ?? new Set();
		listeners.add(callback);
		this.listeners.set(event, listeners);
		return { event };
	}

	trigger(event: string, ...data: unknown[]): void {
		for (const callback of this.listeners.get(event) ?? []) {
			callback(...data);
		}
	}
}

export function normalizePath(path: string): string {
	return path.replace(/\\/gu, "/").replace(/\/+/gu, "/");
}
