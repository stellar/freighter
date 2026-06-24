import React, { useLayoutEffect, useRef, useState } from "react";
import { Button, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AssetIcon } from "popup/components/account/AccountAssets";
import { AssetIcons } from "@shared/api/types";
import { SecurityLevel } from "popup/constants/blockaid";
import { InputType } from "helpers/transaction";
import { formatAmountPreserveCursor } from "popup/helpers/formatters";
import { useRunAfterUpdate } from "popup/helpers/useRunAfterUpdate";

import "./styles.scss";

const DEFAULT_INPUT_WIDTH = 25;

export interface AmountCardProps {
  label: string;
  availableBalanceText: string;
  availableBalanceFontSizePx: number;
  inputType: InputType;
  amount: string;
  amountUsd: string;
  amountFontSizeClass: "lg" | "med" | "small" | "xsmall";
  assetCode: string;
  assetIcon?: string | null;
  assetIcons: AssetIcons;
  assetIssuerKey?: string;
  securityLevel?: SecurityLevel;
  supportsUsd: boolean;
  fiatLineText: string;
  isAmountTooHigh: boolean;
  isReadOnly?: boolean;
  autoFocus?: boolean;
  cryptoDecimals: number;
  onAmountChange: (next: { amount: string; newCursor: number }) => void;
  onAmountUsdChange: (next: { amount: string; newCursor: number }) => void;
  onToggleInputType: () => void;
  onSelectAsset: () => void;
}

export const AmountCard = ({
  label,
  availableBalanceText,
  availableBalanceFontSizePx,
  inputType,
  amount,
  amountUsd,
  amountFontSizeClass,
  assetCode,
  assetIcon,
  assetIcons,
  assetIssuerKey,
  securityLevel,
  supportsUsd,
  fiatLineText,
  isAmountTooHigh,
  isReadOnly = false,
  autoFocus = true,
  cryptoDecimals,
  onAmountChange,
  onAmountUsdChange,
  onToggleInputType,
  onSelectAsset,
}: AmountCardProps) => {
  const { t } = useTranslation();
  const runAfterUpdate = useRunAfterUpdate();

  // Width owned internally (replaces InputWidthContext, per design §3.3).
  const cryptoSpanRef = useRef<HTMLSpanElement>(null);
  const fiatSpanRef = useRef<HTMLSpanElement>(null);
  const [inputWidthCrypto, setInputWidthCrypto] = useState(0);
  const [inputWidthFiat, setInputWidthFiat] = useState(0);

  useLayoutEffect(() => {
    if (cryptoSpanRef.current) {
      setInputWidthCrypto(cryptoSpanRef.current.offsetWidth + 2);
    }
  }, [amount]);

  useLayoutEffect(() => {
    if (fiatSpanRef.current) {
      setInputWidthFiat(fiatSpanRef.current.offsetWidth + 4);
    }
  }, [amountUsd]);

  const isSuspicious =
    securityLevel === SecurityLevel.MALICIOUS ||
    securityLevel === SecurityLevel.SUSPICIOUS;

  const fontClass = `AmountCard__input-amount AmountCard__${amountFontSizeClass}`;

  return (
    <div className="AmountCard">
      <div className="AmountCard__sending-label">
        <span>{label}</span>
        <span
          className="AmountCard__available-balance"
          style={{ fontSize: `${availableBalanceFontSizePx}px` }}
        >
          {availableBalanceText}
        </span>
      </div>

      <div className="AmountCard__amount-row">
        <div className="AmountCard__amount-input-container">
          {inputType === "crypto" && (
            <>
              <span
                ref={cryptoSpanRef}
                className={fontClass}
                style={{
                  position: "absolute",
                  visibility: "hidden",
                  whiteSpace: "pre",
                }}
              >
                {amount || "0"}
              </span>
              <input
                className={fontClass}
                style={{
                  width: `${inputWidthCrypto || DEFAULT_INPUT_WIDTH}px`,
                }}
                data-testid="send-amount-amount-input"
                name="amount"
                type="text"
                placeholder="0"
                value={amount}
                disabled={isReadOnly}
                onChange={(e) => {
                  const input = e.target;
                  const next = formatAmountPreserveCursor(
                    e.target.value,
                    amount,
                    cryptoDecimals,
                    e.target.selectionStart || 1,
                  );
                  onAmountChange(next);
                  runAfterUpdate(() => {
                    input.selectionStart = next.newCursor;
                    input.selectionEnd = next.newCursor;
                  });
                }}
                autoFocus={autoFocus}
                autoComplete="off"
              />
            </>
          )}
          {inputType === "fiat" && (
            <>
              <div
                className={`AmountCard__amount-label-usd AmountCard__${amountFontSizeClass}`}
              >
                $
              </div>
              <span
                ref={fiatSpanRef}
                className={fontClass}
                style={{
                  position: "absolute",
                  visibility: "hidden",
                  whiteSpace: "pre",
                }}
              >
                {amountUsd || "0"}
              </span>
              <input
                className={fontClass}
                style={{
                  width: `${inputWidthFiat || DEFAULT_INPUT_WIDTH}px`,
                }}
                data-testid="send-amount-amount-input"
                name="amountUsd"
                type="text"
                value={amountUsd}
                disabled={isReadOnly}
                onChange={(e) => {
                  const input = e.target;
                  const next = formatAmountPreserveCursor(
                    e.target.value,
                    amountUsd,
                    2,
                    e.target.selectionStart || 1,
                  );
                  onAmountUsdChange(next);
                  runAfterUpdate(() => {
                    input.selectionStart = next.newCursor;
                    input.selectionEnd = next.newCursor;
                  });
                }}
                autoFocus={autoFocus}
                autoComplete="off"
                onFocus={(e) => e.target.select()}
              />
            </>
          )}
        </div>
        <button
          type="button"
          className="AmountCard__asset-selector-inline"
          onClick={onSelectAsset}
          data-testid="send-amount-edit-dest-asset"
          aria-label={t("Change asset")}
          disabled={isReadOnly}
        >
          <AssetIcon
            assetIcons={assetIssuerKey || assetCode !== "XLM" ? assetIcons : {}}
            code={assetCode}
            issuerKey={assetIssuerKey}
            icon={assetIcon}
            isSuspicious={isSuspicious}
          />
          <span className="AmountCard__asset-code">{assetCode}</span>
          <Icon.ChevronDown />
        </button>
      </div>

      {supportsUsd && (
        <div className="AmountCard__balance-row">
          <div className="AmountCard__amount-price">
            {fiatLineText}
            <Button
              size="md"
              type="button"
              isRounded
              variant="tertiary"
              onClick={(e) => {
                e.preventDefault();
                onToggleInputType();
              }}
            >
              <Icon.RefreshCw03 />
            </Button>
          </div>
        </div>
      )}

      {isAmountTooHigh && (
        <div className="AmountCard__invalid-state">
          <Icon.AlertCircle />
          <span>
            {t("You don’t have enough {{asset}} in your account", {
              asset: assetCode,
            })}
          </span>
        </div>
      )}
    </div>
  );
};
