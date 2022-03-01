import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import StellarSdk, { Asset } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";

import { Button, Select, IconButton, Icon } from "@stellar/design-system";

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
        <div className="SendAmount__btn-set-max">
          <Button variant={Button.variant.tertiary}>SET MAX</Button>
        </div>
        {/* ALEC TODO - add asset code unit */}
        <input
          className="SendAmount__input-amount"
          type="text"
          placeholder="0.00"
          value={amount}
          onChange={(e: React.ChangeEvent<any>) => setAmount(e.target.value)}
        />
        <Select
          id="asset-select"
          onChange={(e: React.ChangeEvent<any>) => setAsset(e.target.value)}
        >
          {accountBalances.balances &&
            Object.entries(accountBalances.balances).map(([k, v]) => (
              <option key={k} selected={k === asset} value={k}>
                {v.token.code}
              </option>
            ))}
        </Select>
        <div className="btn-continue">
          <Button
            fullWidth
            variant={Button.variant.tertiary}
            onClick={() => navigateTo(ROUTES.sendPaymentTo)}
          >
            Continue
          </Button>
        </div>
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
      <div className="SendSettings__row">
        <div className="SendSettings__row-left">
          <span>Transaction fee</span>
          <IconButton altText="info" icon={<Icon.Info />} />
        </div>
        <div className="SendSettings__row-right">
          <span>{transactionFee}</span>
          <div>
            <Icon.ChevronRight />
          </div>
        </div>
      </div>
      {/* ALEC TODO - allowed slippage page? */}
      <div className="SendSettings__row">
        <div className="SendSettings__row-left">
          <span>Memo</span> <IconButton altText="info" icon={<Icon.Info />} />
        </div>
        <div className="SendSettings__row-right">
          <span></span>
        </div>
      </div>
      <div className="SendSettings__input-textarea">
        <textarea
          className="TextArea Card Card--highlight"
          autoComplete="off"
          id="mnemonic-input"
          placeholder="Memo (optional)"
          // ALEC TODO - on change
          // onChange={}
        />
      </div>
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
      <div className="btn-continue">
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={() => navigateTo(ROUTES.sendPaymentConfirm)}
        >
          Review Send
        </Button>
      </div>
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
  const [isProcessing, setIsProcessing] = useState(false);
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

    setIsProcessing(true);

    try {
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
        // ALEC TODO - remove
        console.log(submitRes);
        setIsSuccessful(true);
        return;
      }
    } catch (e) {
      setIsProcessing(false);
      setIsSuccessful(false);
      // TODO - error page
      console.error("send failed");
    }
  };

  const ConfirmationDetails = (
    <div className="SendConfirm__confirmation-details">
      {/* ALEC TODO - asset code: */}
      <div className="header">{isSuccessful ? "Sent" : "Send"}</div>
      <div>amount: {amount}</div>
      <div>asset: {asset}</div>
      <div>destination: {destination}</div>
      <div>transactionFee: {transactionFee}</div>
      <div>memo: {memo}</div>
    </div>
  );

  return (
    <PopupWrapper>
      <BackButton
        isPopup
        onClick={() => navigateTo(ROUTES.sendPaymentSettings)}
      />
      {ConfirmationDetails}
      {isSuccessful ? (
        <div>
          {/* ALEC ODO - links for these */}
          <Button variant={Button.variant.tertiary}>Done</Button>
          <Button variant={Button.variant.tertiary}>View</Button>
        </div>
      ) : (
        <div>
          <Button variant={Button.variant.tertiary}>Cancel</Button>
          <Button isLoading={isProcessing} onClick={handleSend}>
            Send
          </Button>
        </div>
      )}
    </PopupWrapper>
  );
};
