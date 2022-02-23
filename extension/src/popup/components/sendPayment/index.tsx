// ALEC TODO - capitalize file
import React from "react";

import { useSelector } from "react-redux";

import StellarSdk from "stellar-sdk";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { publicKeySelector } from "popup/ducks/accountServices";

import { submitTransactionNoPrompt } from "@shared/api/external";
import { NETWORKS } from "@shared/constants/stellar";

import "./styles.scss";

export const SendAmount = ({
  amount,
  setAmount,
  asset,
  setAsset,
}: {
  amount: string;
  // ALEC TODO - any
  setAmount: any;
  asset: string;
  // ALEC TODO - any
  setAsset: any;
}) => {
  // ALEC TODO - remove
  setAmount();
  setAsset();
  console.log(amount);
  console.log(asset);

  const handleContinue = () => {
    // save data

    // ALEC TODO - move to constants
    navigateTo("/sendPayment/to" as ROUTES);
  };

  return (
    <>
      <button onClick={() => navigateTo(ROUTES.account)}>back</button>
      {/* ALEC TODO - support non xlm assets */}
      <div>Send XLM</div>
      <button>set max</button>
      <input type="text" placeholder="0.00" />
      <div>{asset}</div>
      <div>choose asset</div>
      {/* ALEC TODO move to constants */}

      <button onClick={handleContinue}>continue</button>
    </>
  );
};

export const SendTo = () => (
  <>
    <div>send to</div>
    <button onClick={() => navigateTo("/sendPayment/settings" as ROUTES)}>
      continue
    </button>
  </>
);

export const SendSettings = () => (
  <>
    <div>send settings</div>
    <button onClick={() => navigateTo("/sendPayment/confirm" as ROUTES)}>
      continue
    </button>
  </>
);

export const SendConfirm = () => {
  const publicKey = useSelector(publicKeySelector);

  // ALEC TODO - move to form, obviously
  // ALEC TODO - support non native
  const amount = "100";
  const destination =
    "GBMPTWD752SEBXPN4OF6A6WEDVNB4CJY4PR63J5L6OOYR3ISMG3TA6JZ";
  const transactionFee = "100";
  const memo = "memo here";

  function handleSend() {
    console.log("sending ...");

    const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");

    let xdr = "";

    // ALEC TODO - any
    server.loadAccount(publicKey).then(async (sourceAccount: any) => {
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: transactionFee,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: destination,
            asset: StellarSdk.Asset.native(),
            amount: amount,
          }),
        )
        .addMemo(StellarSdk.Memo.text(memo))
        .setTimeout(180)
        .build();

      console.log(transaction);

      xdr = transaction.toXDR();
      console.log(xdr);

      let resp = await submitTransactionNoPrompt(xdr, NETWORKS.TESTNET);
      console.log(resp);
    });
  }

  return (
    <>
      <div>send confirm</div>
      <button
        onClick={() => {
          handleSend();
        }}
      >
        send
      </button>
    </>
  );
};
