import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { Account } from "@shared/api/types";
import { Icon } from "@stellar/design-system";

import "./styles.scss";

const ImportedTagEl = () => (
  <span className="AccountHeader--option-tag">&#183; Imported</span>
);

interface AccountHeaderProps {
  accountDropDownRef: React.Ref<HTMLDivElement>;
  allAccounts: Array<Account>;
  currentAccountName: string;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (state: boolean) => void;
  publicKey: string;
}

export const AccountHeader = ({
  accountDropDownRef,
  allAccounts,
  currentAccountName,
  isDropdownOpen,
  setIsDropdownOpen,
  publicKey,
}: AccountHeaderProps) => {
  const { isTestnet } = useSelector(settingsNetworkDetailsSelector);

  return (
    <>
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
        <ul
          className={`AccountHeader__options-list ${
            isDropdownOpen ? "open" : "closed"
          }`}
        >
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
                  />
                  {imported ? <ImportedTagEl /> : null}
                  <span className="AccountHeader--option-check">
                    {isSelected ? <Icon.Check /> : null}
                  </span>
                </li>
              );
            },
          )}
          <hr className="AccountHeader--list-divider" />
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
        </ul>
      </div>
    </>
  );
};
