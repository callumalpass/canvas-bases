import { I18nService } from "./I18nService";
import type { I18nServiceOptions, TranslationResources } from "./types";
import { de } from "./resources/de";
import { en } from "./resources/en";
import { es } from "./resources/es";
import { fr } from "./resources/fr";
import { ja } from "./resources/ja";
import { ko } from "./resources/ko";
import { pt } from "./resources/pt";
import { ru } from "./resources/ru";
import { zh } from "./resources/zh";

export const translationResources = {
	en,
	fr,
	ru,
	zh,
	de,
	es,
	ja,
	pt,
	ko,
} satisfies TranslationResources;

export type TranslationKey = string;
export type { InterpolationValues, TranslateFn } from "./types";

export function createI18nService(options?: Partial<I18nServiceOptions>): I18nService {
	return new I18nService({
		resources: translationResources,
		defaultLocale: "en",
		fallbackLocale: "en",
		...options,
	});
}

export { I18nService };
