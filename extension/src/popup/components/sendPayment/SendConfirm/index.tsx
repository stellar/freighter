import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import StellarSdk, { Asset } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import {
  signFreighterTransaction,
  submitFreighterTransaction,
  ActionStatus,
  transactionSubmissionSelector,
} from "popup/ducks/internalTransaction";
import { AppDispatch } from "popup/App";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { PopupWrapper } from "popup/basics/PopupWrapper";
import { BackButton } from "popup/basics/BackButton";

import { SubmitFail, SubmitPending, SubmitSuccess } from "./SubmitResult";

import "../styles.scss";

export const SendConfirm = ({
  publicKey,
  amount,
  asset,
  destination,
  transactionFee,
  memo,
}: {
  publicKey: string;
  amount: string;
  asset: string;
  destination: string;
  transactionFee: string;
  memo: string;
}) => {
  const dispatch: AppDispatch = useDispatch();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const submission = useSelector(transactionSubmissionSelector);
  const [isViewOnly, setIsViewOnly] = useState(false);

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

  const TransactionDetails = () => (
    <div className="SendConfirm">
      {isViewOnly ? (
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
      {isViewOnly ? (
        <button>View on Stellar.expert</button>
      ) : (
        <>
          <button>cancel</button>
          <button onClick={handleSend}>send</button>
        </>
      )}
    </div>
  );

  const render = () => {
    if (isViewOnly) {
      return <TransactionDetails />;
    }
    switch (submission.status) {
      case ActionStatus.IDLE:
        return <TransactionDetails />;
      case ActionStatus.PENDING:
        return <SubmitPending />;
      case ActionStatus.SUCCESS:
        return (
          <SubmitSuccess
            amount={amount}
            asset={asset}
            destination={destination}
            viewDetails={() => setIsViewOnly(true)}
          />
        );
      case ActionStatus.ERROR:
        return <SubmitFail destination={destination} />;
      default:
        return <TransactionDetails />;
    }
  };

  return <PopupWrapper>{render()}</PopupWrapper>;
};
