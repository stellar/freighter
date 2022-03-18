import React from "react";

import { useDispatch, useSelector } from "react-redux";

import StellarSdk, { Asset } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";
import { Loader } from "@stellar/design-system";

import { xlmToStroop } from "helpers/stellar";
import { AppDispatch } from "popup/App";
import {
  ActionStatus,
  signFreighterTransaction,
  submitFreighterTransaction,
  addRecentAddress,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { openTab } from "popup/helpers/navigate";
import { BackButton } from "popup/basics/BackButton";

export const TransactionDetails = ({
  isSendComplete = false,
}: {
  isSendComplete?: boolean;
}) => {
  const submission = useSelector(transactionSubmissionSelector);
  const {
    destination,
    amount,
    asset,
    memo,
    transactionFee,
  } = submission.transactionData;
  const transactionHash = submission.response?.hash;
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  // ALEC TODO - move to helper? (used in views/AccountHistory as well)
  const stellarExpertURL = `https://stellar.expert/explorer/${
    networkDetails.isTestnet ? "testnet" : "public"
  }/tx/${transactionHash}`;

  const dispatch: AppDispatch = useDispatch();

  // handles signing and submitting
  const handleSend = async () => {
    // ALEC TODO - remove
    console.log({ destination });
    console.log({ amount });
    console.log({ asset });
    console.log({ memo });
    console.log({ transactionFee });

    const server = new StellarSdk.Server(networkDetails.networkUrl);

    let horizonAsset: Asset;
    if (asset === StellarSdk.Asset.native().toString()) {
      horizonAsset = StellarSdk.Asset.native();
    } else {
      horizonAsset = new StellarSdk.Asset(
        asset.split(":")[0],
        asset.split(":")[1],
      );
    }

    try {
      const transactionXDR = await server
        .loadAccount(publicKey)
        .then((sourceAccount: Types.Account) => {
          const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: xlmToStroop(transactionFee).toString(),
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

      // ALEC TODO - remove
      console.log({ transactionXDR });

      const res = await dispatch(
        signFreighterTransaction({
          transactionXDR,
          network: networkDetails.networkPassphrase,
        }),
      );

      // ALEC TODO - remove
      console.log({ res });

      // ALEC TODO - what to do when payload.signedTransaction comes back null
      if (
        signFreighterTransaction.fulfilled.match(res) &&
        res.payload.signedTransaction
      ) {
        const signedXDR = StellarSdk.TransactionBuilder.fromXDR(
          res.payload.signedTransaction,
          networkDetails.networkPassphrase,
        );

        const submitResp = await dispatch(
          submitFreighterTransaction({
            signedXDR,
            networkUrl: networkDetails.networkUrl,
          }),
        );

        if (submitFreighterTransaction.fulfilled.match(submitResp)) {
          await dispatch(addRecentAddress({ publicKey: destination }));
        }
      }
    } catch (e) {
      // ALEC TODO - figure out what to do with error
      console.error(e);
    }
  };

  return (
    <div className="SendConfirm">
      {submission.status === ActionStatus.PENDING && (
        <div className="SendConfirm__proccessing">
          <Loader /> <span>Processing transaction</span>
        </div>
      )}
      <BackButton />
      <div className="header">Send Confirm</div>
      <div>amount: {amount}</div>
      <div>asset: {asset}</div>
      <div>destination: {destination}</div>
      <div>transactionFee: {transactionFee}</div>
      <div>memo: {memo}</div>
      {isSendComplete ? (
        <button onClick={() => openTab(stellarExpertURL)}>
          View on Stellar.expert
        </button>
      ) : (
        <>
          <button>cancel</button>
          <button onClick={handleSend}>send</button>
        </>
      )}
    </div>
  );
};
