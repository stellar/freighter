import React from "react";
import styled from "styled-components";

import HistoryIcon from "popup/assets/icon-history.svg";
import SwapIcon from "popup/assets/icon-swap.svg";
import WalletIcon from "popup/assets/icon-wallet.svg";
import SettingsIcon from "popup/assets/icon-settings.svg";

const BottomNavWrapper = styled.div`
  margin-top: 1rem;
  border-top: solid 0.125rem var(--pal-background-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  bottom: 0;

  img {
    margin: 1rem 2rem;
  }
`;

export const BottomNav = () => (
  <BottomNavWrapper>
    <img src={WalletIcon} alt="wallet icon" />
    <img src={HistoryIcon} alt="history icon" />
    <img src={SwapIcon} alt="swap icon" />
    <img src={SettingsIcon} alt="settings icon" />
  </BottomNavWrapper>
);
