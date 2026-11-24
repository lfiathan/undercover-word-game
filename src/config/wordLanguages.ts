/**
 * Which word packs a game can be played with.
 *
 * This is deliberately separate from the interface language: everyone reads
 * the menus in whatever language they picked on their own phone, while the
 * host decides which pack the round's secret words are dealt from.
 */

export type WordLanguage = {
  code: string;
  /** Shown in its own language, so it reads the same on every device. */
  label: string;
};

export const WORD_LANGUAGES: WordLanguage[] = [
  { code: "en", label: "English" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
];

export const DEFAULT_WORD_LANGUAGE = "en";

/** Falls back to English for anything we have no pack for. */
export function resolveWordLanguage(language?: string | null): string {
  if (!language) return DEFAULT_WORD_LANGUAGE;
  const base = language.split("-")[0].toLowerCase();
  return WORD_LANGUAGES.some((l) => l.code === base) ? base : DEFAULT_WORD_LANGUAGE;
}

export function wordLanguageLabel(code: string): string {
  return WORD_LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}
