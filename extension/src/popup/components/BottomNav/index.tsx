import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import { ROUTES } from "popup/constants/routes";

import "./styles.scss";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
}

const BottomNavLink = ({ children, to }: NavLinkProps) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      isActive ? "BottomNav__link BottomNav__link--active" : "BottomNav__link"
    }
    data-testid={`BottomNav-link-${to.replace("/", "")}`}
  >
    <div className="BottomNav__link__icon">{children}</div>
  </NavLink>
);

export const BottomNav = () => {
  const { t } = useTranslation();

  return (
    <View.Footer hasTopBorder hasNoBottomPadding>
      <div className="BottomNav">
        <BottomNavLink to={ROUTES.account}>
          <Icon.Wallet03 />
          {t("Home")}
        </BottomNavLink>
        <BottomNavLink to={ROUTES.accountHistory}>
          <Icon.ClockRewind />
          {t("History")}
        </BottomNavLink>
        <BottomNavLink to={ROUTES.swapAmount}>
          <Icon.RefreshCcw05 />
          {t("Swap")}
        </BottomNavLink>
        <BottomNavLink to={ROUTES.settings}>
          <Icon.Settings01 />
          {t("Settings")}
        </BottomNavLink>
      </div>
    </View.Footer>
  );
};
