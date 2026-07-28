import { Notice, type Plugin } from "obsidian";
import type {
	ActionContractArtifact,
	ActionProviderRegistration,
	EventContractArtifact,
	EventSourceRegistration,
	InteropClient,
} from "@callumalpass/mdbase-interop";
import {
	createCanvasCard,
	type CreateCanvasCardInput,
} from "./canvas/createCard";

export interface CanvasDropEventData {
	board: {
		view: string;
	};
	record: {
		path: string;
		node_id: string;
	};
	position: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	target?: {
		id: string;
		label: string;
		action: string;
		property: string;
		value: string;
	};
	changed: boolean;
}

export const CANVAS_DROP_EVENT_CONTRACT = {
	kind: "mdbase.contract",
	contract_type: "event",
	id: "canvas.drop",
	version: "1.0.0",
	name: "Canvas card dropped",
	description: "A file card was dropped into an active Canvas Bases group.",
	data_schema: {
		dialect: "json-schema-2020-12",
		value: {
			type: "object",
			required: ["board", "record", "position", "changed"],
			additionalProperties: false,
			properties: {
				board: {
					type: "object",
					required: ["view"],
					additionalProperties: false,
					properties: { view: { type: "string", minLength: 1 } },
				},
				record: {
					type: "object",
					required: ["path", "node_id"],
					additionalProperties: false,
					properties: {
						path: { type: "string", minLength: 1 },
						node_id: { type: "string", minLength: 1 },
					},
				},
				position: {
					type: "object",
					required: ["x", "y", "width", "height"],
					additionalProperties: false,
					properties: {
						x: { type: "number" },
						y: { type: "number" },
						width: { type: "number", exclusiveMinimum: 0 },
						height: { type: "number", exclusiveMinimum: 0 },
					},
				},
				target: {
					type: "object",
					required: ["id", "label", "action", "property", "value"],
					additionalProperties: false,
					properties: {
						id: { type: "string", minLength: 1 },
						label: { type: "string" },
						action: { type: "string", minLength: 1 },
						property: { type: "string", minLength: 1 },
						value: { type: "string" },
					},
				},
				changed: { type: "boolean" },
			},
		},
	},
} as const satisfies EventContractArtifact;

export const CANVAS_CARD_CREATE_CONTRACT = {
	kind: "mdbase.contract",
	contract_type: "action",
	id: "canvas.card.create",
	version: "1.0.0",
	name: "Create canvas card",
	description: "Append one text or file card to a JSON Canvas document.",
	input_schema: {
		dialect: "json-schema-2020-12",
		value: {
			type: "object",
			required: ["canvas_path", "card"],
			additionalProperties: false,
			properties: {
				canvas_path: {
					type: "string",
					minLength: 8,
					pattern: "^(?!/)(?!.*(?:^|/)\\.\\.(?:/|$)).+\\.canvas$",
				},
				card: {
					oneOf: [
						{
							type: "object",
							required: ["kind", "file"],
							additionalProperties: false,
							properties: {
								kind: { const: "file" },
								file: { type: "string", minLength: 1 },
								subpath: { type: "string", minLength: 1 },
							},
						},
						{
							type: "object",
							required: ["kind", "text"],
							additionalProperties: false,
							properties: {
								kind: { const: "text" },
								text: { type: "string", minLength: 1 },
							},
						},
					],
				},
				position: {
					type: "object",
					required: ["x", "y"],
					additionalProperties: false,
					properties: {
						x: { type: "number" },
						y: { type: "number" },
					},
				},
				size: {
					type: "object",
					required: ["width", "height"],
					additionalProperties: false,
					properties: {
						width: { type: "number", exclusiveMinimum: 0 },
						height: { type: "number", exclusiveMinimum: 0 },
					},
				},
				color: { type: "string", minLength: 1 },
			},
		},
	},
	output_schema: {
		dialect: "json-schema-2020-12",
		value: {
			type: "object",
			required: ["canvas_path", "card_id", "created"],
			additionalProperties: false,
			properties: {
				canvas_path: { type: "string", minLength: 1 },
				card_id: { type: "string", minLength: 1 },
				created: { const: true },
			},
		},
	},
	behavior: {
		idempotency: "optional",
		cancellation: "none",
	},
} as const satisfies ActionContractArtifact;

interface MdbaseObsidianPlugin {
	api?: {
		interop?: {
			connect(plugin: Plugin): InteropClient;
		};
		getInteropStatus?(): { enabled: boolean };
	};
}

export class CanvasBasesInteropProvider {
	private client: InteropClient | null = null;
	private actionRegistration: ActionProviderRegistration | null = null;
	private eventRegistration: EventSourceRegistration | null = null;
	private connecting: Promise<void> | null = null;
	private registrationFailureReported = false;

	constructor(private readonly plugin: Plugin) {}

	connect(): void {
		if (this.client || this.connecting) return;
		const mdbase = this.getMdbasePlugin();
		if (!mdbase?.api?.interop || mdbase.api.getInteropStatus?.().enabled === false) return;
		this.connecting = this.register(mdbase)
			.catch((error: unknown) => {
				if (this.registrationFailureReported) return;
				this.registrationFailureReported = true;
				const message = error instanceof Error ? ` ${error.message}` : "";
				new Notice(`Canvas Bases could not register its mdbase action provider.${message}`);
			})
			.finally(() => {
				this.connecting = null;
			});
	}

	async dispose(): Promise<void> {
		await this.connecting;
		await this.actionRegistration?.dispose();
		this.actionRegistration = null;
		await this.eventRegistration?.dispose();
		this.eventRegistration = null;
		await this.client?.dispose();
		this.client = null;
	}

	async publishCanvasDrop(data: CanvasDropEventData): Promise<boolean> {
		this.connect();
		await this.connecting;
		const client = this.client;
		if (!client) return false;
		const result = await client.publishEvent({
			contract: {
				id: CANVAS_DROP_EVENT_CONTRACT.id,
				version: CANVAS_DROP_EVENT_CONTRACT.version,
			},
			subject: encodeURI(data.record.path),
			correlation_id: `canvas-drop:${eventId()}`,
			data,
		});
		return result.deliveries > 0;
	}

	private async register(mdbase: MdbaseObsidianPlugin): Promise<void> {
		const interop = mdbase.api?.interop;
		if (!interop) return;
		const client = interop.connect(this.plugin);
		try {
			const actionRegistration = await client.registerActionProvider({
				declaration_id: "canvas-bases.actions",
				handlers: [{
					handler_id: "canvas.card.create",
					contract: CANVAS_CARD_CREATE_CONTRACT,
					idempotency: {
						mode: "request",
						retention_seconds: 3600,
					},
					cancellation: "none",
					handler: async (input) =>
						await createCanvasCard(this.plugin.app, input as CreateCanvasCardInput),
				}],
			});
			const eventRegistration = await client.registerEventSource({
				declaration_id: "canvas-bases.events",
				contracts: [{
					contract: CANVAS_DROP_EVENT_CONTRACT,
					ordering: ["source", "subject"],
				}],
			});
			this.client = client;
			this.actionRegistration = actionRegistration;
			this.eventRegistration = eventRegistration;
			this.registrationFailureReported = false;
		} catch (error) {
			await client.dispose();
			throw error;
		}
	}

	private getMdbasePlugin(): MdbaseObsidianPlugin | null {
		const app = this.plugin.app as typeof this.plugin.app & {
			plugins?: { getPlugin(id: string): unknown };
		};
		return app.plugins?.getPlugin("mdbase-obsidian") as MdbaseObsidianPlugin | null;
	}
}

function eventId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
