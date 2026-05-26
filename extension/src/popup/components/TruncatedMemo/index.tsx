import React from "react";
import { useTranslation } from "react-i18next";

import "./styles.scss";

interface TruncatedMemoProps {
  memo?: string | null;
  fallback?: string;
  inline?: boolean;
  /**
   * Optional character limit. When set, memos longer than `maxChars` are
   * pre-truncated with an ellipsis before being handed to CSS. Useful in
   * tight popup layouts where the value cell shares its row with a fixed
   * suffix (e.g. a memo-type tag) and CSS-only ellipsis would still let
   * the value push past its share.
   */
  maxChars?: number;
  className?: string;
  "data-testid"?: string;
}

const ellipsize = (value: string, maxChars: number) =>
  value.length > maxChars ? `${value.slice(0, maxChars).trimEnd()}…` : value;

export const TruncatedMemo = ({
  memo,
  fallback,
  inline = false,
  maxChars,
  className,
  "data-testid": dataTestId,
}: TruncatedMemoProps) => {
  const { t } = useTranslation();
  const hasMemo = !!memo;
  const fullMemo = hasMemo ? (memo as string) : "";
  const fallbackText = fallback ?? t("None");
  const displayValue = hasMemo
    ? maxChars
      ? ellipsize(fullMemo, maxChars)
      : fullMemo
    : fallbackText;
  const Tag = inline ? "span" : "div";
  const classes = ["TruncatedMemo", className].filter(Boolean).join(" ");

  return (
    <Tag
      className={classes}
      title={hasMemo ? fullMemo : undefined}
      data-testid={dataTestId}
    >
      {displayValue}
    </Tag>
  );
};
