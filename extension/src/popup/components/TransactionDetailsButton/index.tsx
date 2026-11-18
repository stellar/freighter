import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import "./styles.scss";

interface TransactionDetailsButtonProps {
  onClick: () => void;
  className?: string;
  testId?: string;
}

/**
 * The "Transaction details" button under a review's summary, the same on
 * Send, Swap and Earn: it opens the full transaction breakdown.
 */
export const TransactionDetailsButton = ({
  onClick,
  className,
  testId,
}: TransactionDetailsButtonProps) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={`TransactionDetailsButton${className ? ` ${className}` : ""}`}
      data-testid={testId}
      onClick={onClick}
    >
      <Icon.List />
      <span>{t("Transaction details")}</span>
    </button>
  );
};
