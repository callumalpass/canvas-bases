import { App as MockApp } from "obsidian-test-mocks/obsidian";
import {
	InMemoryInteropBridge,
	InteropError,
	contractDigest,
	type CloudEvent,
	type InteropClient,
} from "@callumalpass/mdbase-interop";
import {
	CANVAS_CARD_CREATE_CONTRACT,
	CANVAS_DROP_EVENT_CONTRACT,
	CanvasBasesInteropProvider,
} from "../src/interop";

const PROVIDER_SCENARIO = "interop.application-provider-lifecycle";
const EVENT_SCENARIO = "interop.application-event-multicast";
const implementation = {
	id: "canvas-bases",
	name: "Canvas Bases Obsidian plugin",
	version: "0.1.4",
	language: "TypeScript",
	target: "Obsidian",
};

async function main(): Promise<void> {
	const command = process.argv[2];
	if (command === "describe") {
		write({
			kind: "mdbase.testbed.adapter",
			protocol_version: "0.1",
			implementation,
			profiles: ["event_action_interop/0.1"],
			roles: ["event_source", "action_provider"],
			scenarios: [EVENT_SCENARIO, PROVIDER_SCENARIO],
		});
	} else if (command === "run") {
		const request = JSON.parse(await readStdin()) as {
			kind?: string;
			protocol_version?: string;
			scenario?: { id?: string };
		};
		if (
			request.kind !== "mdbase.testbed.run"
			|| request.protocol_version !== "0.1"
			|| ![EVENT_SCENARIO, PROVIDER_SCENARIO].includes(request.scenario?.id ?? "")
		) {
			throw new Error("Unsupported or invalid mdbase testbed run request.");
		}
		const scenarioId = request.scenario!.id!;
		write({
			kind: "mdbase.testbed.transcript",
			protocol_version: "0.1",
			scenario_id: scenarioId,
			implementation,
			entries: scenarioId === PROVIDER_SCENARIO
				? await providerLifecycle()
				: await eventMulticast(),
		});
	} else {
		process.stderr.write("Usage: testbed-adapter.mjs describe|run\n");
		process.exitCode = 2;
	}
}

main().catch((error) => {
	process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
	process.exitCode = 1;
});

async function providerLifecycle(): Promise<Record<string, unknown>[]> {
	const fixture = await applicationFixture();
	try {
		const validInput = {
			canvas_path: "Boards/Testbed.canvas",
			card: { kind: "file" as const, file: "Notes/Shared.md" },
		};
		const outcome = await fixture.caller.invokeAction({
			request_id: "req-canvas-1",
			contract: {
				id: CANVAS_CARD_CREATE_CONTRACT.id,
				version: CANVAS_CARD_CREATE_CONTRACT.version,
			},
			idempotency_key: "testbed:canvas-card",
			input: validInput,
		});
		const invalidCode = await rejectedCode(() => fixture.caller.invokeAction({
			request_id: "req-canvas-invalid",
			contract: {
				id: CANVAS_CARD_CREATE_CONTRACT.id,
				version: CANVAS_CARD_CREATE_CONTRACT.version,
			},
			idempotency_key: "testbed:canvas-invalid",
			input: {},
		}));
		const created = fixture.app.vault.getFileByPath("Boards/Testbed.canvas") !== null;
		await fixture.provider.dispose();
		const missingCode = await rejectedCode(() => fixture.caller.invokeAction({
			request_id: "req-canvas-unloaded",
			contract: {
				id: CANVAS_CARD_CREATE_CONTRACT.id,
				version: CANVAS_CARD_CREATE_CONTRACT.version,
			},
			idempotency_key: "testbed:canvas-unloaded",
			input: validInput,
		}));
		return [
			entry(1, "arrange", "application", "contract.describe", "succeeded", {
				contract_type: CANVAS_CARD_CREATE_CONTRACT.contract_type,
				schema: CANVAS_CARD_CREATE_CONTRACT.input_schema.dialect,
			}),
			entry(2, "arrange", "application", "action-provider.register", "succeeded", {
				providers: 1,
			}),
			entry(3, "act", "caller", "action.invoke", "succeeded", {
				exact_contract:
					outcome.contract.digest === await contractDigest(CANVAS_CARD_CREATE_CONTRACT),
				provider_calls: created ? 1 : 0,
			}),
			entry(4, "act", "caller", "action.invoke", "rejected", {
				code: invalidCode,
			}),
			entry(5, "act", "application", "client.dispose", "succeeded", {
				providers: fixture.bridge.describe().action_providers.length,
			}),
			entry(6, "observe", "caller", "action.invoke", "rejected", {
				code: missingCode,
			}),
		];
	} finally {
		await fixture.dispose();
	}
}

