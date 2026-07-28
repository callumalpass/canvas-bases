import { Notice, type Plugin } from "obsidian";
import type {
	ActionContractArtifact,
	ActionProviderRegistration,
	InteropClient,
} from "@callumalpass/mdbase-interop";
import {
	createCanvasCard,
	type CreateCanvasCardInput,
} from "./canvas/createCard";

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
	private registration: ActionProviderRegistration | null = null;
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
		await this.registration?.dispose();
		this.registration = null;
		await this.client?.dispose();
		this.client = null;
	}

	private async register(mdbase: MdbaseObsidianPlugin): Promise<void> {
		const interop = mdbase.api?.interop;
		if (!interop) return;
		const client = interop.connect(this.plugin);
		try {
			const registration = await client.registerActionProvider({
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
			this.client = client;
			this.registration = registration;
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
