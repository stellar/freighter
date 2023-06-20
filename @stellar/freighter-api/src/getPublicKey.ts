import { requestPublicKey } from "@shared/api/external";
import { isBrowser } from ".";

export const getPublicKey = (): Promise<string> =>
  isBrowser ? requestPublicKey() : Promise.resolve("");
