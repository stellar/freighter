import { requestPublicKey } from "@shared/api/external";
import { requestNetworkDetails } from "@shared/api/external";
import { FreighterApiNodeError } from "@shared/api/helpers/extensionMessaging";
import { FreighterApiError } from "@shared/api/types";
import { isBrowser } from ".";

interface CallbackParams {
  address: string;
  network: string;
  networkPassphrase: string;
  error?: FreighterApiError;
}

export class WatchWalletChanges {
  timeout: number;
  currentAddress: string;
  currentNetwork: string;
  currentNetworkPassphrase: string;
  isRunning: boolean;

  constructor(timeout = 3000) {
    this.timeout = timeout;
    this.currentAddress = "";
    this.currentNetwork = "";
    this.currentNetworkPassphrase = "";
    this.isRunning = false;
  }

  watch(cb: (params: CallbackParams) => void): { error?: FreighterApiError } {
    if (!isBrowser) {
      return { error: FreighterApiNodeError };
    }
    this.isRunning = true;
    this.fetchInfo(cb);

    return {};
  }

  fetchInfo = async (cb: (params: CallbackParams) => void) => {
    if (!this.isRunning) {
      return;
    }
    const publicKeyReq = await requestPublicKey();
    const networkDetailsReq = await requestNetworkDetails();

    if (publicKeyReq.error || networkDetailsReq.error) {
      cb({
        address: "",
        network: "",
        networkPassphrase: "",
        error: publicKeyReq.error || networkDetailsReq.error,
      });
    }

    if (
      this.currentAddress !== publicKeyReq.publicKey ||
      this.currentNetwork !== networkDetailsReq.network ||
      this.currentNetworkPassphrase !== networkDetailsReq.networkPassphrase
    ) {
      this.currentAddress = publicKeyReq.publicKey;
      this.currentNetwork = networkDetailsReq.network;
      this.currentNetworkPassphrase = networkDetailsReq.networkPassphrase;

      cb({
        address: publicKeyReq.publicKey,
        network: networkDetailsReq.network,
        networkPassphrase: networkDetailsReq.networkPassphrase,
      });
    }

    setTimeout(() => this.fetchInfo(cb), this.timeout);
  };

  stop() {
    this.isRunning = false;
  }
}
