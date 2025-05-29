import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate, NavLink } from "react-router-dom";
import { createPortal } from "react-dom";

import { Account } from "@shared/api/types";
import { Icon, Text, NavButton } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { View } from "popup/basics/layout/View";
import { isActiveNetwork } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import {
  settingsNetworkDetailsSelector,
  settingsNetworksListSelector,
} from "popup/ducks/settings";
import { AccountList } from "popup/components/account/AccountList";
import { AccountHeaderModal } from "popup/components/account/AccountHeaderModal";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";
// import { AccountOptionsDropdown } from "popup/components/account/AccountOptionsDropdown";

import "./styles.scss";
import { NetworkDetails } from "@shared/constants/stellar";

interface AccountHeaderProps {
  allAccounts: Account[];
  currentAccountName: string;
  publicKey: string;
  onClickRow: (updatedValues: {
    publicKey?: string;
    network?: NetworkDetails;
  }) => Promise<void>;
  roundedTotlalBalanceUsd: string;
  isFunded: boolean;
}

export const AccountHeader = ({
  allAccounts,
  currentAccountName,
  publicKey,
  onClickRow,
  roundedTotlalBalanceUsd,
  isFunded,
}: AccountHeaderProps) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const networksList = useSelector(settingsNetworksListSelector);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNetworkSelectorOpen, setIsNetworkSelectorOpen] = useState(false);
  const [isAccountOptionsOpen, setIsAccountOptionsOpen] = useState(false);
  const navigate = useNavigate();

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

  const isBackgroundActive =
    isDropdownOpen || isNetworkSelectorOpen || isAccountOptionsOpen;

  return (
    <>
      <View.AppHeader
        isAccountHeader
        leftContent={
          <div
            className="AccountHeader__icon-btn"
            data-testid="AccountHeader__icon-btn"
          >
            <div className="AccountHeader__icon-btn__left">
              <div
                className="AccountHeader__dropdown"
                data-testid="account-options-dropdown"
              >
                {/* <AccountOptionsDropdown isFunded={isFunded} /> */}
                <NavButton
                  showBorder
                  title={t("View options")}
                  id="nav-btn-qr"
                  icon={<Icon.DotsHorizontal />}
                  onClick={() => setIsAccountOptionsOpen(!isAccountOptionsOpen)}
                />
              </div>
              <div
                className="AccountHeader__right-button"
                data-testid="network-selector-open"
                onClick={() => setIsNetworkSelectorOpen(!isNetworkSelectorOpen)}
              >
                <Icon.Globe02 />
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
                <div className="AccountHeader__account-dropdown-btn">
                  <Icon.ChevronDown
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  />
                </div>
              </div>
              <div
                className="AccountHeader__total-usd-balance"
                key="total-balance"
              >
                {roundedTotlalBalanceUsd}
              </div>
              <div className="AccountHeader__actions">
                <NavLink to={ROUTES.addFunds}>
                  <div className="AccountHeader__actions__column">
                    <div className="AccountHeader__actions__btn">
                      <Icon.Plus />
                    </div>
                    <Text as="div" size="xs" weight="medium">
                      {t("Buy")}
                    </Text>
                  </div>
                </NavLink>
                <NavLink to={ROUTES.sendPayment}>
                  <div className="AccountHeader__actions__column">
                    <div className="AccountHeader__actions__btn">
                      <Icon.ArrowUp />
                    </div>
                    <Text as="div" size="xs" weight="medium">
                      {t("Send")}
                    </Text>
                  </div>
                </NavLink>
                <NavLink to={ROUTES.swap}>
                  <div className="AccountHeader__actions__column">
                    <div className="AccountHeader__actions__btn">
                      <Icon.RefreshCcw05 />
                    </div>
                    <Text as="div" size="xs" weight="medium">
                      {t("Swap")}
                    </Text>
                  </div>
                </NavLink>
                <NavLink to={ROUTES.accountHistory}>
                  <div className="AccountHeader__actions__column">
                    <div className="AccountHeader__actions__btn">
                      <Icon.ClockRewind />
                    </div>
                    <Text as="div" size="xs" weight="medium">
                      {t("History")}
                    </Text>
                  </div>
                </NavLink>
              </div>
              <AccountHeaderModal isDropdownOpen={isDropdownOpen}>
                <ul className="AccountHeader__account-dropdown">
                  <AccountList
                    allAccounts={allAccounts}
                    publicKey={publicKey}
                    onClickAccount={async (clickedPublicKey: string) => {
                      if (publicKey !== clickedPublicKey) {
                        await onClickRow({ publicKey: clickedPublicKey });
                      }
                      setIsDropdownOpen(!isDropdownOpen);
                    }}
                  />
                  <div className="AccountList__footer">
                    <hr className="AccountHeader__list-divider" />
                    <li className="AccountHeader__account-list-item">
                      <Link
                        className="AccountHeader__account-list-item__link"
                        to={ROUTES.addAccount}
                        state={{
                          header: t("Create a new Stellar address"),
                          cta: t("Add address"),
                        }}
                      >
                        <div className="AccountHeader__account-list-item__row">
                          <div className="AccountHeader__account-list-item__icon">
                            <Icon.PlusCircle />
                          </div>
                          <span className="AccountHeader__account-list-item__link-copy">
                            {t("Create a new Stellar address")}
                          </span>
                        </div>
                        <span className="AccountHeader__account-list-item__arrow">
                          <Icon.ChevronRight />
                        </span>
                      </Link>
                    </li>
                    <li className="AccountHeader__account-list-item">
                      <Link
                        className="AccountHeader__account-list-item__link"
                        to={ROUTES.importAccount}
                      >
                        <div className="AccountHeader__account-list-item__row">
                          <div className="AccountHeader__account-list-item__icon">
                            <Icon.Key01 />
                          </div>
                          <span className="AccountHeader__account-list-item__link-copy">
                            {t("Import a Stellar secret key")}
                          </span>
                        </div>
                        <span className="AccountHeader__account-list-item__arrow">
                          <Icon.ChevronRight />
                        </span>
                      </Link>
                    </li>
                    <li className="AccountHeader__account-list-item">
                      <Link
                        className="AccountHeader__account-list-item__link"
                        to={ROUTES.connectWallet}
                      >
                        <div className="AccountHeader__account-list-item__row">
                          <div className="AccountHeader__account-list-item__icon">
                            <Icon.ShieldPlus />
                          </div>
                          <span className="AccountHeader__account-list-item__link-copy">
                            Connect a hardware wallet
                          </span>
                        </div>
                        <span className="AccountHeader__account-list-item__arrow">
                          <Icon.ChevronRight />
                        </span>
                      </Link>
                    </li>
                  </div>
                </ul>
              </AccountHeaderModal>
              <AccountHeaderModal isDropdownOpen={isNetworkSelectorOpen}>
                <>
                  <div className="AccountHeader__network-selector">
                    {networksList.map((n, i) => (
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
                    ))}
                  </div>

                  <hr className="AccountHeader__list-divider" />
                  <div className="AccountHeader__account-list-item">
                    <Link
                      className="AccountHeader__account-list-item__link"
                      to={ROUTES.addNetwork}
                    >
                      <div className="AccountHeader__account-list-item__row">
                        <div className="AccountHeader__account-list-item__icon">
                          <Icon.BookmarkAdd />
                        </div>
                        <span className="AccountHeader__account-list-item__link-copy">
                          {t("Add custom network")}
                        </span>
                      </div>
                      <span className="AccountHeader__account-list-item__arrow">
                        <Icon.ChevronRight />
                      </span>
                    </Link>
                  </div>
                  <div className="AccountHeader__account-list-item">
                    <Link
                      className="AccountHeader__account-list-item__link"
                      to={ROUTES.networkSettings}
                    >
                      <div className="AccountHeader__account-list-item__row">
                        <div className="AccountHeader__account-list-item__icon">
                          <Icon.Settings01 />
                        </div>
                        <span className="AccountHeader__account-list-item__link-copy">
                          {t("Manage network settings")}
                        </span>
                      </div>
                      <span className="AccountHeader__account-list-item__arrow">
                        <Icon.ChevronRight />
                      </span>
                    </Link>
                  </div>
                </>
              </AccountHeaderModal>
              <AccountHeaderModal isDropdownOpen={isAccountOptionsOpen}>
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
                    onClick={() => navigateTo(ROUTES.settings, navigate)}
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
                    onClick={() => navigateTo(ROUTES.settings, navigate)}
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

              {isBackgroundActive
                ? createPortal(
                    <LoadingBackground
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsNetworkSelectorOpen(false);
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
