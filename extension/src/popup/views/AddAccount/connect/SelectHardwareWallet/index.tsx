import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { setConnectingWalletType } from "popup/ducks/accountServices";
import { walletAssets } from "popup/helpers/hardwareConnect";
import { View } from "popup/basics/layout/View";
import {
  ConfigurableWalletType,
  WalletType,
} from "@shared/constants/hardwareWallet";

import "./styles.scss";

const WalletOption = ({
  walletType,
}: {
  walletType: ConfigurableWalletType;
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleContinue = (type: ConfigurableWalletType) => {
    dispatch(setConnectingWalletType(type));
    navigateTo(
      ROUTES.connectWalletPlugin,
      navigate,
      `?walletType=${walletType}`,
    );
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

export const SelectHardwareWallet = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <>
      <SubviewHeader
        title={t("Connect a hardware wallet")}
        hasBackButton={true}
        customBackAction={() => navigateTo(ROUTES.account, navigate)}
      />
      <View.Content>
        <div className="SelectHardwareWallet">
          <p>
            {t("Select a hardware wallet you’d like to use with Freighter.")}
          </p>
          <ul className="SelectHardwareWallet__options-list">
            {Object.entries(WalletType).map(([_k, v]) =>
              v ? (
                <WalletOption
                  key={v}
                  walletType={v as ConfigurableWalletType}
                />
              ) : null,
            )}
          </ul>
        </div>
      </View.Content>
    </>
  );
};
