import React from "react";
import { useSelector } from "react-redux";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import FreighterLogoLockup from "popup/assets/logo-lockup-freighter.svg";

import "./styles.scss";

interface HeaderProps {
  isPopupView?: boolean;
}

export const Header = ({ isPopupView = false }: HeaderProps) => {
  const { isTestnet, networkName } = useSelector(
    settingsNetworkDetailsSelector,
  );
  return (
    <header className={`Header ${isPopupView ? "Header--popup" : ""}`}>
      <div className={isPopupView ? "" : "Header--fullscreen"}>
        <img alt="Freighter logo" src={FreighterLogoLockup} />
        {isPopupView ? null : (
          <div className="Header__network">
            <div
              className={`Header__network__icon ${
                isTestnet ? "Header__network__icon--testnet" : ""
              }`}
            />
            <div className="Header__network__name">{networkName}</div>
          </div>
        )}
      </div>
    </header>
  );
};
