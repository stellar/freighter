// ALEC TODO - capitalize file
import React, { useState, useEffect } from "react";

import { AccountBalancesInterface } from "@shared/api/types";

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
  // ALEC TODO - any
  setAmount: any;
  asset: string;
  // ALEC TODO - any
  setAsset: any;
  accountBalances: AccountBalancesInterface;
}) => {
  // ALEC TODO - remove
  console.log(amount);
  console.log("asset:", asset);
  console.log(accountBalances);

  const [sortedBalances, setSortedBalances] = useState<
    // ALEC TODO - any
    Array<{ code: string; balance: any }>
  >([]);

  // ALEC TODO - figure out why not working
  // current asset always at the top
  useEffect(() => {
    setSortedBalances([{ code: asset, balance: 2500 }]);
    // const balances = Object.entries(accountBalances?.balances || {});
    // balances.forEach(([_, v]) => {
    //   if (v.token.code === asset) {
    //     sortedBalances.unshift({ code: v.token.code, balance: v.total });
    //   } else {
    //     sortedBalances.push({ code: v.token.code, balance: v.total });
    //   }
    // });
    // setSortedBalances(sortedBalances);
  }, [asset]);

  return (
    <PopupWrapper>
      <div className="SendAmount">
        <BackButton isPopup onClick={() => navigateTo(ROUTES.account)} />
        {/* ALEC TODO - support non xlm assets */}
        <div className="SendAmount__header">Send XLM</div>
        <div className="SendAmount__asset-copy">
          {sortedBalances[0] && (
            <>
              <span>{sortedBalances[0].balance}</span>{" "}
              <span>{sortedBalances[0].code}</span>
            </>
          )}{" "}
          available
        </div>
        <button>set max</button>
        <input
          className="SendAmount__amount-input"
          type="text"
          placeholder="0.00"
          value={amount}
          // ALEC TODO - any
          onChange={(e: any) => setAmount(e.target.value)}
        />
        <div className="SendAmount__asset-copy">{asset}</div>
        <select onChange={(e: any) => setAsset(e.target.value)}>
          {sortedBalances.map(({ code }) => (
            <option value={code}>{code}</option>
          ))}
        </select>
        {/* ALEC TODO move to constants */}

        <button onClick={() => navigateTo("/sendPayment/to" as ROUTES)}>
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
  setDestination: any;
}) => (
  <PopupWrapper>
    <div className="SendTo">
      <BackButton
        isPopup
        onClick={() => navigateTo("/sendPayment" as ROUTES)}
      />
      <div className="header">Send To</div>
      <input
        value={destination}
        onChange={(e: any) => setDestination(e.target.value)}
      />
      <div>Recent</div>
      <button onClick={() => navigateTo("/sendPayment/settings" as ROUTES)}>
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
  setTransactionFee: any;
  memo: string;
  setMemo: any;
}) => (
  <PopupWrapper>
    <div className="SendSettings">
      <div className="header">Send Settings</div>
      <BackButton
        isPopup
        onClick={() => navigateTo("/sendPayment/to" as ROUTES)}
      />
      <input
        value={transactionFee}
        placeholder="transaction fee"
        onChange={(e: any) => setTransactionFee(e.target.value)}
      ></input>
      <input
        value={memo}
        placeholder="memo"
        onChange={(e: any) => setMemo(e.target.value)}
      ></input>
      <button onClick={() => navigateTo("/sendPayment/confirm" as ROUTES)}>
        continue
      </button>
    </div>
  </PopupWrapper>
);

export const SendConfirm = ({
  amount,
  asset,
  destination,
  transactionFee,
  memo,
}: {
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
  return (
    <PopupWrapper>
      <div className="SendConfirm">
        <BackButton
          isPopup
          onClick={() => navigateTo("/sendPayment/settings" as ROUTES)}
        />
        <div className="header">Send Confirm</div>
        <div>amount: {amount}</div>
        <div>asset: {asset}</div>
        <div>destination: {destination}</div>
        <div>transactionFee: {transactionFee}</div>
        <div>memo: {memo}</div>
        <button>cancel</button>
        <button>send</button>
      </div>
    </PopupWrapper>
  );
};
