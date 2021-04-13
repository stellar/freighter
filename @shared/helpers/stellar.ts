import StellarSdk from "stellar-sdk";
import { NETWORKS, NETWORK_NAMES } from "../constants/stellar";

export interface NetworkDetails {
  isTestnet: boolean;
  network: string;
  networkName: string;
  otherNetworkName: string;
  networkUrl: string;
  networkPassphrase:
    | typeof StellarSdk.Networks.TESTNET
    | typeof StellarSdk.Networks.PUBLIC;
}

export const MAINNET_NETWORK_DETAILS = {
  isTestnet: false,
  network: NETWORKS.PUBLIC,
  networkName: NETWORK_NAMES.PUBNET,
  otherNetworkName: NETWORK_NAMES.TESTNET,
  networkUrl: "https://horizon.stellar.org",
  networkPassphrase: StellarSdk.Networks.PUBLIC,
} as NetworkDetails;

export const TESTNET_NETWORK_DETAILS = {
  isTestnet: true,
  network: NETWORKS.TESTNET,
  networkName: NETWORK_NAMES.TESTNET,
  otherNetworkName: NETWORK_NAMES.PUBNET,
  networkUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: StellarSdk.Networks.TESTNET,
} as NetworkDetails;

export const getNetworkDetails = (isTestnet: boolean) =>
  isTestnet ? { ...TESTNET_NETWORK_DETAILS } : { ...MAINNET_NETWORK_DETAILS };
