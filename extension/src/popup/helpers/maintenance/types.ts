/** Localized string map keyed by ISO 639-1 language code (e.g., "en", "pt"). */
export type LocalizedString = Record<string, string>;

/** Localized string array map keyed by ISO 639-1 language code. */
export type LocalizedStringArray = Record<string, string[]>;

/** Theme variants for the maintenance banner, matching the mobile implementation. */
export enum BannerTheme {
  primary = "primary",
  secondary = "secondary",
  tertiary = "tertiary",
  warning = "warning",
  error = "error",
}

/**
 * Raw payload shape from the Amplitude Experiment `maintenance_banner` flag.
 *
 * @example
 * {
 *   theme: "warning",
 *   url: "https://status.stellar.org",
 *   banner: { title: { en: "Services degraded", pt: "Serviços degradados" } },
 *   modal: {
 *     title: { en: "Details", pt: "Detalhes" },
 *     body: { en: ["Paragraph 1", "Paragraph 2"], pt: ["Parágrafo 1"] }
 *   }
 * }
 */
export interface MaintenanceBannerPayload {
  theme: string;
  url?: string;
  banner: {
    title: LocalizedString;
  };
  modal?: {
    title: LocalizedString;
    body: LocalizedStringArray;
  };
}

/**
 * Raw payload shape from the Amplitude Experiment `maintenance_screen` flag.
 *
 * @example
 * {
 *   content: {
 *     title: { en: "Under Maintenance", pt: "Em manutenção" },
 *     body: { en: ["We'll be back soon."], pt: ["Voltaremos em breve."] }
 *   }
 * }
 */
export interface MaintenanceScreenPayload {
  content: {
    title: LocalizedString;
    body: LocalizedStringArray;
  };
}

/** Resolved (language-selected) content for the maintenance banner. */
export interface MaintenanceBannerContent {
  theme: BannerTheme;
  url?: string;
  bannerTitle: string;
  modal?: {
    title: string;
    body: string[];
  };
}

/** Resolved (language-selected) content for the maintenance screen. */
export interface MaintenanceScreenContent {
  title: string;
  body: string[];
}
