import React, { useState } from "react";
import { useDispatch } from "react-redux";

import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { BottomNav } from "popup/components/BottomNav";
import { setConnectingWalletType } from "popup/ducks/accountServices";
import LedgerLogo from "popup/assets/ledger-logo.png";

import "./styles.scss";

export enum WalletType {
  LEDGER = "Ledger",
}

export const ConnectWallet = () => {
  const dispatch = useDispatch();
  const [selectedWallet, setSelectedWallet] = useState("");

  const handleContinue = () => {
    dispatch(setConnectingWalletType(WalletType.LEDGER));
    navigateTo(ROUTES.connectWalletPlugin);
  };
  return (
    <>
      <div className="ConnectWallet">
        <SubviewHeader
          title="Connect a hardware wallet"
          hasBackButton={true}
          customBackAction={() => navigateTo(ROUTES.account)}
        />
        <p>Select a hardware wallet you’d like to use with Freighter.</p>
        <ul className="ConnectWallet__options-list">
          <li
            className={`ConnectWallet__option ${
              selectedWallet === WalletType.LEDGER ? "selected" : ""
            }`}
            onClick={() => setSelectedWallet(WalletType.LEDGER)}
          >
            <img src={LedgerLogo} alt="ledger logo" />
          </li>
        </ul>

        <div className="ConnectWallet__btn-continue">
          <Button
            disabled={selectedWallet === ""}
            fullWidth
            variant={Button.variant.tertiary}
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      </div>
      <BottomNav />
    </>
  );
};
