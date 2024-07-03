import { requestPublicKey } from "@shared/api/external";
import { isBrowser } from ".";

export const getPublicKey = async (): Promise<string> =>
  isBrowser ? (await requestPublicKey()).publicKey : Promise.resolve("");
