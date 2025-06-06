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
  onClickAccount: (clickedPublicKey: string) => Promise<void>;
  imported: boolean;
  hardwareWalletType?: WalletType;
}

export const AccountListItem = ({
  accountName,
  isSelected,
  accountPublicKey,
  onClickAccount,
  imported,
  hardwareWalletType = WalletType.NONE,
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
      onClickAccount={onClickAccount}
    >
      <OptionTag imported={imported} hardwareWalletType={hardwareWalletType} />
    </AccountListIdenticon>
    <span className="AccountList__option-check">
      {isSelected ? <Icon.Check /> : null}
    </span>
  </li>
);

interface AccounsListProps {
  allAccounts: Account[];
  publicKey: string;
  onClickAccount: (clickedPublicKey: string) => Promise<void>;
}

export const AccountList = ({
  allAccounts,
  publicKey,
  onClickAccount,
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
            onClickAccount={onClickAccount}
            imported={imported}
            hardwareWalletType={hardwareWalletType}
            key={`${accountPublicKey}-${accountName}`}
          />
        );
      },
    )}
  </div>
);
