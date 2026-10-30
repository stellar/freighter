import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";

import "./styles.scss";

interface AccountChipProps {
  accountName: string;
  publicKey: string;
  onClick: () => void;
}

/**
 * The account switcher in the top header: identicon, account name, chevron.
 *
 * Opens the account sheet. This replaces the name row that used to sit under
 * the header alongside the balance, which is why it keeps the
 * `account-view-account-name` test id rather than taking a new one.
 */
export const AccountChip = ({
  accountName,
  publicKey,
  onClick,
}: AccountChipProps) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="AccountChip"
      data-testid="account-chip"
      onClick={onClick}
      aria-label={t("Switch wallet")}
    >
      <div className="AccountChip__identicon">
        <IdenticonImg publicKey={publicKey} />
      </div>
      <div
        className="AccountChip__name"
        data-testid="account-view-account-name"
      >
        {accountName}
      </div>
      <Icon.ChevronDown />
    </button>
  );
};
