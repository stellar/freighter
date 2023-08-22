import { submitAuthEntry } from "@shared/api/external";
import { isBrowser } from ".";

export const signAuthEntry = (
  entryXdr: string,
  opts?: {
    accountToSign?: string;
  }
): Promise<string> =>
  isBrowser ? submitAuthEntry(entryXdr, opts) : Promise.resolve("");
