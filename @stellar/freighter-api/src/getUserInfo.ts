import { requestUserInfo } from "@shared/api/external";
import { isBrowser } from ".";

export const getUserInfo = (): Promise<{ publicKey: string }> =>
  isBrowser ? requestUserInfo() : Promise.resolve({ publicKey: "" });
