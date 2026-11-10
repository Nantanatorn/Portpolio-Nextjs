import "server-only";
import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

const dictionaries = {
  en: () =>
    import("./dictionaries/en.json").then((m) => m.default as Dictionary),
  th: () =>
    import("./dictionaries/th.json").then((m) => m.default as Dictionary),
};

export type Locale = keyof typeof dictionaries;

export const locales = Object.keys(dictionaries) as Locale[];

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries;

export const getDictionary = async (locale: Locale) => dictionaries[locale]();
