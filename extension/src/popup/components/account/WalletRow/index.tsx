import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { truncatedPublicKey } from "helpers/stellar";
import { WalletType } from "@shared/constants/hardwareWallet";

import "./styles.scss";

interface WalletRowProps {
  isFetchingTokenPrices: boolean;
  accountName: string;
  accountValue: string;
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

  // Balance is its own cell now. While prices are still loading we show an
  // ellipsis rather than an empty gap, matching the previous subtitle behavior.
  const balanceLabel = accountValue || (isFetchingTokenPrices ? "..." : "");

  return (
    <div
      className="WalletRow"
      onClick={() => onClick(publicKey)}
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
        {balanceLabel}
      </div>
    </div>
  );
};
