import { getAddress } from "./getAddress";
import { getPublicKey } from "./getPublicKey";
import { signTransaction } from "./signTransaction";
import { signMessage } from "./signMessage";
import { signAuthEntry } from "./signAuthEntry";
import { isConnected } from "./isConnected";
import { getNetwork } from "./getNetwork";
import { getNetworkDetails } from "./getNetworkDetails";
import { isAllowed } from "./isAllowed";
import { setAllowed } from "./setAllowed";
import { getUserInfo } from "./getUserInfo";
import { requestAccess } from "./requestAccess";

export const isBrowser = typeof window !== "undefined";

export {
  getAddress,
  getPublicKey,
  signTransaction,
  signMessage,
  signAuthEntry,
  isConnected,
  getNetwork,
  getNetworkDetails,
  isAllowed,
  setAllowed,
  getUserInfo,
  requestAccess,
};
export default {
  getAddress,
  getPublicKey,
  signTransaction,
  signMessage,
  signAuthEntry,
  isConnected,
  getNetwork,
  getNetworkDetails,
  isAllowed,
  setAllowed,
  getUserInfo,
  requestAccess,
};
