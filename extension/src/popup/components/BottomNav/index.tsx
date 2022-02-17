import React from "react";
import { NavLink } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";

import HistoryIcon from "popup/assets/icon-history.svg";
import WalletIcon from "popup/assets/icon-wallet.svg";
import SettingsIcon from "popup/assets/icon-settings.svg";

import "./styles.scss";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
}

const BottomNavLink = ({ children, to }: NavLinkProps) => (
  <NavLink
    to={to}
    activeClassName="BottomNav--link--active"
    className="BottomNav--link"
  >
    {children}
  </NavLink>
);

export const BottomNav = () => (
  <div className="BottomNav">
    <BottomNavLink to={ROUTES.account}>
      <img src={WalletIcon} alt="wallet icon" />
    </BottomNavLink>
    <BottomNavLink to={ROUTES.accountHistory}>
      <img src={HistoryIcon} alt="history icon" />
    </BottomNavLink>
    {/* <img src={SwapIcon} alt="swap icon" /> */}
    <BottomNavLink to={ROUTES.settings}>
      <img src={SettingsIcon} alt="settings icon" />
    </BottomNavLink>
  </div>
);
