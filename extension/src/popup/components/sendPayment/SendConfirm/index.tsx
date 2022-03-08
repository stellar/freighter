import React, { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import StellarSdk, { Horizon, Asset } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { signFreighterTransaction } from "popup/ducks/access";
import { AppDispatch } from "popup/App";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { PopupWrapper } from "popup/basics/PopupWrapper";
import { BackButton } from "popup/basics/BackButton";

import { SubmitFail, SubmitPending, SubmitSuccess } from "./SubmitResult";

import "../styles.scss";

const SUBMIT_STATE = {
  idle: "idle",
  pending: "pending",
  success: "success",
  fail: "failed",
  view: "view",
};
enum ACTIONS {
  submit = "submit",
  success = "success",
  fail = "fail",
  view = "view",
}
const initialState = {
  state: SUBMIT_STATE.idle,
  response: null,
  error: null,
};

const reducer = (
  state: any,
  action: { type: ACTIONS; payload?: Horizon.SubmitTransactionResponse },
) => {
  switch (action.type) {
    case ACTIONS.submit:
      return { ...initialState, state: SUBMIT_STATE.pending };
    case ACTIONS.success:
      return {
        ...state,
        error: null,
        response: action.payload,
        state: SUBMIT_STATE.success,
      };
    case ACTIONS.fail:
      return {
        ...state,
        response: null,
        error: action.payload,
        state: SUBMIT_STATE.fail,
      };
    case ACTIONS.view:
      return {
        ...state,
        state: SUBMIT_STATE.view,
      };
    default:
      return state;
  }
};

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

  const [submission, reducerDispatch] = useReducer(reducer, initialState);

  // handles signing and submitting
  const handleSend = async () => {
    reducerDispatch({ type: ACTIONS.submit });
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

      try {
        const submitRes = await server.submitTransaction(signed);
        reducerDispatch({ type: ACTIONS.success, payload: submitRes });
      } catch (e) {
        reducerDispatch({ type: ACTIONS.fail, payload: e });
      }
    } else {
      reducerDispatch({
        type: ACTIONS.fail,
      });
    }
  };

  const TransactionDetails = () => (
    <div className="SendConfirm">
      {submission.state === SUBMIT_STATE.view ? (
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
      {submission.state === SUBMIT_STATE.view ? (
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
    switch (submission.state) {
      case SUBMIT_STATE.idle:
        return <TransactionDetails />;
      case SUBMIT_STATE.pending:
        return <SubmitPending />;
      case SUBMIT_STATE.success:
        return (
          <SubmitSuccess
            amount={amount}
            asset={asset}
            destination={destination}
            viewDetails={() => reducerDispatch({ type: ACTIONS.view })}
          />
        );
      case SUBMIT_STATE.fail:
        return <SubmitFail destination={destination} />;
      case SUBMIT_STATE.view:
        return <TransactionDetails />;
      default:
        return <TransactionDetails />;
    }
  };

  return <PopupWrapper>{render()}</PopupWrapper>;
};
