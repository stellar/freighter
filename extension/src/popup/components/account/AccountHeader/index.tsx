import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, NavLink } from "react-router-dom";
import { createPortal } from "react-dom";

import { Icon, Text, NavButton } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { View } from "popup/basics/layout/View";
import { isActiveNetwork } from "helpers/stellar";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import {
  saveAllowList,
  settingsNetworkDetailsSelector,
  settingsNetworksListSelector,
} from "popup/ducks/settings";
import { signOut } from "popup/ducks/accountServices";
import { AccountHeaderModal } from "popup/components/account/AccountHeaderModal";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";
import { NetworkDetails } from "@shared/constants/stellar";

import "./styles.scss";

interface AccountHeaderProps {
  allowList: string[];
  currentAccountName: string;
  isFunded: boolean;
  onAllowListRemove: () => void;
  onClickRow: (updatedValues: {
    publicKey?: string;
    network?: NetworkDetails;
  }) => Promise<void>;
  publicKey: string;
  roundedTotalBalanceUsd: string;
}

export const AccountHeader = ({
  allowList,
  currentAccountName,
  isFunded,
  onAllowListRemove,
  onClickRow,
  publicKey,
  roundedTotalBalanceUsd,
}: AccountHeaderProps) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const networksList = useSelector(settingsNetworksListSelector);
  const [isNetworkSelectorOpen, setIsNetworkSelectorOpen] = useState(false);
  const [isAccountOptionsOpen, setIsAccountOptionsOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const networksModalHeight = useRef(0);
  const activeNetworkIndex = useRef<number | null>(null);

  const calculateModalHeight = (listLength: number) => (listLength + 2) * 6;

  useEffect(() => {
    networksModalHeight.current = calculateModalHeight(networksList.length);
  }, [networksList]);

  const index = networksList.findIndex((n) =>
    isActiveNetwork(n, networkDetails),
  );

  activeNetworkIndex.current = index;

  const isBackgroundActive = isNetworkSelectorOpen || isAccountOptionsOpen;

  const signOutAndClose = async (e: React.FormEvent) => {
    e.preventDefault();

    await dispatch(signOut());
    navigateTo(ROUTES.unlockAccount, navigate);
  };

  return (
    <>
      <View.AppHeader
        isAccountHeader
        leftContent={
          <div data-testid="AccountHeader__icon-btn">
            <div className="AccountHeader__icon-btn__left">
              <div
                className="AccountHeader__dropdown"
                data-testid="account-options-dropdown"
              >
                <AccountHeaderModal
                  className="AccountHeader__options"
                  isDropdownOpen={isAccountOptionsOpen}
                  icon={
                    <NavButton
                      showBorder
                      title={t("View options")}
                      id="nav-btn-qr"
                      icon={<Icon.DotsHorizontal />}
                      onClick={() =>
                        setIsAccountOptionsOpen(!isAccountOptionsOpen)
                      }
                    />
                  }
                >
                  <>
                    {isFunded && (
                      <div
                        className="AccountHeader__options__item"
                        onClick={() => {
                          // dispatch(saveAssetSelectType(AssetSelectType.MANAGE));
                          navigateTo(ROUTES.manageAssets, navigate);
                        }}
                      >
                        <Text as="div" size="sm" weight="medium">
                          {t("Manage assets")}
                        </Text>
                        <div className="AccountHeader__options__item__icon">
                          <Icon.Coins03 />
                        </div>
                      </div>
                    )}
                    <div
                      className="AccountHeader__options__item"
                      onClick={() => navigateTo(ROUTES.viewPublicKey, navigate)}
                    >
                      <Text as="div" size="sm" weight="medium">
                        {t("Account details")}
                      </Text>
                      <div className="AccountHeader__options__item__icon">
                        <Icon.QrCode01 />
                      </div>
                    </div>
                    <div
                      className="AccountHeader__options__item"
                      onClick={() => navigateTo(ROUTES.settings, navigate)}
                    >
                      <Text as="div" size="sm" weight="medium">
                        {t("Settings")}
                      </Text>
                      <div className="AccountHeader__options__item__icon">
                        <Icon.Settings01 />
                      </div>
                    </div>
                    <hr className="AccountHeader__list-divider" />
                    <div
                      className="AccountHeader__options__item"
                      onClick={(e) => signOutAndClose(e)}
                    >
                      <Text as="div" size="sm" weight="medium">
                        {t("Lock Freighter")}
                      </Text>
                      <div className="AccountHeader__options__item__icon">
                        <Icon.Lock01 />
                      </div>
                    </div>
                    <div
                      className="AccountHeader__options__item"
                      onClick={() => openTab(newTabHref(ROUTES.account))}
                    >
                      <Text as="div" size="sm" weight="medium">
                        {t("Fullscreen mode")}
                      </Text>
                      <div className="AccountHeader__options__item__icon">
                        <Icon.Expand05 />
                      </div>
                    </div>

                    <div
                      className="AccountHeader__options__item"
                      onClick={() => navigateTo(ROUTES.leaveFeedback, navigate)}
                    >
                      <Text as="div" size="sm" weight="medium">
                        {t("Share feedback")}
                      </Text>
                      <div className="AccountHeader__options__item__icon">
                        <Icon.MessageDotsCircle />
                      </div>
                    </div>
                  </>
                </AccountHeaderModal>
              </div>

              <div
                className="AccountHeader__dropdown"
                data-testid="network-selector-open"
              >
                <AccountHeaderModal
                  className="AccountHeader__networks"
                  isDropdownOpen={isNetworkSelectorOpen}
                  icon={
                    <NavButton
                      showBorder
                      title={t("View options")}
                      id="nav-btn-qr"
                      icon={<Icon.Globe02 />}
                      onClick={() =>
                        setIsNetworkSelectorOpen(!isNetworkSelectorOpen)
                      }
                    />
                  }
                >
                  <>
                    <div className="AccountHeader__network-selector">
                      {networksList.map((n, i) => (
                        <div className="AccountHeader__options__item">
                          <div
                            className="AccountHeader__network-selector__row"
                            key={n.networkName}
                            onClick={async () => {
                              await onClickRow({ network: n });
                              setIsNetworkSelectorOpen(false);
                            }}
                          >
                            <NetworkIcon index={i} />
                            <div className="AccountHeader__network-copy">
                              {n.networkName}
                            </div>
                            {isActiveNetwork(n, networkDetails) ? (
                              <div className="AccountHeader__network-selector__check">
                                <Icon.Check />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                    {allowList.length ? (
                      <hr className="AccountHeader__list-divider" />
                    ) : null}
                    <div className="AccountHeader__allow-list">
                      {allowList.map((allowedDomain) => (
                        <div
                          key={allowedDomain}
                          className="AccountHeader__allow-list-item"
                        >
                          <PunycodedDomain domain={allowedDomain} isRow />
                          <button
                            className="allow-list-remove"
                            onClick={async () => {
                              await dispatch(
                                saveAllowList({
                                  domain: allowedDomain,
                                  networkName: networkDetails.networkName,
                                }),
                              );
                              onAllowListRemove();
                            }}
                          >
                            <Icon.MinusCircle />
                          </button>
                        </div>
                      ))}
                    </div>

                    <hr className="AccountHeader__list-divider" />
                    <div
                      className="AccountHeader__options__item"
                      onClick={() =>
                        navigateTo(ROUTES.manageConnectedApps, navigate)
                      }
                    >
                      <Text as="div" size="sm" weight="medium">
                        {t("Connected apps")}
                      </Text>
                      <div className="AccountHeader__options__item__icon">
                        <Icon.Link04 />
                      </div>
                    </div>
                  </>
                </AccountHeaderModal>
              </div>
            </div>
          </div>
        }
        rightContent={
          <div
            className="AccountHeader__right-button AccountHeader__right-button--with-label"
            onClick={() => navigateTo(ROUTES.discover, navigate)}
          >
            <Icon.Compass03 /> {t("Discover")}
          </div>
        }
      >
        <View.Inset hasVerticalBorder>
          <div
            className="AccountHeader__account-info"
            data-testid="account-header"
          >
            <div className="AccountHeader__account-info__details">
              <NavLink to={ROUTES.wallets}>
                <div className="AccountHeader__name-key-display">
                  <div className="AccountHeader__identicon">
                    <IdenticonImg publicKey={publicKey} />
                  </div>

                  <div
                    className="AccountHeader__account-name"
                    data-testid="account-view-account-name"
                  >
                    {currentAccountName}
                  </div>
                  <Icon.ChevronDown />
                </div>
              </NavLink>
              <div
                className="AccountHeader__total-usd-balance"
                data-testid="account-view-total-balance"
                key="total-balance"
              >
                {roundedTotalBalanceUsd}
              </div>
              <div className="AccountHeader__actions">
                <NavLink to={ROUTES.addFunds} data-testid="nav-link-buy">
                  <div className="AccountHeader__actions__column">
                    <div className="AccountHeader__actions__btn">
                      <Icon.Plus />
                    </div>
                    <Text as="div" size="sm" weight="medium">
                      {t("Buy")}
                    </Text>
                  </div>
                </NavLink>
                <NavLink to={ROUTES.sendPayment} data-testid="nav-link-send">
                  <div className="AccountHeader__actions__column">
                    <div className="AccountHeader__actions__btn">
                      <Icon.ArrowUp />
                    </div>
                    <Text as="div" size="sm" weight="medium">
                      {t("Send")}
                    </Text>
                  </div>
                </NavLink>
                <NavLink to={ROUTES.swap} data-testid="nav-link-swap">
                  <div className="AccountHeader__actions__column">
                    <div className="AccountHeader__actions__btn">
                      <Icon.RefreshCcw05 />
                    </div>
                    <Text as="div" size="sm" weight="medium">
                      {t("Swap")}
                    </Text>
                  </div>
                </NavLink>
                <NavLink
                  to={ROUTES.accountHistory}
                  data-testid="nav-link-account-history"
                >
                  <div className="AccountHeader__actions__column">
                    <div className="AccountHeader__actions__btn">
                      <Icon.ClockRewind />
                    </div>
                    <Text as="div" size="sm" weight="medium">
                      {t("History")}
                    </Text>
                  </div>
                </NavLink>
              </div>

              {isBackgroundActive
                ? createPortal(
                    <LoadingBackground
                      onClick={() => {
                        setIsNetworkSelectorOpen(false);
                        setIsAccountOptionsOpen(false);
                      }}
                      isActive={isBackgroundActive}
                      isFullScreen
                      isClear
                    />,
                    document.querySelector("#modal-root")!,
                  )
                : null}
            </div>
          </div>
        </View.Inset>
      </View.AppHeader>
    </>
  );
};
