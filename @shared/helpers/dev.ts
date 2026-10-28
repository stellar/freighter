import { DEV_EXTENSION } from "@shared/constants/services";

/**
 * True in development builds (the webpack dev server and `yarn
 * build:extension`), false in production builds (`build:extension:production`,
 * used for every store, beta and PR-preview build).
 *
 * Reads only DEV_EXTENSION, which webpack defines as a boolean. Don't add
 * `process.env.PRODUCTION`: no build sets it, and dotenv-webpack compiles it
 * to `undefined`, which would make isDev true in production.
 */
export const isDev = DEV_EXTENSION === true;
