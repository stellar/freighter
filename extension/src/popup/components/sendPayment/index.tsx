import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import StellarSdk, { Asset } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";

import { AccountBalancesInterface } from "@shared/api/types";
import { signFreighterTransaction } from "popup/ducks/access";
import { AppDispatch } from "popup/App";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";

import { PopupWrapper } from "popup/basics/PopupWrapper";

import { BackButton } from "popup/basics/Buttons";

import "./styles.scss";

export const SendAmount = ({
  amount,
  setAmount,
  asset,
  setAsset,
  accountBalances,
}: {
  amount: string;
  setAmount: (state: string) => void;
  asset: string;
  setAsset: (state: string) => void;
  accountBalances: AccountBalancesInterface;
}) => {
  const [selectedAsset, setSelectedAsset] = useState({
    code: "",
    balance: "0",
    canonical: "",
  });

  useEffect(() => {
    if (accountBalances.balances) {
      setSelectedAsset({
        code: accountBalances.balances[asset].token.code,
        balance: accountBalances.balances[asset].total.toString(),
        canonical: asset,
      });
    } else {
      setSelectedAsset({
        code: "XLM",
        balance: "0",
        canonical: "native",
      });
    }
  }, [asset, accountBalances]);

  return (
    <PopupWrapper>
      <div className="SendAmount">
        <BackButton isPopup onClick={() => navigateTo(ROUTES.account)} />
        <div className="SendAmount__header">Send {selectedAsset.code}</div>
        <div className="SendAmount__asset-copy">
          <span>{selectedAsset.balance.toString()}</span>{" "}
          <span>{selectedAsset.code}</span> available
        </div>
        <button>set max</button>
        <input
          className="SendAmount__amount-input"
          type="text"
          placeholder="0.00"
          value={amount}
          onChange={(e: React.ChangeEvent<any>) => setAmount(e.target.value)}
        />
        <div className="SendAmount__asset-copy">{selectedAsset.code}</div>
        <select
          onChange={(e: React.ChangeEvent<any>) => setAsset(e.target.value)}
        >
          {accountBalances.balances &&
            Object.entries(accountBalances.balances).map(([k, v]) => (
              <option key={k} selected={k === asset} value={k}>
                {v.token.code}
              </option>
            ))}
        </select>
        <button onClick={() => navigateTo(ROUTES.sendPaymentTo)}>
          continue
        </button>
      </div>
    </PopupWrapper>
  );
};

export const SendTo = ({
  destination,
  setDestination,
}: {
  destination: string;
  setDestination: (state: string) => void;
}) => (
  <PopupWrapper>
    <div className="SendTo">
      <BackButton isPopup onClick={() => navigateTo(ROUTES.sendPayment)} />
      <div className="header">Send To</div>
      <input
        className="SendTo__input"
        value={destination}
        onChange={(e: React.ChangeEvent<any>) => setDestination(e.target.value)}
      />
      <div>Recent</div>
      <button onClick={() => navigateTo(ROUTES.sendPaymentSettings)}>
        continue
      </button>
    </div>
  </PopupWrapper>
);

export const SendSettings = ({
  transactionFee,
  setTransactionFee,
  memo,
  setMemo,
}: {
  transactionFee: string;
  setTransactionFee: (state: string) => void;
  memo: string;
  setMemo: (state: string) => void;
}) => (
  <PopupWrapper>
    <div className="SendSettings">
      <div className="header">Send Settings</div>
      <BackButton isPopup onClick={() => navigateTo(ROUTES.sendPaymentTo)} />
      <input
        className="SendTo__input"
        value={transactionFee}
        placeholder="transaction fee"
        onChange={(e: React.ChangeEvent<any>) =>
          setTransactionFee(e.target.value)
        }
      ></input>
      <input
        className="SendTo__input"
        value={memo}
        placeholder="memo"
        onChange={(e: React.ChangeEvent<any>) => setMemo(e.target.value)}
      ></input>
      <button onClick={() => navigateTo(ROUTES.sendPaymentConfirm)}>
        continue
      </button>
    </div>
  </PopupWrapper>
);

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
