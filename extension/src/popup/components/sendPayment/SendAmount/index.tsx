import React, { useState, useEffect } from "react";

import { Button, Select } from "@stellar/design-system";

import { AccountBalancesInterface } from "@shared/api/types";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";

import { PopupWrapper } from "popup/basics/PopupWrapper";

import { BackButton } from "popup/basics/Buttons";

// ALEC TODO - divide styles for each component
import "../styles.scss";

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
        <BackButton isPopup onClick={() => navigateTo(ROUTES.sendPaymentTo)} />
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
            onClick={() => navigateTo(ROUTES.sendPaymentSettings)}
          >
            Continue
          </Button>
        </div>
      </div>
    </PopupWrapper>
  );
};
