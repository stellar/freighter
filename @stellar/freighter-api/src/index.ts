import { getPublicKey } from "./getPublicKey";
import { signTransaction } from "./signTransaction";
import { isConnected } from "./isConnected";
import { getNetwork } from "./getNetwork";

export { getPublicKey, signTransaction, isConnected, getNetwork };
export default { getPublicKey, signTransaction, isConnected, getNetwork };

window.freighterApi = {
  getPublicKey,
  signTransaction,
  isConnected,
  getNetwork,
};
