import React from "react";
import { useTranslation } from "react-i18next";
import { Icon, Loader } from "@stellar/design-system";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { truncatedPublicKey } from "helpers/stellar";
import { NO_FIAT_VALUE, formatFiatAmount } from "popup/helpers/formatters";
import { WalletType } from "@shared/constants/hardwareWallet";

import "./styles.scss";

interface WalletRowProps {
  isFetchingTokenPrices: boolean;
  /** Whether this network prices tokens at all; false means no USD value
   * exists, as opposed to one that could not be read. */
  hasPriceFeed: boolean;
  accountName: string;
  /**
   * Pre-formatted USD total for this account. Absent (or empty, which the
   * data hook writes on a failed fetch) means "no total to show" — see
   * `isTotalLoading` below for how that is distinguished from "still
   * loading".
   */
  accountValue?: string;
  isImported: boolean;
  hardwareWalletType?: WalletType;
  isSelected: boolean;
  publicKey: string;
  onClick: (publicKey: string) => unknown;
}

export const WalletRow = ({
  isFetchingTokenPrices,
  hasPriceFeed,
  accountName,
  accountValue,
  isImported,
  hardwareWalletType,
  isSelected,
  publicKey,
  onClick,
}: WalletRowProps) => {
  const { t } = useTranslation();
  const shortPublicKey = truncatedPublicKey(publicKey);

  const isImportedWallet = !!hardwareWalletType || isImported;

  // Totals arrive in batches, so a resolved row keeps its value while the
  // rows behind it are still loading.
  const isTotalLoading = !accountValue && isFetchingTokenPrices;
  // Zero is accurate where there is no price feed. Everywhere else an absent
  // total means prices or balances could not be read, which the placeholder
  // states rather than asserting a balance the account may not have. The falsy
  // check covers both "not fetched" and the "" written for a failed fetch.
  const balanceLabel =
    accountValue || (hasPriceFeed ? NO_FIAT_VALUE : formatFiatAmount());

  return (
    // role/aria-current match BalanceRow, the sibling list row. The active
    // account is otherwise conveyed only by the badge on its avatar, which
    // says nothing to a screen reader.
    <div
      className="WalletRow"
      onClick={() => onClick(publicKey)}
      role="button"
      aria-current={isSelected ? true : undefined}
      data-testid="wallet-row-select"
    >
      <div className="WalletRow__identicon">
        <div className="identicon-wrapper">
          <IdenticonImg publicKey={publicKey} />
        </div>
        {isSelected ? (
          <div className="WalletRow__identicon__selected-check">
            <Icon.Check />
          </div>
        ) : null}
      </div>
      <div className="WalletRow__details">
        <p className="detail-name">{accountName}</p>
        <p className="detail-address">
          {shortPublicKey}
          {isImportedWallet ? (
            <>
              {/* Decorative separator; the address and label are already
                  distinct to a screen reader without it. */}
              <span className="detail-separator" aria-hidden="true">
                •
              </span>
              <span className="detail-imported">{t("Imported")}</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="WalletRow__balance" data-testid="wallet-row-balance">
        {isTotalLoading ? (
          // SDS `Loader` takes only `size`, so the testid goes on a wrapper.
          <span data-testid="wallet-row-balance-spinner">
            <Loader size="1rem" />
          </span>
        ) : (
          balanceLabel
        )}
      </div>
    </div>
  );
};
