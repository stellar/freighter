import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { AvatarChip } from "popup/components/accountHistory/AvatarChip";
import { Account } from "@shared/api/types/types";
import {
  BalanceChangeRow,
  HistoryEntryDetails,
} from "popup/views/AccountHistory/model";

const AmountRow = ({ change }: { change: BalanceChangeRow }) => {
  const { t } = useTranslation();
  const isCredit = change.direction === "credit";
  const sign = isCredit ? "+" : "\u2212";
  const verb = isCredit ? t("Received") : t("Sent");

  return (
    <div className="AssetDiff__row" data-testid="balance-change-row">
      <div className={`AssetDiff__label ${isCredit ? "credit" : "debit"}`}>
        {isCredit ? <Icon.ArrowCircleDown /> : <Icon.ArrowCircleUp />}
        <span>{verb}</span>
      </div>
      <div
        className={`AssetDiff__value ${
          isCredit ? "credit" : "debit"
        } TransactionDetailSheet__balance-amount--${change.direction}`}
        data-testid="balance-change-amount"
      >
        {sign}
        {change.amount} {change.token.code}
      </div>
    </div>
  );
};

export const BalanceChangesCard = ({
  details,
  counterpartyDirection,
  allAccounts,
}: {
  details: HistoryEntryDetails;
  /** "to" for sends, "from" for receives, null when not directional */
  counterpartyDirection: "to" | "from" | null;
  allAccounts: Account[];
}) => {
  const { t } = useTranslation();

  if (details.balanceChanges.length < 1) {
    return null;
  }

  return (
    <div
      className="TransactionDetailModal__asset-diffs"
      data-testid="balance-changes-card"
    >
      {details.balanceChanges.map((change) => (
        <AmountRow
          key={`${change.direction}-${change.token.code}-${change.amount}`}
          change={change}
        />
      ))}

      {details.counterparty && counterpartyDirection ? (
        <div className="AssetDiff__to-from" data-testid="balance-counterparty">
          <div className="AssetDiff__label">
            <Icon.User01 />
            <span>{counterpartyDirection === "to" ? t("To") : t("From")}</span>
          </div>
          <div className="AssetDiff__value">
            <AvatarChip
              address={details.counterparty}
              allAccounts={allAccounts}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
