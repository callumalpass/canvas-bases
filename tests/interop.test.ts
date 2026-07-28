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
				interop: { connect: vi.fn((): InteropClient => providerClient) },
				getInteropStatus: () => ({ enabled: true }),
			},
		};
		Object.assign(app, {
			plugins: {
				getPlugin: (id: string) => id === "mdbase-obsidian" ? mdbase : null,
			},
		});
		const plugin = {
			app,
			manifest: { id: "canvas-bases", version: "0.1.2" },
		};
		const provider = new CanvasBasesInteropProvider(plugin as never);
		provider.connect();

		await vi.waitFor(() => {
			expect(bridge.describe().action_providers).toHaveLength(1);
			expect(bridge.describe().event_sources).toHaveLength(1);
		});
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
			board: { view: "Planning" },
			record: { path: "Tasks/Ship contracts.md", node_id: "file-1" },
			position: { x: 10, y: 20, width: 240, height: 160 },
			target: {
				id: "done",
				label: "Done",
				action: "set-property",
				property: "status",
				value: "done",
			},
			changed: true,
		})).resolves.toBe(true);
		expect(received).toEqual([
			expect.objectContaining({
				specversion: "1.0",
				type: CANVAS_DROP_EVENT_CONTRACT.id,
				mdbasecontractversion: CANVAS_DROP_EVENT_CONTRACT.version,
				mdbaseapplication: "canvas-bases",
				subject: "Tasks/Ship%20contracts.md",
				data: expect.objectContaining({
					record: { path: "Tasks/Ship contracts.md", node_id: "file-1" },
				}),
			}),
		]);

		await subscription.dispose();
		await provider.dispose();
		await caller.dispose();
		await bridge.dispose();
	});
});
