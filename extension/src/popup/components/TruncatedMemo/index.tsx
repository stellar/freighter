import React from "react";
import { useTranslation } from "react-i18next";

import "./styles.scss";

interface TruncatedMemoProps {
  memo?: string | null;
  inline?: boolean;
  className?: string;
  "data-testid"?: string;
}

export const TruncatedMemo = ({
  memo,
  inline = false,
  className,
  "data-testid": dataTestId,
}: TruncatedMemoProps) => {
  const { t } = useTranslation();
  const hasMemo = !!memo;
  const fullMemo = hasMemo ? (memo as string) : "";
  const displayValue = hasMemo ? fullMemo : t("None");
  const Tag = inline ? "span" : "div";
  const classes = [
    "TruncatedMemo",
    inline ? "TruncatedMemo--inline" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

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
