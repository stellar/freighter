import React from "react";
import { Icon } from "@stellar/design-system";
import { Account } from "@shared/api/types";

import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { WalletType } from "@shared/constants/hardwareWallet";

import "./styles.scss";

export const OptionTag = ({
  hardwareWalletType = WalletType.NONE,
  imported,
}: {
  hardwareWalletType?: WalletType;
  imported: boolean;
}) => {
  if (!hardwareWalletType && !imported) {
    return null;
  }
  return (
    <span className="AccountList__option-tag">
      &bull; {hardwareWalletType || "Imported"}
    </span>
  );
};

interface AccountListItemProps {
  accountName: string;
  isSelected: boolean;
  accountPublicKey: string;
  setIsDropdownOpen: (isDropdownOpen: boolean) => void;
  imported: boolean;
  hardwareWalletType?: WalletType;
  setLoading?: (isLoading: boolean) => void;
}

export const AccountListItem = ({
  accountName,
  isSelected,
  accountPublicKey,
  setIsDropdownOpen,
  imported,
  hardwareWalletType = WalletType.NONE,
  setLoading,
}: AccountListItemProps) => (
  <li
    className="AccountList__item"
    key={`account-${accountName}`}
    data-testid="account-list-item"
  >
    <AccountListIdenticon
      displayKey
      accountName={accountName}
      active={isSelected}
      publicKey={accountPublicKey}
      setIsDropdownOpen={setIsDropdownOpen}
      setLoading={setLoading}
    >
      <OptionTag imported={imported} hardwareWalletType={hardwareWalletType} />
    </AccountListIdenticon>
    <span className="AccountList__option-check">
      {isSelected ? <Icon.CheckCircle /> : null}
    </span>
  </li>
);

interface AccounsListProps {
  allAccounts: Account[];
  publicKey: string;
  setIsDropdownOpen: (isDropdownOpen: boolean) => void;
  setLoading?: (isLoading: boolean) => void;
}

export const AccountList = ({
  allAccounts,
  publicKey,
  setIsDropdownOpen,
  setLoading,
}: AccounsListProps) => (
  <div className="AccountList__accountsWrapper View__inset--scroll-shadows">
    {allAccounts.map(
      ({
        publicKey: accountPublicKey,
        name: accountName,
        imported,
        hardwareWalletType,
      }) => {
        const isSelected = publicKey === accountPublicKey;

        return (
          <AccountListItem
            accountName={accountName}
            isSelected={isSelected}
            accountPublicKey={accountPublicKey}
            setIsDropdownOpen={setIsDropdownOpen}
            imported={imported}
            hardwareWalletType={hardwareWalletType}
            key={`${accountPublicKey}-${accountName}`}
            setLoading={setLoading}
          />
        );
      },
    )}
  </div>
);
