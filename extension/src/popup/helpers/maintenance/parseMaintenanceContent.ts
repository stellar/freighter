import i18n from "popup/helpers/localizationConfig";
import {
  BannerTheme,
  LocalizedString,
  LocalizedStringArray,
  MaintenanceBannerContent,
  MaintenanceScreenContent,
} from "./types";

const VALID_THEMES: BannerTheme[] = Object.values(BannerTheme);
const DEFAULT_THEME: BannerTheme = BannerTheme.Warning;

/**
 * Returns the two-letter base language code from i18next (e.g. "en-US" → "en").
 */
function getLang(): string {
  return (i18n.language ?? "en").split("-")[0];
}

/**
 * Picks the localized value for the current browser language.
 * Falls back to English, then to an empty string.
 *
 * @param map - Map of language code → translated string
 * @returns The best matching localized string
 */
function resolveLocalized(map: LocalizedString): string {
  const lang = getLang();
  return map[lang] ?? map.en ?? "";
}

/**
 * Picks the localized string array for the current browser language.
 * Falls back to English, then to an empty array.
 *
 * @param map - Map of language code → translated string array
 * @returns The best matching localized string array
 */
function resolveLocalizedArray(map: LocalizedStringArray): string[] {
  const lang = getLang();
  const value = map[lang] ?? map.en;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
}

/**
 * Validates and coerces a raw theme string into a `BannerTheme`.
 * Defaults to `"warning"` for unrecognized values.
 *
 * @param raw - The untrusted theme value from the Amplitude payload
 * @returns A valid `BannerTheme`
 */
function toTheme(raw: unknown): BannerTheme {
  if (typeof raw === "string" && VALID_THEMES.includes(raw as BannerTheme)) {
    return raw as BannerTheme;
  }
  return DEFAULT_THEME;
}

/**
 * Checks that a value is a non-null object (not an array).
 */
function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

/**
 * Parses the raw Amplitude payload for the `maintenance_banner` flag.
 * Returns resolved, localized content or `null` for invalid/missing payloads.
 *
 * @param payload - Raw payload from the Amplitude Experiment variant
 * @returns Resolved `MaintenanceBannerContent` or `null`
 */
export function parseBannerPayload(
  payload: unknown,
): MaintenanceBannerContent | null {
  if (!isObject(payload)) return null;

  const { theme, url, banner, modal } = payload;

  if (!isObject(banner)) return null;
  if (!isObject(banner.title)) return null;

  const bannerTitle = resolveLocalized(banner.title as LocalizedString);
  if (!bannerTitle) return null;

  const resolvedTheme = toTheme(theme);

  const resolvedUrl = (() => {
    if (typeof url !== "string") return undefined;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" ? url : undefined;
    } catch {
      return undefined;
    }
  })();

  let resolvedModal: MaintenanceBannerContent["modal"];
  if (isObject(modal) && isObject(modal.title) && isObject(modal.body)) {
    const modalTitle = resolveLocalized(modal.title as LocalizedString);
    const modalBody = resolveLocalizedArray(modal.body as LocalizedStringArray);
    if (modalTitle) {
      resolvedModal = { title: modalTitle, body: modalBody };
    }
  }

  return {
    theme: resolvedTheme,
    url: resolvedUrl,
    bannerTitle,
    modal: resolvedModal,
  };
}

/**
 * Parses the raw Amplitude payload for the `maintenance_screen` flag.
 * Returns resolved, localized content or `null` for invalid/missing payloads.
 *
 * @param payload - Raw payload from the Amplitude Experiment variant
 * @returns Resolved `MaintenanceScreenContent` or `null`
 */
export function parseScreenPayload(
  payload: unknown,
): MaintenanceScreenContent | null {
  if (!isObject(payload)) return null;

  const { content } = payload;

  if (!isObject(content)) return null;
  if (!isObject(content.title)) return null;
  if (!isObject(content.body)) return null;

  const title = resolveLocalized(content.title as LocalizedString);
  if (!title) return null;

  const body = resolveLocalizedArray(content.body as LocalizedStringArray);

  return { title, body };
}
