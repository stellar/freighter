import StellarSdk from "stellar-sdk";

import { SERVICE_TYPES } from "../constants/services";
import { sendMessageToBackground } from "../api/helpers/extensionMessaging";

const TESTNET = "Testnet";
const PUBNET = "Public net";

const _getIsTestnet = async () => {
  let isTestnet = false;
  try {
    ({ isTestnet } = await sendMessageToBackground({
      type: SERVICE_TYPES.LOAD_SETTINGS,
    }));
  } catch (e) {
    console.error(e);
  }

  return isTestnet;
};

export const getNetwork = async () =>
  (await _getIsTestnet()) ? "TESTNET" : "PUBLIC";

export const getNetworkName = async () =>
  (await _getIsTestnet()) ? TESTNET : PUBNET;

export const getOtherNetworkName = async () =>
  (await _getIsTestnet()) ? PUBNET : TESTNET;

export const getNetworkUrl = async () =>
  (await _getIsTestnet())
    ? "https://horizon-testnet.stellar.org"
    : "https://horizon.stellar.org";

export const getNetworkPassphrase = async () =>
  (await _getIsTestnet())
    ? StellarSdk.Networks.TESTNET
    : StellarSdk.Networks.PUBLIC;

export interface NetworkDetails {
  network: string;
  networkName: typeof PUBNET | typeof TESTNET;
  otherNetworkName: typeof PUBNET | typeof TESTNET;
  networkUrl: string;
  networkPassphrase:
    | typeof StellarSdk.Networks.TESTNET
    | typeof StellarSdk.Networks.PUBLIC;
}

export const getNetworkDetails = async (): Promise<NetworkDetails> => {
  const isTestnet = await _getIsTestnet();

  return {
    network: isTestnet ? "TESTNET" : "PUBLIC",
    networkName: isTestnet ? TESTNET : PUBNET,
    otherNetworkName: isTestnet ? PUBNET : TESTNET,
    networkUrl: isTestnet
      ? "https://horizon-testnet.stellar.org"
      : "https://horizon.stellar.org",
    networkPassphrase: isTestnet
      ? StellarSdk.Networks.TESTNET
      : StellarSdk.Networks.PUBLIC,
  };
};
