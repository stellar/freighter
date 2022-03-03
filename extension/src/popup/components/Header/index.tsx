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
      <img alt="Freighter logo" src={FreighterLogoLockup} />
      {isPopupView ? null : (
        <div className="Header--network">
          <div
            className={`Header--network--icon ${
              isTestnet ? "Header--network--icon--testnet" : ""
            }`}
          />
          <div className="Header--network--name">{networkName}</div>
        </div>
      )}
    </header>
  );
};
