import { NetworkDetails } from "@shared/constants/stellar";

export const CUSTOM_NETWORK = "STANDALONE";

export const isCustomNetwork = (networkDetails: NetworkDetails) => {
  const { network } = networkDetails;

  return network === CUSTOM_NETWORK;
};
