import React from "react";
import { Icon } from "@stellar/design-system";

import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";

import { Account } from "@shared/api/types";

import "./styles.scss";

export const ImportedTag = () => (
  <span className="AccountList__option-tag">&bull; Imported</span>
);

interface AccountListItemProps {
  accountName: string;
  isSelected: boolean;
  accountPublicKey: string;
  setIsDropdownOpen: (isDropdownOpen: boolean) => void;
  imported: boolean;
}

export const AccountListItem = ({
  accountName,
  isSelected,
  accountPublicKey,
  setIsDropdownOpen,
  imported,
}: AccountListItemProps) => (
  <li className="AccountList__item" key={`account-${accountName}`}>
    <AccountListIdenticon
      displayKey
      accountName={accountName}
      active={isSelected}
      publicKey={accountPublicKey}
      setIsDropdownOpen={setIsDropdownOpen}
    >
      {imported ? <ImportedTag /> : null}
    </AccountListIdenticon>
    <span className="AccountList__option-check">
      {isSelected ? <Icon.Check /> : null}
    </span>
  </li>
);

interface AccounsListProps {
  allAccounts: Array<Account>;
  publicKey: string;
  setIsDropdownOpen: (isDropdownOpen: boolean) => void;
}

export const AccountList = ({
  allAccounts,
  publicKey,
  setIsDropdownOpen,
}: AccounsListProps) => (
  <>
    {allAccounts.map(
      ({ publicKey: accountPublicKey, name: accountName, imported }) => {
        const isSelected = publicKey === accountPublicKey;

        return (
          <AccountListItem
            accountName={accountName}
            isSelected={isSelected}
            accountPublicKey={accountPublicKey}
            setIsDropdownOpen={setIsDropdownOpen}
            imported={imported}
            key={`${accountPublicKey}-${accountName}`}
          />
        );
      },
    )}
  </>
);
