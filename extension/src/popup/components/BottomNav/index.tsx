import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { View } from "popup/basics/layout/View";
import { ROUTES } from "popup/constants/routes";

import HistoryIcon from "popup/assets/icon-history.svg";
import WalletIcon from "popup/assets/icon-wallet.svg";
import SettingsIcon from "popup/assets/icon-settings.svg";
import SwapIcon from "popup/assets/icon-swap.svg";

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
    data-testid={`BottomNav-link-${to.replace("/", "")}`}
  >
    {children}
  </NavLink>
);

export const BottomNav = () => {
  const { t } = useTranslation();

  return (
    <View.Footer hasTopBorder>
      <div className="BottomNav">
        <BottomNavLink to={ROUTES.account}>
          <img src={WalletIcon} alt="wallet icon" title={t("Home")} />
        </BottomNavLink>
        <BottomNavLink to={ROUTES.accountHistory}>
          <img src={HistoryIcon} alt="history icon" title={t("History")} />
        </BottomNavLink>
        <BottomNavLink to={ROUTES.swap}>
          <img src={SwapIcon} alt="swap icon" title={t("Swap")} />
        </BottomNavLink>
        <BottomNavLink to={ROUTES.settings}>
          <img src={SettingsIcon} alt="settings icon" title={t("Settings")} />
        </BottomNavLink>
      </div>
    </View.Footer>
  );
};
