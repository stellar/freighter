import React, { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

import { Icon, NavButton } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { maintenanceBannerSelector } from "popup/ducks/remoteConfig";
import { View } from "popup/basics/layout/View";
import { navigateTo } from "popup/helpers/navigate";
import { AccountChip } from "popup/components/account/AccountChip";
import { AccountSheet } from "popup/components/account/AccountSheet";
import { ConnectedAppsSheet } from "popup/components/account/ConnectedAppsSheet";
import { Usdt0LaunchBanner } from "popup/components/account/Usdt0LaunchBanner";
import { AccountTabs } from "popup/components/account/AccountTabs";
import { MaintenanceBanner } from "popup/components/MaintenanceBanner";

import "./styles.scss";

// The Add / Send / Swap tiles under the balance. The labels are existing
// translation keys, translated at render.
const ACTION_TILES = [
  {
    route: ROUTES.addFunds,
    icon: <Icon.Plus />,
    label: "Add",
    testId: "nav-link-add",
  },
  {
    route: ROUTES.sendPayment,
    icon: <Icon.ArrowUp />,
    label: "Send",
    testId: "nav-link-send",
  },
  {
    route: ROUTES.swap,
    icon: <Icon.RefreshCw02 />,
    label: "Swap",
    testId: "nav-link-swap",
  },
];

interface AccountHeaderProps {
  allowList: string[];
  currentAccountName: string;
  onAccountChanged: (updated: { publicKey: string }) => Promise<void>;
  onAllowListRemove: () => void;
  publicKey: string;
  roundedTotalBalanceUsd: string;
}

export const AccountHeader = ({
  allowList,
  currentAccountName,
  onAccountChanged,
  onAllowListRemove,
  publicKey,
  roundedTotalBalanceUsd,
}: AccountHeaderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isConnectedAppsOpen, setIsConnectedAppsOpen] = useState(false);
  // MaintenanceBanner renders under the same condition.
  const { enabled, content } = useSelector(maintenanceBannerSelector);
  const hasBanner = enabled && !!content;

  return (
    <>
      <View.AppHeader
        isAccountHeader
        isSolid={hasBanner}
        topContent={<MaintenanceBanner />}
        leftContent={
          <AccountChip
            accountName={currentAccountName}
            publicKey={publicKey}
            onClick={() => setIsAccountSheetOpen(true)}
          />
        }
        rightContent={
          <div className="AccountHeader__icon-btns">
            <div data-testid="account-header-qr-button">
              <NavButton
                title={t("Account details")}
                id="nav-btn-qr"
                icon={<Icon.QrCode02 />}
                onClick={() => navigateTo(ROUTES.viewPublicKey, navigate)}
              />
            </div>
            <div data-testid="account-header-connected-apps-button">
              <NavButton
                title={t("Connected apps")}
                id="nav-btn-connected-apps"
                icon={<Icon.NotificationBox />}
                onClick={() => setIsConnectedAppsOpen(true)}
              />
            </div>
          </div>
        }
      />

      {/* Outside the pinned header, so it scrolls up under the row's fade.
          A flow sibling of View.Content, which keeps it above the account
          notifications as before. */}
      <View.Inset hasVerticalBorder additionalClassName="AccountHeader__hero">
        <div
          className="AccountHeader__account-info"
          data-testid="account-header"
        >
          <div
            className="AccountHeader__total-usd-balance"
            data-testid="account-view-total-balance"
          >
            {roundedTotalBalanceUsd}
          </div>
          <div className="AccountHeader__actions">
            {ACTION_TILES.map(({ route, icon, label, testId }) => (
              <NavLink
                key={testId}
                to={route}
                className="AccountHeader__actions__column"
                data-testid={testId}
              >
                {icon}
                <span>{t(label)}</span>
              </NavLink>
            ))}
          </div>
          <Usdt0LaunchBanner />
        </div>
        <AccountTabs />
      </View.Inset>

      <AccountSheet
        isOpen={isAccountSheetOpen}
        onClose={() => setIsAccountSheetOpen(false)}
        onAccountChanged={onAccountChanged}
      />
      <ConnectedAppsSheet
        allowList={allowList}
        isOpen={isConnectedAppsOpen}
        onClose={() => setIsConnectedAppsOpen(false)}
        onRefresh={onAllowListRemove}
      />
    </>
  );
};
