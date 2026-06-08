import { Events, type EventRef } from "obsidian";
import type {
	I18nServiceOptions,
	InterpolationValues,
	LocaleChangeEvent,
	TranslationResources,
	TranslationTree,
} from "./types";

const BASE_FALLBACK = "en";

function flattenTranslations(tree: TranslationTree, prefix = ""): Record<string, string> {
	const entries: Record<string, string> = {};
	for (const [key, value] of Object.entries(tree)) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (typeof value === "string") {
			entries[fullKey] = value;
		} else if (value && typeof value === "object") {
			Object.assign(entries, flattenTranslations(value, fullKey));
		}
	}
	return entries;
}

function interpolate(template: string, params?: InterpolationValues): string {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/gu, (_, token: string) =>
		Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : `{${token}}`
	);
}

function normalizeLocale(locale: string): string {
	return locale.toLowerCase().split("-")[0] ?? locale.toLowerCase();
}

export class I18nService extends Events {
	private readonly resources: TranslationResources;
	private readonly defaultLocale: string;
	private readonly fallbackLocale: string;
	private readonly getSystemLocaleFn?: () => string;
	private cache: Record<string, Record<string, string>> = {};
	private currentLocale: string;

	constructor(options: I18nServiceOptions) {
		super();
		this.resources = options.resources;
		this.defaultLocale = options.defaultLocale;
		this.fallbackLocale = options.fallbackLocale ?? BASE_FALLBACK;
		this.getSystemLocaleFn = options.getSystemLocale;
		this.currentLocale = this.resolveLocale(options.initialLocale ?? this.defaultLocale);
	}

	getAvailableLocales(): string[] {
		return Object.keys(this.resources);
	}

	getNativeLanguageName(languageCode: string): string {
		const nativeNames: Record<string, string> = {
			en: "English",
			fr: "Français",
			de: "Deutsch",
			es: "Español",
			pt: "Português",
			ru: "Русский",
			zh: "中文",
			ja: "日本語",
			ko: "한국어",
		};
		return nativeNames[languageCode] ?? languageCode;
	}

	getCurrentLocale(): string {
		return this.currentLocale;
	}

	setLocale(locale: string): void {
		const next = this.resolveLocale(locale);
		if (next === this.currentLocale) return;
		const previous = this.currentLocale;
		this.currentLocale = next;
		this.trigger("locale-changed", { previous, current: next } satisfies LocaleChangeEvent);
	}

	override on(
		event: "locale-changed",
		callback: (event: LocaleChangeEvent) => void,
		ctx?: unknown
	): EventRef {
		return super.on(event, callback, ctx);
	}

	translate(key: string, params?: InterpolationValues): string {
		const value = this.resolveKey(key) ?? key;
		return interpolate(value, params);
	}

	translatePlural(baseKey: string, count: number, params?: InterpolationValues): string {
		const pluralKey = this.getPluralKey(baseKey, count);
		return this.translate(pluralKey, { ...params, count });
	}

	resolveKey(key: string): string | undefined {
		const localesToTry = [this.currentLocale, this.fallbackLocale, this.defaultLocale];
		for (const locale of localesToTry) {
			const map = this.getLocaleMap(locale);
			if (Object.prototype.hasOwnProperty.call(map, key)) {
				return map[key];
			}
		}
		return undefined;
	}

	getSystemLocale(): string {
		if (this.getSystemLocaleFn) {
			const locale = this.getSystemLocaleFn();
			if (locale) return normalizeLocale(locale);
		}
		if (typeof navigator !== "undefined" && navigator.language) {
			return normalizeLocale(navigator.language);
		}
		return this.defaultLocale;
	}

	private getLocaleMap(locale: string): Record<string, string> {
		const normalized = normalizeLocale(locale);
		if (!this.cache[normalized]) {
			const resource = this.resources[normalized];
			this.cache[normalized] = resource ? flattenTranslations(resource) : {};
		}
		return this.cache[normalized];
	}

	private resolveLocale(locale: string): string {
		if (locale === "system") {
			const systemLocale = this.getSystemLocale();
			if (this.resources[systemLocale]) return systemLocale;
		}
		const normalized = normalizeLocale(locale);
		if (this.resources[normalized]) return normalized;
		if (this.resources[this.defaultLocale]) return this.defaultLocale;
		return this.getAvailableLocales()[0] ?? this.fallbackLocale;
	}

	private getPluralKey(baseKey: string, count: number): string {
		const suffix = count === 0 ? "zero" : count === 1 ? "one" : "other";
		const candidate = `${baseKey}.${suffix}`;
		const localesToTry = [this.currentLocale, this.fallbackLocale, this.defaultLocale];
		for (const locale of localesToTry) {
			const map = this.getLocaleMap(locale);
			if (map[candidate]) return candidate;
		}
		return baseKey;
	}
}

export const flattenTranslationTree = flattenTranslations;
