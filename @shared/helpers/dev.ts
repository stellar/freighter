import { DEV_EXTENSION } from "@shared/constants/services";

/**
 * Constant indicating if the current environment is a development environment
 */
export const isDev = DEV_EXTENSION === "true" || !process.env.PRODUCTION;
