import React, { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";

import { Icon, Text, NavButton } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { View } from "popup/basics/layout/View";
import { navigateTo } from "popup/helpers/navigate";
import { AccountChip } from "popup/components/account/AccountChip";
import { AccountSheet } from "popup/components/account/AccountSheet";
import { ConnectedAppsSheet } from "popup/components/account/ConnectedAppsSheet";
import { Usdt0LaunchBanner } from "popup/components/account/Usdt0LaunchBanner";
import { AccountTabs } from "popup/components/account/AccountTabs";
import { MaintenanceBanner } from "popup/components/MaintenanceBanner";

import "./styles.scss";

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

  return (
    <>
      <View.AppHeader
        isAccountHeader
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
                showBorder
                title={t("Account details")}
                id="nav-btn-qr"
                icon={<Icon.QrCode01 />}
                onClick={() => navigateTo(ROUTES.viewPublicKey, navigate)}
              />
            </div>
            <div data-testid="account-header-connected-apps-button">
              <NavButton
                showBorder
                title={t("Connected apps")}
                id="nav-btn-connected-apps"
                icon={<Icon.NotificationBox />}
                onClick={() => setIsConnectedAppsOpen(true)}
              />
            </div>
          </div>
        }
      >
        <View.Inset hasVerticalBorder>
          <div
            className="AccountHeader__account-info"
            data-testid="account-header"
          >
            <div className="AccountHeader__account-info__details">
              <div
                className="AccountHeader__total-usd-balance"
                data-testid="account-view-total-balance"
                key="total-balance"
              >
                {roundedTotalBalanceUsd}
              </div>
              <div className="AccountHeader__actions">
                <NavLink to={ROUTES.addFunds} data-testid="nav-link-add">
                  <div className="AccountHeader__actions__column">
                    <div className="AccountHeader__actions__btn">
                      <Icon.Plus />
                    </div>
                    <Text as="div" size="xs" weight="medium">
                      {t("Add")}
                    </Text>
                  </div>
                </NavLink>
                <NavLink to={ROUTES.sendPayment} data-testid="nav-link-send">
                  <div className="AccountHeader__actions__column">
                    <div className="AccountHeader__actions__btn">
                      <Icon.ArrowUp />
                    </div>
                    <Text as="div" size="xs" weight="medium">
                      {t("Send")}
                    </Text>
                  </div>
                </NavLink>
                <NavLink to={ROUTES.swap} data-testid="nav-link-swap">
                  <div className="AccountHeader__actions__column">
                    <div className="AccountHeader__actions__btn">
                      <Icon.RefreshCw02 />
                    </div>
                    <Text as="div" size="xs" weight="medium">
                      {t("Swap")}
                    </Text>
                  </div>
                </NavLink>
              </div>
              <Usdt0LaunchBanner />
            </div>
          </div>
          <AccountTabs />
        </View.Inset>
      </View.AppHeader>

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
