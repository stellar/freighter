import React from "react";
import { useTranslation } from "react-i18next";
import { Icon, Loader } from "@stellar/design-system";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { truncatedPublicKey } from "helpers/stellar";
import { formatFiatAmount } from "popup/helpers/formatters";
import { WalletType } from "@shared/constants/hardwareWallet";

import "./styles.scss";

interface WalletRowProps {
  isFetchingTokenPrices: boolean;
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

  // Balance is its own cell. Mirrors the mobile app: a spinner only while
  // this account's total is genuinely still pending — totals arrive in
  // batches, so early rows show a real value while later ones are unresolved.
  // Once loading settles the total always shows, defaulting to $0.00 rather
  // than an empty cell. A falsy check (not `== null`) is deliberate: the data
  // hook writes "" for an account whose fetch threw, which is also "no total".
  const isTotalLoading = !accountValue && isFetchingTokenPrices;
  const balanceLabel = accountValue || formatFiatAmount();

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
