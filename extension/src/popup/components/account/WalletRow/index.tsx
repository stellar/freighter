import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";
import classNames from "classnames";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { truncatedPublicKey } from "helpers/stellar";
import { getColorPubKey } from "helpers/stellarIdenticon";
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
  const identiconWrapperStyles = classNames("identicon-wrapper", {
    "is-selected": isSelected,
  });
  const selectedBorderColorRgb = getColorPubKey(publicKey);
  const isSelectedColor = `rgb(${selectedBorderColorRgb.r} ${selectedBorderColorRgb.g} ${selectedBorderColorRgb.b} / 100%`;
  const borderColor = isSelected ? isSelectedColor : "var(--sds-clr-gray-03)";

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
        <div
          className={identiconWrapperStyles}
          style={{ borderColor: borderColor }}
        >
          <IdenticonImg publicKey={publicKey} />
        </div>
        {isSelected ? (
          <div
            className="WalletRow__identicon__selected-check"
            style={{ backgroundColor: isSelectedColor }}
          >
            <Icon.Check width="14px" height="14px" />
          </div>
        ) : null}
      </div>
      <div className="WalletRow__details">
        <p className="detail-name">{accountName}</p>
        <p className="detail-address">
          {shortPublicKey}
          {isImportedWallet ? (
            <span className="detail-imported">{t("Imported")}</span>
          ) : null}
        </p>
      </div>
      <div className="WalletRow__balance" data-testid="wallet-row-balance">
        {balanceLabel}
      </div>
    </div>
  );
};
