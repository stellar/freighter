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
  /** Pre-formatted max-spendable amount shown in the insufficient-balance
   * error (e.g. "123.23"); the token code is taken from assetCode. */
  maxSpendableText?: string;
  isReadOnly?: boolean;
  autoFocus?: boolean;
  /** Optional handle to the amount input so a parent can focus it (e.g. the
   * swap "Enter an amount" CTA focuses the sell card). */
  amountInputRef?: React.RefObject<HTMLInputElement | null>;
  /** Fired when the amount input gains/loses focus, so a parent can track it
   * (e.g. the swap CTA disables itself while the sell input is focused). */
  onInputFocus?: () => void;
  onInputBlur?: () => void;
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
  maxSpendableText = "",
  isReadOnly = false,
  autoFocus = true,
  amountInputRef,
  onInputFocus,
  onInputBlur,
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
  const localInputRef = useRef<HTMLInputElement>(null);
  // Use the caller's ref when provided so a parent can focus the input.
  const inputRef = amountInputRef ?? localInputRef;
  const [inputWidthCrypto, setInputWidthCrypto] = useState(0);
  const [inputWidthFiat, setInputWidthFiat] = useState(0);

  // Re-measure on font-class changes too (not just value changes): the
  // read-only receive card's inputType flips from the sell card's toggle
  // without its own value changing, so a font-size-bucket change would
  // otherwise leave a stale width and clip the value.
  useLayoutEffect(() => {
    if (cryptoSpanRef.current) {
      setInputWidthCrypto(cryptoSpanRef.current.offsetWidth + 2);
    }
  }, [amount, amountFontSizeClass]);

  useLayoutEffect(() => {
    if (fiatSpanRef.current) {
      setInputWidthFiat(fiatSpanRef.current.offsetWidth + 4);
    }
  }, [amountUsd, amountFontSizeClass]);

  const isSuspicious =
    securityLevel === SecurityLevel.MALICIOUS ||
    securityLevel === SecurityLevel.SUSPICIOUS;
  const isMalicious = securityLevel === SecurityLevel.MALICIOUS;

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
        {/* Focus the input when anywhere between the amount and the asset
            picker is clicked, not just the (content-width) input itself. */}
        <div
          className="AmountCard__amount-input-container"
          onClick={isReadOnly ? undefined : () => inputRef.current?.focus()}
          style={isReadOnly ? undefined : { cursor: "text" }}
        >
          {/* Hidden mirrors used to size each input to its content. BOTH are
              always rendered so the inactive input's width is measured before
              the first crypto<->fiat toggle — otherwise the toggled-in input
              briefly falls back to DEFAULT_INPUT_WIDTH and the value is clipped
              for a frame (§ task 8). */}
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
          {inputType === "crypto" && (
            <input
              ref={inputRef}
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
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              autoFocus={autoFocus}
              autoComplete="off"
            />
          )}
          {inputType === "fiat" && (
            <>
              <div
                className={`AmountCard__amount-label-usd AmountCard__${amountFontSizeClass}`}
              >
                $
              </div>
              <input
                ref={inputRef}
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
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                autoFocus={autoFocus}
                autoComplete="off"
              />
            </>
          )}
        </div>
        <button
          type="button"
          className={`AmountCard__asset-selector-inline${
            assetCode ? "" : " AmountCard__asset-selector-inline--empty"
          }`}
          onClick={onSelectAsset}
          data-testid="send-amount-edit-dest-asset"
          aria-label={assetCode ? t("Change asset") : t("Select")}
        >
          {assetCode ? (
            <>
              <AssetIcon
                assetIcons={
                  assetIssuerKey || assetCode !== "XLM" ? assetIcons : {}
                }
                code={assetCode}
                issuerKey={assetIssuerKey}
                icon={assetIcon}
                isSuspicious={isSuspicious}
                isMalicious={isMalicious}
              />
              <span className="AmountCard__asset-code">{assetCode}</span>
              <Icon.ChevronDown />
            </>
          ) : (
            <>
              <span className="AmountCard__select-icon">
                <Icon.Plus />
              </span>
              <span className="AmountCard__asset-code">{t("Select")}</span>
              <Icon.ChevronDown />
            </>
          )}
        </button>
      </div>

      {/* The fiat line is always shown (callers pass "$0.00"/"--" when there is
          no value); only the input-type toggle depends on a usable USD price. */}
      <div className="AmountCard__balance-row">
        <div className="AmountCard__amount-price">
          {fiatLineText}
          {/* Read-only cards (e.g. the swap "You receive" card) show the fiat
              value but cannot toggle input type, so omit the toggle. The toggle
              also needs a usable USD price. */}
          {!isReadOnly && supportsUsd && (
            <Button
              size="md"
              type="button"
              isRounded
              variant="tertiary"
              data-testid="amount-fiat-toggle"
              onClick={(e) => {
                e.preventDefault();
                onToggleInputType();
              }}
            >
              <Icon.RefreshCw03 />
            </Button>
          )}
        </div>
      </div>

      {isAmountTooHigh && (
        <div className="AmountCard__invalid-state">
          <Icon.AlertCircle />
          <span>
            {t(
              "Insufficient balance. Maximum spendable: {{amount}} {{symbol}}",
              {
                amount: maxSpendableText,
                symbol: assetCode,
              },
            )}
          </span>
        </div>
      )}
    </div>
  );
};
