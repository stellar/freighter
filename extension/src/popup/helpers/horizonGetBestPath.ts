import { Asset, Horizon } from "stellar-sdk";
import { getAssetFromCanonical } from "helpers/stellar";
import { NetworkDetails } from "@shared/constants/stellar";
import { cleanAmount } from "./formatters";

export const horizonGetBestPath = async ({
  amount,
  sourceAsset,
  destAsset,
  networkDetails,
}: {
  amount: string;
  sourceAsset: string;
  destAsset: string;
  networkDetails: NetworkDetails;
}) => {
  const server = new Horizon.Server(networkDetails.networkUrl);
  const builder = server.strictSendPaths(
    getAssetFromCanonical(sourceAsset) as Asset,
    cleanAmount(amount),
    [getAssetFromCanonical(destAsset)] as Asset[],
  );

  const paths = await builder.call();
  return paths.records[0];
};
