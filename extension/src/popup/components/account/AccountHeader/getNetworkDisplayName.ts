import { NETWORK_NAMES } from "@shared/constants/stellar";

interface NetworkDisplayNames {
  mainnet: string;
  testnet: string;
  futurenet: string;
}

export const getNetworkDisplayName = (
  networkName: string,
  displayNames: NetworkDisplayNames,
) => {
  switch (networkName) {
    case NETWORK_NAMES.PUBNET:
      return displayNames.mainnet;
    case NETWORK_NAMES.TESTNET:
      return displayNames.testnet;
    case NETWORK_NAMES.FUTURENET:
      return displayNames.futurenet;
    default:
      return networkName;
  }
};
