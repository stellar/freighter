import React from "react";

import { useDispatch, useSelector } from "react-redux";

import StellarSdk, { Asset } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";

import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import {
  signFreighterTransaction,
  submitFreighterTransaction,
} from "popup/ducks/internalTransaction";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { BackButton } from "popup/basics/BackButton";

export const TransactionDetails = ({
  publicKey,
  amount,
  asset,
  destination,
  transactionFee,
  memo,
  isSendComplete,
}: {
  publicKey: string;
  amount: string;
  asset: string;
  destination: string;
  transactionFee: string;
  memo: string;
  isSendComplete: boolean;
}) => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const dispatch: AppDispatch = useDispatch();

  // handles signing and submitting
  const handleSend = async () => {
    const server = new StellarSdk.Server(networkDetails.networkUrl);

    let horizonAsset: Asset;
    if (asset === "native") {
      horizonAsset = StellarSdk.Asset.native();
    } else {
      horizonAsset = new StellarSdk.Asset(
        asset.split(":")[0],
        asset.split(":")[1],
      );
    }

    const transactionXDR = await server
      .loadAccount(publicKey)
      .then((sourceAccount: Types.Account) => {
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: transactionFee,
          networkPassphrase: networkDetails.networkPassphrase,
        })
          .addOperation(
            StellarSdk.Operation.payment({
              destination,
              asset: horizonAsset,
              amount,
            }),
          )
          .addMemo(StellarSdk.Memo.text(memo))
          .setTimeout(180)
          .build();

        return transaction.toXDR();
      });

    const res = await dispatch(
      signFreighterTransaction({
        transactionXDR,
        network: networkDetails.networkPassphrase,
      }),
    );

    if (signFreighterTransaction.fulfilled.match(res)) {
      const signedXDR = StellarSdk.TransactionBuilder.fromXDR(
        res.payload.signedTransaction,
        networkDetails.networkPassphrase,
      );

      await dispatch(
        submitFreighterTransaction({
          signedXDR,
          networkUrl: networkDetails.networkUrl,
        }),
      );
    }
  };

  return (
    <div className="SendConfirm">
      {isSendComplete ? (
        <button onClick={() => navigateTo(ROUTES.account)}>Close</button>
      ) : (
        <BackButton hasBackCopy />
      )}
      <div className="header">Send Confirm</div>
      <div>amount: {amount}</div>
      <div>asset: {asset}</div>
      <div>destination: {destination}</div>
      <div>transactionFee: {transactionFee}</div>
      <div>memo: {memo}</div>
      {isSendComplete ? (
        <button>View on Stellar.expert</button>
      ) : (
        <>
          <button>cancel</button>
          <button onClick={handleSend}>send</button>
        </>
      )}
    </div>
  );
};
