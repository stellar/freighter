import { submitBlob } from "@shared/api/external";
import { isBrowser } from ".";

export const signBlob = (
  blob: string,
  opts?: {
    accountToSign?: string;
  }
): Promise<string> =>
  isBrowser ? submitBlob(blob, opts) : Promise.resolve("");
