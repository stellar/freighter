import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";
import classNames from "classnames";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { truncatedPublicKey } from "helpers/stellar";
import { getColorPubKey } from "helpers/stellarIdenticon";
import { WalletType } from "@shared/constants/hardwareWallet";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";

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
  setOptionsOpen: (publicKey: string) => unknown;
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
  setOptionsOpen,
}: WalletRowProps) => {
  const shortPublicKey = truncatedPublicKey(publicKey);
  const identiconWrapperStyles = classNames("identicon-wrapper", {
    "is-selected": isSelected,
  });
  const selectedBorderColorRgb = getColorPubKey(publicKey);
  const isSelectedColor = `rgb(${selectedBorderColorRgb.r} ${selectedBorderColorRgb.g} ${selectedBorderColorRgb.b} / 100%`;
  const borderColor = isSelected ? isSelectedColor : "#232323";

  let subTitle = accountValue
    ? `${shortPublicKey} - ${accountValue}`
    : shortPublicKey;
  if (isFetchingTokenPrices && !accountValue) {
    subTitle = `${shortPublicKey} - ...`;
  }
  const { t } = useTranslation();
  const walletIdentifier =
    hardwareWalletType || isImported ? t("Imported") : "";
  return (
    <div className="WalletRow">
      <div
        className="WalletRow__identicon"
        onClick={() => onClick(publicKey)}
        data-testid="wallet-row-select"
      >
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
      <div className="WalletRow__details" onClick={() => onClick(publicKey)}>
        <p className="detail-name">{accountName}</p>
        <p className="detail-short-key">{subTitle}</p>
        <p className="detail-short-key">{walletIdentifier}</p>
      </div>
      <div
        className="WalletRow__options"
        data-testid="wallet-row-options"
        onClick={() => setOptionsOpen(publicKey)}
      >
        <img src={IconEllipsis} alt={t("wallet action options")} />
      </div>
    </div>
  );
};
