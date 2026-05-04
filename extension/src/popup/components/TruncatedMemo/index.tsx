import React from "react";
import { useTranslation } from "react-i18next";

import "./styles.scss";

interface TruncatedMemoProps {
  memo?: string | null;
  fallback?: string;
  inline?: boolean;
  className?: string;
  "data-testid"?: string;
}

export const TruncatedMemo = ({
  memo,
  fallback,
  inline = false,
  className,
  "data-testid": testId,
}: TruncatedMemoProps) => {
  const { t } = useTranslation();
  const hasMemo = !!memo;
  const display = hasMemo ? memo : fallback ?? t("None");
  const title = hasMemo ? (memo as string) : undefined;
  const classes = [
    "TruncatedMemo",
    inline ? "TruncatedMemo--inline" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (inline) {
    return (
      <span className={classes} title={title} data-testid={testId}>
        {display}
      </span>
    );
  }

  return (
    <div className={classes} title={title} data-testid={testId}>
      {display}
    </div>
  );
};
