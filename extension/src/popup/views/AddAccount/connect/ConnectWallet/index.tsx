import React from "react";
import { useDispatch } from "react-redux";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { BottomNav } from "popup/components/BottomNav";
import { setConnectingWalletType } from "popup/ducks/accountServices";
import LedgerLogo from "popup/assets/ledger-logo.png";
import { WalletType } from "@shared/constants/hardwareWallet";

import "./styles.scss";
import { View } from "popup/basics/layout/View";

export const ConnectWallet = () => {
  const dispatch = useDispatch();

  const handleContinue = (type: WalletType) => {
    dispatch(setConnectingWalletType(type));
    navigateTo(ROUTES.connectWalletPlugin);
  };
  return (
    <View>
      <SubviewHeader
        title="Connect a hardware wallet"
        hasBackButton={true}
        customBackAction={() => navigateTo(ROUTES.account)}
      />
      <View.Content>
        <div className="ConnectWallet">
          <p>Select a hardware wallet you’d like to use with Freighter.</p>
          <ul className="ConnectWallet__options-list">
            <li
              className="ConnectWallet__option"
              onClick={() => handleContinue(WalletType.LEDGER)}
            >
              <img src={LedgerLogo} alt="ledger logo" />
            </li>
          </ul>
        </div>
      </View.Content>
      <BottomNav />
    </View>
  );
};
