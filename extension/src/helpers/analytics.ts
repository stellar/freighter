import { BUILD_TYPE } from "constants/env";

/**
 * Amplitude user property key used to identify the app bundle/channel.
 * Kept as a constant to avoid string drift across metrics and feature flags.
 */
export const BUNDLE_ID_USER_PROPERTY_KEY = "Bundle Id";

/**
 * Returns the extension bundle identifier used by analytics and experiment fetches.
 */
export const getBundleId = (): string => `extension.${BUILD_TYPE}`;
