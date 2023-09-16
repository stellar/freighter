import { getPublicKey } from "./getPublicKey";
import { signTransaction } from "./signTransaction";
import { signBlob } from "./signBlob";
import { signAuthEntry } from "./signAuthEntry";
import { isConnected } from "./isConnected";
import { getNetwork } from "./getNetwork";
import { getNetworkDetails } from "./getNetworkDetails";
import { isAllowed } from "./isAllowed";
import { setAllowed } from "./setAllowed";
import { getUserInfo } from "./getUserInfo";

export const isBrowser = typeof window !== "undefined";

export {
  getPublicKey,
  signTransaction,
  signBlob,
  signAuthEntry,
  isConnected,
  getNetwork,
  getNetworkDetails,
  isAllowed,
  setAllowed,
  getUserInfo,
};
export default {
  getPublicKey,
  signTransaction,
  signBlob,
  signAuthEntry,
  isConnected,
  getNetwork,
  getNetworkDetails,
  isAllowed,
  setAllowed,
  getUserInfo,
};
