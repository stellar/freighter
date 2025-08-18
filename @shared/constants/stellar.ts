import { Networks } from "stellar-sdk";

export enum NETWORK_NAMES {
  TESTNET = "Test Net",
  PUBNET = "Main Net",
  FUTURENET = "Future Net",
}

export enum NETWORKS {
  PUBLIC = "PUBLIC",
  TESTNET = "TESTNET",
  FUTURENET = "FUTURENET",
}

export enum NETWORK_URLS {
  PUBLIC = "https://horizon.stellar.org",
  TESTNET = "https://horizon-testnet.stellar.org",
  FUTURENET = "https://horizon-futurenet.stellar.org",
}

export enum FRIENDBOT_URLS {
  TESTNET = "https://friendbot.stellar.org",
  FUTURENET = "https://friendbot-futurenet.stellar.org",
}

export const SOROBAN_RPC_URLS: { [key in NETWORKS]: string } = {
  [NETWORKS.PUBLIC]:
    "http://soroban-rpc-pubnet-prd.soroban-rpc-pubnet-prd.svc.cluster.local:8000",
  [NETWORKS.TESTNET]: "https://soroban-testnet.stellar.org/",
  [NETWORKS.FUTURENET]: "https://rpc-futurenet.stellar.org/",
};

export interface NetworkDetails {
  network: string;
  networkName: string;
  networkUrl: string;
  // TODO: Should be Networks
  networkPassphrase: string;
  friendbotUrl?: string;
  sorobanRpcUrl?: string;
}

export const MAINNET_NETWORK_DETAILS: NetworkDetails = {
  network: NETWORKS.PUBLIC,
  networkName: NETWORK_NAMES.PUBNET,
  networkUrl: NETWORK_URLS.PUBLIC,
  networkPassphrase: Networks.PUBLIC,
  sorobanRpcUrl: SOROBAN_RPC_URLS.PUBLIC,
};

export const TESTNET_NETWORK_DETAILS: NetworkDetails = {
  network: NETWORKS.TESTNET,
  networkName: NETWORK_NAMES.TESTNET,
  networkUrl: NETWORK_URLS.TESTNET,
  networkPassphrase: Networks.TESTNET,
  sorobanRpcUrl: SOROBAN_RPC_URLS[NETWORKS.TESTNET],
  friendbotUrl: FRIENDBOT_URLS.TESTNET,
};

export const FUTURENET_NETWORK_DETAILS: NetworkDetails = {
  network: NETWORKS.FUTURENET,
  networkName: NETWORK_NAMES.FUTURENET,
  networkUrl: NETWORK_URLS.FUTURENET,
  networkPassphrase: "Test SDF Future Network ; October 2022",
  sorobanRpcUrl: SOROBAN_RPC_URLS[NETWORKS.FUTURENET],
  friendbotUrl: FRIENDBOT_URLS.FUTURENET,
};

export const DEFAULT_NETWORKS: Array<NetworkDetails> = [
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
];

export const BASE_RESERVE = 0.5 as const;
export const BASE_RESERVE_MIN_COUNT = 2 as const;
