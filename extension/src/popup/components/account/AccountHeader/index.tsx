import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { Account } from "@shared/api/types";
import { Icon } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";
import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import IconCube from "popup/assets/icon-cube.svg";

import "./styles.scss";

const ImportedTagEl = () => (
  <span className="AccountHeader--option-tag">&bull; Imported</span>
);

interface AccountHeaderProps {
  accountDropDownRef: React.RefObject<HTMLDivElement>;
  allAccounts: Array<Account>;
  currentAccountName: string;
  publicKey: string;
}

export const AccountHeader = ({
  accountDropDownRef,
  allAccounts,
  currentAccountName,
  publicKey,
}: AccountHeaderProps) => {
  const { isTestnet } = useSelector(settingsNetworkDetailsSelector);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (dropdownRef.current != null) {
      dropdownRef.current.style.maxHeight = isDropdownOpen
        ? `${(allAccounts.length + 2) * 6}rem`
        : "0";
    }
  }, [allAccounts, isDropdownOpen]);

  return (
    <div className="AccountHeader" ref={accountDropDownRef}>
      <div
        className="AccountHeader__icon-btn"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <AccountListIdenticon
          active
          accountName={currentAccountName}
          publicKey={publicKey}
        />
      </div>
      <div className="AccountHeader__network-wrapper">
        <div
          className={`AccountHeader__network-icon ${
            isTestnet ? "testnet" : "mainnet"
          }`}
        />
        <div className="AccountHeader__network-copy">
          {isTestnet ? "TEST NET" : "MAIN NET"}
        </div>
      </div>
      <ul ref={dropdownRef} className="AccountHeader__options-dropdown">
        {allAccounts.map(
          ({ publicKey: accountPublicKey, name: accountName, imported }) => {
            const isSelected = publicKey === accountPublicKey;

            return (
              <li
                className="AccountHeader__account-list-item"
                key={`account-${accountName}`}
              >
                <AccountListIdenticon
                  displayKey
                  accountName={accountName}
                  active={isSelected}
                  publicKey={accountPublicKey}
                  setIsDropdownOpen={setIsDropdownOpen}
                >
                  {imported ? <ImportedTagEl /> : null}
                </AccountListIdenticon>
                <span className="AccountHeader--option-check">
                  {isSelected ? <Icon.Check /> : null}
                </span>
              </li>
            );
          },
        )}
        <hr className="AccountHeader__list-divider" />
        <li className="AccountHeader__option-list-item">
          <Link
            className="AccountHeader__option-link"
            to={{
              pathname: ROUTES.addAccount,
              state: {
                header: "Create a new Stellar address",
                cta: "Add address",
              },
            }}
          >
            <div className="AccountHeader__option-icon">
              <Icon.PlusCircle />
            </div>
            <span className="AccountHeader__option-link-copy">
              Create a new Stellar address
            </span>
          </Link>
        </li>
        <li className="AccountHeader__option-list-item">
          <Link
            className="AccountHeader__option-link"
            to={ROUTES.importAccount}
          >
            <div className="AccountHeader__option-icon">
              <Icon.Download />
            </div>
            <span className="AccountHeader__option-link-copy">
              Import a Stellar secret key
            </span>
          </Link>
        </li>
        <li className="AccountHeader__option-list-item">
          <Link
            className="AccountHeader__option-link"
            to={ROUTES.connectWallet}
          >
            <div className="AccountHeader__option-icon">
              <img
                className="AccountHeader__img-cube-icon"
                src={IconCube}
                alt=""
              />
            </div>
            <span className="AccountHeader__option-link-copy">
              Connect a hardware wallet
            </span>
          </Link>
        </li>
      </ul>
      <div
        onClick={() => setIsDropdownOpen(false)}
        className={`AccountHeader__dropdown-background ${
          isDropdownOpen ? "activate" : null
        }`}
      ></div>
    </div>
  );
};
