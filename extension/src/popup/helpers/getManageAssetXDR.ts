import * as StellarSdk from "stellar-sdk";
import * as StellarSdkNext from "stellar-sdk-next";
import { NetworkDetails } from "@shared/constants/stellar";
import { xlmToStroop } from "helpers/stellar";
import { getSdk } from "@shared/helpers/stellar";

export type AnySdk = typeof StellarSdk | typeof StellarSdkNext;

export const buildChangeTrustOperation = ({
  assetCode,
  assetIssuer,
  isRemove = false,
  sdk,
}: {
  assetCode: string;
  assetIssuer: string;
  isRemove?: boolean;
  sdk: AnySdk;
}) => {
  const changeParams = isRemove ? { limit: "0" } : {};
  return sdk.Operation.changeTrust({
    asset: new sdk.Asset(assetCode, assetIssuer),
    ...changeParams,
  });
};

export const getManageAssetXDR = async ({
  publicKey,
  assetCode,
  assetIssuer,
  addTrustline,
  server,
  recommendedFee,
  networkDetails,
  timeout = 180,
  memo,
}: {
  publicKey: string;
  assetCode: string;
  assetIssuer: string;
  addTrustline: boolean;
  server: StellarSdk.Horizon.Server | StellarSdkNext.Horizon.Server;
  recommendedFee: string;
  networkDetails: NetworkDetails;
  timeout?: number;
  memo?: string;
}) => {
  const sourceAccount = await server.loadAccount(publicKey);

  const Sdk = getSdk(networkDetails.networkPassphrase);

  const tx = new Sdk.TransactionBuilder(sourceAccount, {
    fee: xlmToStroop(recommendedFee).toFixed(),
    networkPassphrase: networkDetails.networkPassphrase,
  })
    .addOperation(
      buildChangeTrustOperation({
        assetCode,
        assetIssuer,
        isRemove: !addTrustline,
        sdk: Sdk,
      }),
    )
    .setTimeout(timeout);

  if (memo) {
    tx.addMemo(Sdk.Memo.text(memo));
  }

  return tx.build().toXDR();
};
