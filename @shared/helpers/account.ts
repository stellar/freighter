import {
  FRIENDBOT_URLS,
  NetworkDetails,
  NETWORKS,
} from "@shared/constants/stellar";
import { FriendbotNotSupported } from "@shared/constants/errors";

export const getFriendbotUrl = (networkDetails: NetworkDetails) => {
  switch (networkDetails.network) {
    case NETWORKS.TESTNET:
      return FRIENDBOT_URLS.TESTNET;
    case "Futurenet":
      return FRIENDBOT_URLS.FUTURENET;
    case NETWORKS.PUBLIC:
    default:
      throw new FriendbotNotSupported();
  }
};
