import React from "react";

import { formatAccountUsd } from "popup/components/earn/helpers/formatPoolStats";
import { NO_FIAT_VALUE } from "popup/helpers/formatters";

import { getGainModifier } from "./positionFigures";

/**
 * The building blocks the pool and token position screens share, styled by
 * the `PositionScreen` block in this folder's styles.
 */

/** A section's small grey heading over its content. */
export const Section = ({
  title,
  children,
  className,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  /** A block of the host's own, for styles scoped under it. */
  className?: string;
  testId?: string;
}) => (
  <div
    className={`PositionScreen__section${className ? ` ${className}` : ""}`}
    data-testid={testId}
  >
    <div className="PositionScreen__section-title">{title}</div>
    {children}
  </div>
);

/**
 * A position screen's headline: what it holds in USD, and the gain line under
 * it, grey when unknown or a loss.
 */
export const PositionFigures = ({
  mark,
  totalUsd,
  gain,
  gainValue,
  testIdPrefix,
}: {
  /** Shown above the total, as the token screen's token icon. */
  mark?: React.ReactNode;
  totalUsd: number | null;
  /** The formatted gain line; null reads as unknown. */
  gain: string | null;
  /** The figure the gain's colour follows. */
  gainValue: number | null;
  /** Prefixes the total's and gain's test ids, e.g. "token-position". */
  testIdPrefix: string;
}) => (
  <div className="PositionScreen__figures">
    {mark && <div className="PositionScreen__token-mark">{mark}</div>}
    <div
      className="PositionScreen__total"
      data-testid={`${testIdPrefix}-total`}
    >
      {formatAccountUsd(totalUsd)}
    </div>
    <div
      className={`PositionScreen__gain${getGainModifier(
        "PositionScreen__gain",
        gainValue,
      )}`}
      data-testid={`${testIdPrefix}-gain`}
    >
      {gain ?? NO_FIAT_VALUE}
    </div>
  </div>
);

/**
 * One token line: its icon, its code with an optional green line under it,
 * and a value over the token amount on the right. A card by default; a button
 * when it opens something.
 */
export const PositionTokenLine = ({
  icon,
  code,
  subtitle,
  subtitleTestId,
  value,
  valueClassName = "PositionScreen__primary",
  valueTestId,
  amount,
  isCard = true,
  onClick,
  testId,
}: {
  icon: React.ReactNode;
  code: string;
  subtitle?: string;
  subtitleTestId?: string;
  value: string;
  valueClassName?: string;
  valueTestId?: string;
  /** The token amount with its code, e.g. "1,218.6488 USDC". */
  amount: string;
  /** Draws the grey card around the line; off inside a card of its own. */
  isCard?: boolean;
  onClick?: () => void;
  testId?: string;
}) => {
  const className = `${isCard ? "PositionScreen__card " : ""}PositionScreen__token`;
  const content = (
    <>
      {icon}
      <span className="PositionScreen__token__name">
        <span className="PositionScreen__primary">{code}</span>
        {subtitle && (
          <span
            className="PositionScreen__positive-small"
            data-testid={subtitleTestId}
          >
            {subtitle}
          </span>
        )}
      </span>
      <span className="PositionScreen__token__figures">
        <span className={valueClassName} data-testid={valueTestId}>
          {value}
        </span>
        <span className="PositionScreen__secondary-small">{amount}</span>
      </span>
    </>
  );

  return onClick ? (
    <button
      type="button"
      className={className}
      onClick={onClick}
      data-testid={testId}
    >
      {content}
    </button>
  ) : (
    <div className={className} data-testid={testId}>
      {content}
    </div>
  );
};
