import React from "react";

import HistoryIcon from "popup/assets/icon-history.svg";
import SwapIcon from "popup/assets/icon-swap.svg";
import WalletIcon from "popup/assets/icon-wallet.svg";
import SettingsIcon from "popup/assets/icon-settings.svg";

import "./styles.scss";

export const BottomNav = () => (
  <div className="BottomNav">
    <img src={WalletIcon} alt="wallet icon" />
    <img src={HistoryIcon} alt="history icon" />
    <img src={SwapIcon} alt="swap icon" />
    <img src={SettingsIcon} alt="settings icon" />
  </div>
);
