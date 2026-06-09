import type { BasesViewConfig } from "obsidian";
import { VIEW_CONFIG_KEYS } from "../constants";
import type {
	CanvasBasesZoneAction,
	CanvasBasesZoneConfig,
	CanvasBasesZoneOrigin,
	CanvasBasesZoneUpdateMode,
	CanvasBasesZoneValueType,
} from "../types";

export const DEFAULT_ZONE_ACTION: CanvasBasesZoneAction = "set-property";
export const DEFAULT_ZONE_UPDATE_MODE: CanvasBasesZoneUpdateMode = "replace";
export const DEFAULT_ZONE_VALUE_TYPE: CanvasBasesZoneValueType = "auto";
export const DEFAULT_ZONE_LABEL = "Zone";

export const ZONE_ACTIONS = [
	"set-property",
	"task.complete",
	"task.uncomplete",
	"task.archive",
	"task.unarchive",
	"time.start",
	"time.stop",
	"pomodoro.start",
	"pomodoro.assign",
	"recurring.complete",
	"recurring.skip",
] as const satisfies readonly CanvasBasesZoneAction[];

export const ZONE_UPDATE_MODES = [
	"replace",
	"append",
	"appendUnique",
	"remove",
	"clear",
] as const satisfies readonly CanvasBasesZoneUpdateMode[];

export const ZONE_VALUE_TYPES = [
	"auto",
	"string",
	"number",
	"boolean",
	"date",
	"list",
] as const satisfies readonly CanvasBasesZoneValueType[];

export function normalizeZones(value: unknown): CanvasBasesZoneConfig[] {
	if (!Array.isArray(value)) return [];

	const seen = new Set<string>();
	const zones: CanvasBasesZoneConfig[] = [];

	for (const entry of value) {
		const zone = normalizeZone(entry);
		if (!zone) continue;

		const key = getZoneConfigKey(zone);
		if (seen.has(key)) continue;

		seen.add(key);
		zones.push(zone);
	}

	return zones;
}

export function setZones(config: BasesViewConfig, zones: CanvasBasesZoneConfig[]): void {
	config.set(
		VIEW_CONFIG_KEYS.zones,
		normalizeZones(zones).map((zone) => ({
			origin: zone.origin,
			...(zone.origin === "custom" ? { id: zone.id, label: zone.label } : {}),
			action: zone.action,
			...(zone.action === DEFAULT_ZONE_ACTION
				? {
						property: zone.property,
						value: zone.value,
						updateMode: zone.updateMode,
						valueType: zone.valueType,
					}
				: {}),
			...(zone.color ? { color: zone.color } : {}),
		}))
	);
}

export function getZoneKey(
	origin: CanvasBasesZoneOrigin,
	property: string,
	value: string,
	id?: string
): string {
	if (origin === "custom") return `custom\u0000${id ?? ""}`;
	return `bases\u0000${normalizeZoneProperty(property)}\u0000${value}`;
}

export function normalizeZoneProperty(property: string): string {
	const normalized = property.trim();
	if (!normalized) return "";
	if (/^(note|file|formula|task)\./iu.test(normalized)) return normalized;

	return `note.${normalized}`;
}

function normalizeZone(value: unknown): CanvasBasesZoneConfig | null {
	if (!isRecord(value)) return null;
	const origin = normalizeZoneOrigin(value.origin);
	const action = origin === "bases" ? DEFAULT_ZONE_ACTION : normalizeZoneAction(value.action);
	const id = typeof value.id === "string" ? value.id.trim() : "";
	if (origin === "custom" && !id) return null;

	const property = typeof value.property === "string" ? normalizeZoneProperty(value.property) : "";
	const zoneValue = normalizeZoneValue(value.value);
	if (action === DEFAULT_ZONE_ACTION && (!property || zoneValue === null)) return null;

	const label = typeof value.label === "string" ? value.label.trim() : "";
	const color = normalizeZoneColor(value.color);

	return {
		origin,
		...(origin === "custom" ? { id, label: label || DEFAULT_ZONE_LABEL } : {}),
		action,
		property,
		value: zoneValue ?? "",
		updateMode: normalizeZoneUpdateMode(value.updateMode),
		valueType: normalizeZoneValueType(value.valueType),
		...(color ? { color } : {}),
	};
}

function normalizeZoneOrigin(value: unknown): CanvasBasesZoneOrigin {
	return value === "custom" ? "custom" : "bases";
}

export function normalizeZoneAction(value: unknown): CanvasBasesZoneAction {
	return typeof value === "string" && (ZONE_ACTIONS as readonly string[]).includes(value)
		? (value as CanvasBasesZoneAction)
		: DEFAULT_ZONE_ACTION;
}

export function normalizeZoneUpdateMode(value: unknown): CanvasBasesZoneUpdateMode {
	return typeof value === "string" && (ZONE_UPDATE_MODES as readonly string[]).includes(value)
		? (value as CanvasBasesZoneUpdateMode)
		: DEFAULT_ZONE_UPDATE_MODE;
}

export function normalizeZoneValueType(value: unknown): CanvasBasesZoneValueType {
	return typeof value === "string" && (ZONE_VALUE_TYPES as readonly string[]).includes(value)
		? (value as CanvasBasesZoneValueType)
		: DEFAULT_ZONE_VALUE_TYPE;
}

export function normalizeZoneColor(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;

	const color = value.trim();
	return /^#[0-9a-f]{6}$/iu.test(color) ? color.toLowerCase() : undefined;
}

function getZoneConfigKey(zone: CanvasBasesZoneConfig): string {
	return getZoneKey(zone.origin, zone.property, zone.value, zone.id);
}

function normalizeZoneValue(value: unknown): string | null {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	if (value === null || typeof value === "undefined") return "";

	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
