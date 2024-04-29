import {
  NetworkDetails,
  NETWORKS,
  SOROBAN_RPC_URLS,
} from "../../constants/stellar";

export const getSorobanRpcUrl = (networkDetails: NetworkDetails) => {
  let sorobanRpcUrl;

  switch (networkDetails.network) {
    case NETWORKS.FUTURENET:
      sorobanRpcUrl = SOROBAN_RPC_URLS[NETWORKS.FUTURENET];
      break;
    case NETWORKS.TESTNET:
      sorobanRpcUrl = SOROBAN_RPC_URLS[NETWORKS.TESTNET];
      break;
    case NETWORKS.PUBLIC:
      sorobanRpcUrl = SOROBAN_RPC_URLS[NETWORKS.PUBLIC];
      break;
    default:
      sorobanRpcUrl = "";
  }

  return sorobanRpcUrl;
};
