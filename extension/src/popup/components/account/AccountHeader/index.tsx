import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import { Account } from "@shared/api/types";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { View } from "popup/basics/layout/View";
import { isActiveNetwork } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import {
  settingsNetworkDetailsSelector,
  settingsNetworksListSelector,
} from "popup/ducks/settings";
import { AccountList } from "popup/components/account/AccountList";
import { AccountHeaderModal } from "popup/components/account/AccountHeaderModal";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";

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
}

export const AccountHeader = ({
  allAccounts,
  currentAccountName,
  publicKey,
  onClickRow,
}: AccountHeaderProps) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const networksList = useSelector(settingsNetworksListSelector);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNetworkSelectorOpen, setIsNetworkSelectorOpen] = useState(false);
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

  return (
    <View.AppHeader
      data-testid="account-header"
      leftContent={
        <div
          className="AccountHeader__icon-btn"
          data-testid="AccountHeader__icon-btn"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <AccountListIdenticon
            active
            accountName={currentAccountName}
            publicKey={publicKey}
          />
        </div>
      }
      rightContent={
        <div className="AccountHeader__right-content">
          <div
            className="AccountHeader__right-button"
            onClick={() => navigateTo(ROUTES.discover, navigate)}
          >
            <Icon.Compass03 />
          </div>
          <div
            className="AccountHeader__right-button"
            data-testid="network-selector-open"
            onClick={() => setIsNetworkSelectorOpen(!isNetworkSelectorOpen)}
          >
            <Icon.Globe02 />
          </div>
        </div>
      }
    >
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
      <LoadingBackground
        onClick={() => {
          setIsDropdownOpen(false);
          setIsNetworkSelectorOpen(false);
        }}
        isActive={isDropdownOpen || isNetworkSelectorOpen}
      />
    </View.AppHeader>
  );
};
