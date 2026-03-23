declare const AMPLITUDE_KEY: string;
const _AMPLITUDE_KEY = AMPLITUDE_KEY;

declare const SENTRY_KEY: string;
const _SENTRY_KEY = SENTRY_KEY;

/** Version from package.json, injected at build time. */
declare const APP_VERSION: string;
const _APP_VERSION = APP_VERSION;

/**
 * Build type derived from webpack flags at compile time.
 * - "development" — `yarn start` (dev server)
 * - "beta" — `yarn build` (non-production extension build)
 * - "production" — `yarn build:production`
 */
declare const BUILD_TYPE: string;
const _BUILD_TYPE = BUILD_TYPE;

export const METRICS_PLATFORM = "WEB";

export {
  _AMPLITUDE_KEY as AMPLITUDE_KEY,
  _SENTRY_KEY as SENTRY_KEY,
  _APP_VERSION as APP_VERSION,
  _BUILD_TYPE as BUILD_TYPE,
};
