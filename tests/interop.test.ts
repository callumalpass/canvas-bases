import { App as MockApp } from "obsidian-test-mocks/obsidian";
import { describe, expect, it, vi } from "vitest";
import {
	InMemoryInteropBridge,
	type InteropClient,
} from "@callumalpass/mdbase-interop";
import { parseJsonCanvas } from "../src/canvas/jsonCanvas";
import {
	CANVAS_CARD_CREATE_CONTRACT,
	CANVAS_DROP_EVENT_CONTRACT,
	CanvasBasesInteropProvider,
} from "../src/interop";

describe("Canvas Bases interoperability provider", () => {
	it.each([
		{ apiVersion: undefined, profileVersion: "0.1", enabled: true },
		{ apiVersion: 2, profileVersion: "0.1", enabled: true },
		{ apiVersion: 1, profileVersion: "0.2", enabled: true },
		{ apiVersion: 1, profileVersion: "0.1", enabled: false },
	])("ignores an unavailable bridge: %j", async ({ apiVersion, profileVersion, enabled }) => {
		const connect = vi.fn();
		const mdbase = {
			api: {
				apiVersion,
				interop: { profileVersion, connect },
				getInteropStatus: () => ({ enabled, profileVersion }),
			},
		};
		const getPlugin = vi.fn(() => mdbase);
		const provider = new CanvasBasesInteropProvider({
			app: { plugins: { getPlugin } },
		} as never);
		provider.connect();
		provider.connect();
		await provider.dispose();
		expect(getPlugin).toHaveBeenCalledWith("mdbase-sync");
		expect(connect).not.toHaveBeenCalled();
	});

	it("registers canvas.card.create and appends a validated file card", async () => {
		const app = MockApp.createConfigured__({ files: {} });
		const bridge = new InMemoryInteropBridge({ authorize: () => true });
		const providerClient = bridge.connect({
			application: "canvas-bases",
			implementation: "canvas-bases.obsidian",
			version: "0.1.2",
		});
		const caller = bridge.connect({
			application: "tasknotes-workflows",
			implementation: "tasknotes-workflows.obsidian",
			version: "0.1.1",
		});
		const mdbase = {
			api: {
				apiVersion: 1,
				interop: { profileVersion: "0.1", connect: vi.fn((): InteropClient => providerClient) },
				getInteropStatus: () => ({ enabled: true, profileVersion: "0.1" }),
			},
		};
		let installed = false;
		let enabled = false;
		mdbase.api.getInteropStatus = () => ({ enabled, profileVersion: "0.1" });
		Object.assign(app, {
			plugins: {
				getPlugin: (id: string) => installed && id === "mdbase-sync" ? mdbase : null,
			},
		});
		const plugin = {
			app,
			manifest: { id: "canvas-bases", version: "0.1.2" },
		};
		const provider = new CanvasBasesInteropProvider(plugin as never);
		provider.connect();
		installed = true;
		provider.connect();
		expect(mdbase.api.interop.connect).not.toHaveBeenCalled();
		enabled = true;
		provider.connect();
		provider.connect();

		await vi.waitFor(() => {
			expect(bridge.describe().action_providers).toHaveLength(1);
			expect(bridge.describe().event_sources).toHaveLength(1);
		});
		expect(mdbase.api.interop.connect).toHaveBeenCalledTimes(1);
		const outcome = await caller.invokeAction({
			request_id: "req-create-card",
			contract: {
				id: CANVAS_CARD_CREATE_CONTRACT.id,
				version: "^1.0.0",
			},
			requested_provider: { application: "canvas-bases" },
			idempotency_key: "workflow-run:add-card",
			input: {
				canvas_path: "TaskNotes/Canvases/Completed tasks.canvas",
				card: { kind: "file", file: "Tasks/Ship contracts.md" },
			},
		});

		expect(outcome.status).toBe("succeeded");
		expect(outcome).toMatchObject({
			provider: { application: "canvas-bases" },
			output: {
				canvas_path: "TaskNotes/Canvases/Completed tasks.canvas",
				created: true,
			},
		});
		const file = app.vault.getFileByPath("TaskNotes/Canvases/Completed tasks.canvas");
		expect(file).not.toBeNull();
		const canvas = parseJsonCanvas(await app.vault.read(file!));
		expect(canvas.nodes).toEqual([
			expect.objectContaining({
				type: "file",
				file: "Tasks/Ship contracts.md",
				x: 0,
				y: 0,
			}),
		]);

		const received: unknown[] = [];
		const subscription = await caller.subscribeEvents(
			{ contract: { id: CANVAS_DROP_EVENT_CONTRACT.id, version: "^1.0.0" } },
			(event) => received.push(event),
		);
		await expect(provider.publishCanvasDrop({
			board: { path: "Boards/Planning.base", view: "Planning" },
			file: { path: "Tasks/Ship contracts.md" },
			position: { x: 10, y: 20 },
			zone: { id: "review-queue", label: "Review" },
		})).resolves.toBe(true);
		expect(received).toEqual([
			expect.objectContaining({
				specversion: "1.0",
				type: CANVAS_DROP_EVENT_CONTRACT.id,
				mdbasecontractversion: CANVAS_DROP_EVENT_CONTRACT.version,
				mdbaseapplication: "canvas-bases",
				subject: "Tasks/Ship%20contracts.md",
				data: {
					board: { path: "Boards/Planning.base", view: "Planning" },
					file: { path: "Tasks/Ship contracts.md" },
					zone: { id: "review-queue", label: "Review" },
					position: { x: 10, y: 20 },
				},
			}),
		]);

		await subscription.dispose();
		await provider.dispose();
		await caller.dispose();
		await bridge.dispose();
	});
});
