import { getAddress } from "./getAddress";
import { addToken } from "./addToken";
import { signTransaction } from "./signTransaction";
import { signMessage } from "./signMessage";
import { signAuthEntry } from "./signAuthEntry";
import { isConnected } from "./isConnected";
import { getNetwork } from "./getNetwork";
import { getNetworkDetails } from "./getNetworkDetails";
import { isAllowed } from "./isAllowed";
import { setAllowed } from "./setAllowed";
import { requestAccess } from "./requestAccess";
import { WatchWalletChanges } from "./watchWalletChanges";

export const isBrowser = typeof window !== "undefined";

export {
  getAddress,
  addToken,
  signTransaction,
  signMessage,
  signAuthEntry,
  isConnected,
  getNetwork,
  getNetworkDetails,
  isAllowed,
  setAllowed,
  requestAccess,
  WatchWalletChanges,
};
export default {
  getAddress,
  addToken,
  signTransaction,
  signMessage,
  signAuthEntry,
  isConnected,
  getNetwork,
  getNetworkDetails,
  isAllowed,
  setAllowed,
  requestAccess,
  WatchWalletChanges,
};
