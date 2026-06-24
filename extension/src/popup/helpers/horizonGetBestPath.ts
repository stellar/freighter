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

// Reverse path-find: how much of `sourceAsset` to send to RECEIVE
// `destinationAmount` of `destAsset`. Used by the XLM-reserve sheet to
// pre-fill a "swap for ~0.5 XLM" amount.
export const horizonGetBestReceivePath = async ({
  destinationAmount,
  sourceAsset,
  destAsset,
  networkDetails,
}: {
  destinationAmount: string;
  sourceAsset: string;
  destAsset: string;
  networkDetails: NetworkDetails;
}) => {
  const server = new Horizon.Server(networkDetails.networkUrl);
  const builder = server.strictReceivePaths(
    [getAssetFromCanonical(sourceAsset)] as Asset[],
    getAssetFromCanonical(destAsset) as Asset,
    cleanAmount(destinationAmount),
  );

  const paths = await builder.call();
  return paths.records[0];
};
