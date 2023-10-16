import { requestNetworkDetails } from "@shared/api/external";
import { isBrowser } from ".";

export const getNetworkDetails = (): Promise<{
  network: string;
  networkUrl: string;
  networkPassphrase: string;
  sorobanRpcUrl?: string;
}> =>
  isBrowser
    ? requestNetworkDetails()
    : Promise.resolve({
        network: "",
        networkUrl: "",
        networkPassphrase: "",
        sorobanRpcUrl: "",
      });
