import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";

interface MigrateTrustLinesParams {
  trustlineBalances: Horizon.HorizonApi.BalanceLine[];
  server: Horizon.Server;
  sourceAccount: Horizon.AccountResponse;
  sourceKeys: Keypair;
  newKeyPair: { publicKey: string; privateKey: string };
  fee: string;
}

/*
  Migrating a trustline from one account is done in 2 separate transactions:
  1. Add the trustline to the destination account
  2. Send the entire trustline balance from the source account to the destination account

  We repeat for every trustline
*/

export const migrateTrustlines = async ({
  trustlineBalances,
  server,
  newKeyPair,
  fee,
  sourceAccount,
  sourceKeys,
}: MigrateTrustLinesParams) => {
  if (!trustlineBalances.length) return;

  // eslint-disable-next-line no-await-in-loop
  const trustlineRecipientAccount = await server.loadAccount(
    newKeyPair.publicKey,
  );

  // eslint-disable-next-line no-await-in-loop
  const changeTrustTx = await new TransactionBuilder(
    trustlineRecipientAccount,
    {
      fee,
      networkPassphrase: Networks.TESTNET,
    },
  );

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
    }

    const recipientSourceKeys = Keypair.fromSecret(newKeyPair.privateKey);
    const builtChangeTrustTx = changeTrustTx.setTimeout(180).build();

    try {
      builtChangeTrustTx.sign(recipientSourceKeys);
    } catch (e) {
      console.error(e);
    }

    // eslint-disable-next-line no-await-in-loop
    await server.submitTransaction(builtChangeTrustTx);

    if (asset) {
      // trustline established, send the balance from source account to new account
      // eslint-disable-next-line no-await-in-loop
      const sendTrustlineBalanceTx = await new TransactionBuilder(
        sourceAccount,
        {
          fee,
          networkPassphrase: Networks.TESTNET,
        },
      );

      sendTrustlineBalanceTx.addOperation(
        Operation.payment({
          destination: newKeyPair.publicKey,
          asset,
          amount: bal.balance,
        }),
      );

      const builtSendTrustlineBalanceTx = sendTrustlineBalanceTx
        .setTimeout(180)
        .build();

      try {
        builtSendTrustlineBalanceTx.sign(sourceKeys);
      } catch (e) {
        console.error(e);
      }

      // eslint-disable-next-line no-await-in-loop
      await server.submitTransaction(builtSendTrustlineBalanceTx);
    }
  }
};
