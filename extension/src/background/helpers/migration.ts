import {
  Asset,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";
import { Horizon as HorizonNext } from "stellar-sdk-next";
import { submitTx } from "@shared/api/helpers/stellarSdkServer";
import BigNumber from "bignumber.js";

interface MigrateTrustLinesParams {
  trustlineBalances: Horizon.HorizonApi.BalanceLine[];
  server: Horizon.Server | HorizonNext.Server;
  sourceAccount: Horizon.AccountResponse | HorizonNext.AccountResponse;
  sourceKeys: Keypair;
  newKeyPair: { publicKey: string; privateKey: string };
  fee: string;
  isMergeSelected: boolean;
  networkPassphrase: string;
}

/*
  Migrating a trustline from one account is done in 2 separate transactions:
  1. Add the trustline to the destination account
  2. Send the entire trustline balance from the source account to the destination account
  3. (Optional) If we want to later merge the source account, we need to remove the trustline after sending the balance

  We repeat for every trustline
*/

export const migrateTrustlines = async ({
  trustlineBalances,
  server,
  newKeyPair,
  fee,
  sourceAccount,
  sourceKeys,
  isMergeSelected,
  networkPassphrase,
}: MigrateTrustLinesParams) => {
  if (!trustlineBalances.length) {
    return;
  }

  const trustlineRecipientAccount = await server.loadAccount(
    newKeyPair.publicKey,
  );
  const txFee = new BigNumber(fee).times(trustlineBalances.length).toString();

  const changeTrustTx = new TransactionBuilder(trustlineRecipientAccount, {
    fee: txFee,
    networkPassphrase,
  });

  const removeTrustTx = new TransactionBuilder(sourceAccount, {
    fee: txFee,
    networkPassphrase,
  });

  const sendTrustlineBalanceTx = new TransactionBuilder(sourceAccount, {
    fee: txFee,
    networkPassphrase,
  });

  const recipientSourceKeys = Keypair.fromSecret(newKeyPair.privateKey);

  for (let i = 0; i < trustlineBalances.length; i += 1) {
    const bal = trustlineBalances[i];
    let asset;
    if ("asset_code" in bal && "asset_issuer" in bal) {
      asset = new Asset(bal.asset_code, bal.asset_issuer);

      changeTrustTx.addOperation(
        Operation.changeTrust({
          asset,
        }),
      );

      if (new BigNumber(bal.balance).gt("0")) {
        sendTrustlineBalanceTx.addOperation(
          Operation.payment({
            destination: newKeyPair.publicKey,
            asset,
            amount: bal.balance,
          }),
        );
      }

      if (isMergeSelected) {
        // remove the trustline from the source account
        removeTrustTx.addOperation(
          Operation.changeTrust({
            asset,
            limit: "0",
          }),
        );
      }
    }
  }

  const builtChangeTrustTx = changeTrustTx.setTimeout(180).build();
  const builtSendTrustlineBalanceTx = sendTrustlineBalanceTx
    .setTimeout(180)
    .build();

  try {
    builtChangeTrustTx.sign(recipientSourceKeys);
  } catch (e) {
    console.error(e);
  }

  await submitTx({ server, tx: builtChangeTrustTx });

  try {
    builtSendTrustlineBalanceTx.sign(sourceKeys);
  } catch (e) {
    console.error(e);
  }

  await submitTx({ server, tx: builtSendTrustlineBalanceTx });

  if (isMergeSelected) {
    const builtRemoveTrustTx = removeTrustTx.setTimeout(180).build();
    builtRemoveTrustTx.sign(sourceKeys);

    await submitTx({ server, tx: builtRemoveTrustTx });
  }
};
