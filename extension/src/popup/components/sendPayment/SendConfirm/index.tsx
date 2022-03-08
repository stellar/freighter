import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import StellarSdk, { Asset } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";

import { signFreighterTransaction } from "popup/ducks/access";
import { AppDispatch } from "popup/App";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";

import { PopupWrapper } from "popup/basics/PopupWrapper";

import { BackButton } from "popup/basics/Buttons";

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
  console.log("amount:", amount);
  console.log("asset:", asset);
  console.log("destination:", destination);
  console.log("transactionFee:", transactionFee);
  console.log("memo:", memo);

  const dispatch: AppDispatch = useDispatch();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  // TODO - loading and success page
  const [isSuccessful, setIsSuccessful] = useState(false);

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
      const signed = StellarSdk.TransactionBuilder.fromXDR(
        res.payload.signedTransaction,
        networkDetails.networkPassphrase,
      );

      const submitRes = await server.submitTransaction(signed);
      console.log(submitRes);
      setIsSuccessful(true);
      return;
    }

    // TODO - error page
    console.error("send failed");
  };

  return (
    <PopupWrapper>
      <div className="SendConfirm">
        <BackButton
          isPopup
          onClick={() => navigateTo(ROUTES.sendPaymentSettings)}
        />
        <div className="header">Send Confirm</div>
        <div>amount: {amount}</div>
        <div>asset: {asset}</div>
        <div>destination: {destination}</div>
        <div>transactionFee: {transactionFee}</div>
        <div>memo: {memo}</div>
        <button>cancel</button>
        <button onClick={handleSend}>send</button>
      </div>
      <span>{isSuccessful && "success"}</span>
    </PopupWrapper>
  );
};
