import type {
	CanvasBasesZoneUpdateMode,
	CanvasBasesZoneValueType,
} from "../types";

type ActiveGroupScalarValueType = "auto" | "string" | "number" | "boolean" | "date";
type ActiveGroupValueContainer = "scalar" | "list";

interface ActiveGroupValueTarget {
	container: ActiveGroupValueContainer;
	scalarType: ActiveGroupScalarValueType;
}

export interface ActiveGroupUpdateOptions {
	updateMode: CanvasBasesZoneUpdateMode;
	valueType: CanvasBasesZoneValueType;
	metadataType?: string | null;
}

export function applyActiveGroupUpdate(
	currentValue: unknown,
	rawValue: string,
	options: ActiveGroupUpdateOptions
): unknown {
	if (options.updateMode === "clear") return undefined;

	const target = getActiveGroupValueTarget(currentValue, options);
	const nextValue = coerceActiveGroupValue(rawValue, target.scalarType);

	switch (options.updateMode) {
		case "append":
			return appendActiveGroupValue(currentValue, nextValue);
		case "appendUnique":
			return appendUniqueActiveGroupValue(currentValue, nextValue);
		case "remove":
			return removeActiveGroupValue(currentValue, nextValue);
		case "replace":
			return target.container === "list" ? [nextValue] : nextValue;
	}
}

function getActiveGroupValueTarget(
	currentValue: unknown,
	options: ActiveGroupUpdateOptions
): ActiveGroupValueTarget {
	if (options.valueType === "list") {
		return {
			container: "list",
			scalarType: getArrayScalarType(currentValue) ?? "string",
		};
	}
	if (options.valueType !== "auto") {
		return {
			container: "scalar",
			scalarType: options.valueType,
		};
	}

	const metadataTarget = getMetadataValueTarget(options.metadataType);
	if (metadataTarget) return metadataTarget;

	if (isUnknownArray(currentValue)) {
		return {
			container: "list",
			scalarType: getArrayScalarType(currentValue) ?? "string",
		};
	}

	const currentScalarType = getScalarType(currentValue);
	return {
		container: "scalar",
		scalarType: currentScalarType ?? "auto",
	};
}

function getMetadataValueTarget(metadataType: string | null | undefined): ActiveGroupValueTarget | null {
	if (!metadataType) return null;

	const type = metadataType.trim().toLowerCase();
	if (!type) return null;

	if (type.endsWith("[]")) {
		return {
			container: "list",
			scalarType: getScalarTypeFromMetadata(type.slice(0, -2)) ?? "string",
		};
	}

	if (
		["list", "multitext", "multi-text", "multiselect", "multi-select", "tags", "aliases"].includes(
			type
		) ||
		type.includes("array")
	) {
		return {
			container: "list",
			scalarType: "string",
		};
	}

	const scalarType = getScalarTypeFromMetadata(type);
	return scalarType
		? {
				container: "scalar",
				scalarType,
			}
		: null;
}

function getScalarTypeFromMetadata(type: string): ActiveGroupScalarValueType | null {
	if (["number", "integer", "float"].includes(type)) return "number";
	if (["boolean", "checkbox"].includes(type)) return "boolean";
	if (["date", "datetime"].includes(type)) return "date";
	if (["string", "text"].includes(type)) return "string";

	return null;
}

function getArrayScalarType(value: unknown): ActiveGroupScalarValueType | null {
	if (!isUnknownArray(value)) return null;

	for (const entry of value) {
		const type = getScalarType(entry);
		if (type) return type;
	}

	return null;
}

function getScalarType(value: unknown): ActiveGroupScalarValueType | null {
	if (typeof value === "string") return "string";
	if (typeof value === "number" && Number.isFinite(value)) return "number";
	if (typeof value === "boolean") return "boolean";

	return null;
}

function coerceActiveGroupValue(
	value: string,
	type: ActiveGroupScalarValueType
): unknown {
	const trimmed = value.trim();

	switch (type) {
		case "number":
			return /^-?\d+(?:\.\d+)?$/u.test(trimmed) ? Number(trimmed) : value;
		case "boolean":
			if (/^(true|yes|1)$/iu.test(trimmed)) return true;
			if (/^(false|no|0)$/iu.test(trimmed)) return false;
			return value;
		case "date":
			return trimmed;
		case "string":
			return value;
		case "auto":
			if (/^(true|false)$/iu.test(trimmed)) return trimmed.toLowerCase() === "true";
			if (/^-?\d+(?:\.\d+)?$/u.test(trimmed)) return Number(trimmed);
			return value;
	}
}

function appendActiveGroupValue(currentValue: unknown, nextValue: unknown): unknown {
	if (isMissingValue(currentValue)) return [nextValue];
	if (isUnknownArray(currentValue)) return [...currentValue, nextValue];

	return [currentValue, nextValue];
}

function appendUniqueActiveGroupValue(currentValue: unknown, nextValue: unknown): unknown {
	if (isMissingValue(currentValue)) return [nextValue];
	if (isUnknownArray(currentValue)) {
		return currentValue.some((entry) => valuesEqual(entry, nextValue))
			? currentValue
			: [...currentValue, nextValue];
	}

	return valuesEqual(currentValue, nextValue) ? currentValue : [currentValue, nextValue];
}

function removeActiveGroupValue(currentValue: unknown, nextValue: unknown): unknown {
	if (isUnknownArray(currentValue)) {
		const values = currentValue.filter((entry) => !valuesEqual(entry, nextValue));
		return values.length > 0 ? values : undefined;
	}

	return valuesEqual(currentValue, nextValue) ? undefined : currentValue;
}

function isMissingValue(value: unknown): boolean {
	return typeof value === "undefined" || value === null || value === "";
}

function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function valuesEqual(left: unknown, right: unknown): boolean {
	return left === right || String(left) === String(right);
}
