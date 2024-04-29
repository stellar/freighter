import { requestAccess as requestAccessApi } from "@shared/api/external";
import { isBrowser } from ".";

export const requestAccess = (): Promise<string> =>
  isBrowser ? requestAccessApi() : Promise.resolve("");
