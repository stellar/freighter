import { requestNetwork } from "@shared/api/external";
import { isBrowser } from ".";

export const getNetwork = (): Promise<string> =>
  isBrowser ? requestNetwork() : Promise.resolve("");
