import StellarSdk from "stellar-sdk";

declare const PRODUCTION: boolean;

const TESTNET = "Testnet";
const PUBNET = "Public net";

export const isTestnet = !PRODUCTION;

export const NETWORK = isTestnet ? "TESTNET" : "PUBLIC";

export const NETWORK_NAME = isTestnet ? TESTNET : PUBNET;

export const OTHER_NETWORK_NAME = !isTestnet ? TESTNET : PUBNET;

export const NETWORK_URL = isTestnet
  ? "https://horizon-testnet.stellar.org"
  : "https://horizon.stellar.org";

export const NETWORK_PASSPHRASE = isTestnet
  ? StellarSdk.Networks.TESTNET
  : StellarSdk.Networks.PUBLIC;
