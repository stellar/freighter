declare const PRODUCTION: boolean;

export const isTestnet = !PRODUCTION;

export const NETWORK = isTestnet ? "TESTNET" : "PUBLIC";

export const NETWORK_NAME = isTestnet ? "Testnet" : "Pubnet";

export const NETWORK_URL = isTestnet
  ? "https://horizon-testnet.stellar.org"
  : "https://horizon.stellar.org";

export const NETWORK_PASSPHRASE = isTestnet
  ? "Test SDF Network ; September 2015"
  : "Public Global Stellar Network ; September 2015";
