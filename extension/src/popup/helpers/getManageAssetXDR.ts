import * as StellarSdk from "stellar-sdk";
import * as StellarSdkNext from "stellar-sdk-next";
import { NetworkDetails } from "@shared/constants/stellar";
import { xlmToStroop } from "helpers/stellar";
import { getSdk } from "@shared/helpers/stellar";

export const getManageAssetXDR = async ({
  publicKey,
  assetCode,
  assetIssuer,
  addTrustline,
  server,
  recommendedFee,
  networkDetails,
}: {
  publicKey: string;
  assetCode: string;
  assetIssuer: string;
  addTrustline: boolean;
  server: StellarSdk.Horizon.Server | StellarSdkNext.Horizon.Server;
  recommendedFee: string;
  networkDetails: NetworkDetails;
}) => {
  const changeParams = addTrustline ? {} : { limit: "0" };
  const sourceAccount: StellarSdk.Account = await server.loadAccount(publicKey);

  const Sdk = getSdk(networkDetails.networkPassphrase);

  return new Sdk.TransactionBuilder(sourceAccount, {
    fee: xlmToStroop(recommendedFee).toFixed(),
    networkPassphrase: networkDetails.networkPassphrase,
  })
    .addOperation(
      Sdk.Operation.changeTrust({
        asset: new Sdk.Asset(assetCode, assetIssuer),
        ...changeParams,
      }),
    )
    .setTimeout(180)
    .build()
    .toXDR();
};