async function eventMulticast(): Promise<Record<string, unknown>[]> {
	const fixture = await applicationFixture();
	try {
		const alpha = fixture.bridge.connect(identity("consumer-alpha"));
		const beta = fixture.bridge.connect(identity("consumer-beta"));
		const received: Array<{ consumer: string; event: CloudEvent }> = [];
		await alpha.subscribeEvents(
			{ contract: { id: CANVAS_DROP_EVENT_CONTRACT.id, version: "^1.0.0" } },
			(event) => received.push({ consumer: "consumer-alpha", event }),
		);
		await beta.subscribeEvents(
			{ contract: { id: CANVAS_DROP_EVENT_CONTRACT.id, version: "^1.0.0" } },
			(event) => received.push({ consumer: "consumer-beta", event }),
		);
		await fixture.provider.publishCanvasDrop({
			board: { view: "Testbed" },
			record: { path: "Notes/Shared.md", node_id: "file-1" },
			position: { x: 10, y: 20, width: 240, height: 160 },
			changed: false,
		});
		const event = received[0]?.event;
		return [
			entry(1, "arrange", "application", "contract.describe", "succeeded", {
				contract_type: CANVAS_DROP_EVENT_CONTRACT.contract_type,
				schema: CANVAS_DROP_EVENT_CONTRACT.data_schema.dialect,
			}),
			entry(2, "arrange", "application", "event-source.register", "succeeded", {
				sources: fixture.bridge.describe().event_sources.length,
			}),
			entry(3, "arrange", "consumers", "event.subscribe", "succeeded", {
				consumers: 2,
			}),
			entry(4, "act", "application", "event.publish", "succeeded", {
				exact_contract: event?.mdbasecontractdigest
					=== await contractDigest(CANVAS_DROP_EVENT_CONTRACT),
				specversion: event?.specversion,
			}),
			entry(5, "observe", "bridge", "event.deliver", "succeeded", {
				deliveries: received.length,
				distinct_consumers: new Set(received.map(({ consumer }) => consumer)).size,
			}),
		];
	} finally {
		await fixture.dispose();
	}
}

async function applicationFixture() {
	let nextId = 0;
	const app = MockApp.createConfigured__({ files: {} });
	const bridge = new InMemoryInteropBridge({
		authorize: () => true,
		now: () => new Date("2026-07-29T00:00:00.000Z"),
		idFactory: (prefix) => `${prefix}_${++nextId}`,
	});
	const application = bridge.connect(identity("canvas-bases"));
	const caller = bridge.connect(identity("caller"));
	const mdbase = {
		api: {
			interop: { connect: (): InteropClient => application },
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
		manifest: { id: "canvas-bases", version: implementation.version },
	};
	const provider = new CanvasBasesInteropProvider(plugin as never);
	provider.connect();
	await waitFor(() =>
		bridge.describe().action_providers.length === 1
		&& bridge.describe().event_sources.length === 1
	);
	return {
		app,
		bridge,
		caller,
		provider,
		dispose: async () => {
			await provider.dispose();
			await caller.dispose();
			await bridge.dispose();
		},
	};
}

async function waitFor(predicate: () => boolean): Promise<void> {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		if (predicate()) return;
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
	throw new Error("Canvas Bases did not register its interoperability roles.");
}

async function rejectedCode(operation: () => Promise<unknown>): Promise<string> {
	try {
		await operation();
	} catch (error) {
		if (error instanceof InteropError) return error.code;
		throw error;
	}
	throw new Error("Expected interoperability operation to reject.");
}

function identity(application: string) {
	return {
		application,
		implementation: `${application}.testbed`,
		version: "1.0.0",
		instance_id: `${application}-instance`,
	};
}

function entry(
	sequence: number,
	phase: string,
	actor: string,
	operation: string,
	outcome: string,
	facts: Record<string, unknown>,
) {
	return { sequence, phase, actor, operation, outcome, facts };
}

async function readStdin(): Promise<string> {
	let source = "";
	for await (const chunk of process.stdin) source += chunk;
	return source;
}

function write(value: unknown): void {
	process.stdout.write(`${JSON.stringify(value)}\n`);
}
