import React from "react";
import { Icon, Loader } from "@stellar/design-system";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { truncatedPublicKey } from "helpers/stellar";

import "./styles.scss";

interface WalletRowProps {
  isFetchingTokenPrices: boolean;
  accountName: string;
  /** Display-ready USD total from the data hook: an amount, a zero, or the
   * no-value placeholder. Absent only while it is still being fetched. */
  accountValue?: string;
  isSelected: boolean;
  publicKey: string;
  onClick: (publicKey: string) => unknown;
}

export const WalletRow = ({
  isFetchingTokenPrices,
  accountName,
  accountValue,
  isSelected,
  publicKey,
  onClick,
}: WalletRowProps) => {
  const shortPublicKey = truncatedPublicKey(publicKey);

  // Totals arrive in batches, so a resolved row keeps its value while the
  // rows behind it are still loading.
  const isTotalLoading = !accountValue && isFetchingTokenPrices;
  // The data hook decides zero-vs-unavailable via getTotalUsdLabel and hands
  // down the finished label, so there is nothing to interpret here.
  const balanceLabel = accountValue ?? "";

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
        <p className="detail-address">{shortPublicKey}</p>
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
