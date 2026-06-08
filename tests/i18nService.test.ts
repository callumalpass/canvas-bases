import { describe, expect, it } from "vitest";
import { translationResources } from "../src/i18n";
import { I18nService, flattenTranslationTree } from "../src/i18n/I18nService";
import type { TranslationResources } from "../src/i18n/types";

const resources = {
	en: {
		common: {
			greeting: "Hello {name}",
			count: {
				one: "{count} item",
				other: "{count} items",
			},
		},
	},
	fr: {
		common: {
			greeting: "Bonjour {name}",
		},
	},
} satisfies TranslationResources;

describe("I18nService", () => {
	it("resolves nested keys and interpolates values", () => {
		const i18n = new I18nService({ resources, defaultLocale: "en" });

		expect(i18n.translate("common.greeting", { name: "Callum" })).toBe("Hello Callum");
	});

	it("falls back to English when a locale is missing a key", () => {
		const i18n = new I18nService({ resources, defaultLocale: "en", initialLocale: "fr" });

		expect(i18n.translatePlural("common.count", 3)).toBe("3 items");
	});

	it("normalizes system locales to available language resources", () => {
		const i18n = new I18nService({
			resources,
			defaultLocale: "en",
			initialLocale: "system",
			getSystemLocale: () => "fr-CA",
		});

		expect(i18n.getCurrentLocale()).toBe("fr");
	});

	it("flattens translation trees using dot paths", () => {
		expect(flattenTranslationTree(resources.en)).toMatchObject({
			"common.greeting": "Hello {name}",
			"common.count.one": "{count} item",
		});
	});

	it("ships the same UI locale set as TaskNotes", () => {
		expect(Object.keys(translationResources)).toEqual([
			"en",
			"fr",
			"ru",
			"zh",
			"de",
			"es",
			"ja",
			"pt",
			"ko",
		]);
	});
});
