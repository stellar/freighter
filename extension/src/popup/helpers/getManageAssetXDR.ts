import {
  Account,
  Asset,
  Horizon,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";
import { NetworkDetails } from "@shared/constants/stellar";
import { xlmToStroop } from "helpers/stellar";

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
  server: Horizon.Server;
  recommendedFee: string;
  networkDetails: NetworkDetails;
}) => {
  const changeParams = addTrustline ? {} : { limit: "0" };
  const sourceAccount: Account = await server.loadAccount(publicKey);

  return new TransactionBuilder(sourceAccount, {
    fee: xlmToStroop(recommendedFee).toFixed(),
    networkPassphrase: networkDetails.networkPassphrase,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(assetCode, assetIssuer),
        ...changeParams,
      }),
    )
    .setTimeout(180)
    .build()
    .toXDR();
};
