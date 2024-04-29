import React from "react";
import { useDispatch } from "react-redux";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { setConnectingWalletType } from "popup/ducks/accountServices";
import { walletAssets } from "popup/helpers/hardwareConnect";
import {
  ConfigurableWalletType,
  WalletType,
} from "@shared/constants/hardwareWallet";

import "./styles.scss";
import { View } from "popup/basics/layout/View";

const WalletOption = ({
  walletType,
}: {
  walletType: ConfigurableWalletType;
}) => {
  const dispatch = useDispatch();

  const handleContinue = (type: ConfigurableWalletType) => {
    dispatch(setConnectingWalletType(type));
    navigateTo(ROUTES.connectWalletPlugin, `?walletType=${walletType}`);
  };

  return (
    <li
      className="SelectHardwareWallet__option"
      onClick={() => handleContinue(walletType)}
    >
      <img src={walletAssets[walletType].logo} alt={`${walletType} logo`} />
    </li>
  );
};

export const SelectHardwareWallet = () => (
  <>
    <SubviewHeader
      title="Connect a hardware wallet"
      hasBackButton={true}
      customBackAction={() => navigateTo(ROUTES.account)}
    />
    <View.Content>
      <div className="SelectHardwareWallet">
        <p>Select a hardware wallet you’d like to use with Freighter.</p>
        <ul className="SelectHardwareWallet__options-list">
          {Object.entries(WalletType).map(([_k, v]) =>
            v ? (
              <WalletOption key={v} walletType={v as ConfigurableWalletType} />
            ) : null,
          )}
        </ul>
      </div>
    </View.Content>
  </>
);
