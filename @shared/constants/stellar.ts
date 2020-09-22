declare const PRODUCTION: boolean;

export const isTestnet = !PRODUCTION;

export const NETWORK = isTestnet ? "TESTNET" : "PUBLIC";

export const NETWORK_NAME = isTestnet ? "Testnet" : "Pubnet";

export const NETWORK_URL = isTestnet ?  "https://horizon-testnet.stellar.org" : "https://horizon.stellar.org";
