import React from "react";
import { Text } from "@stellar/design-system";

import { HistoryRowIcon } from "popup/components/accountHistory/HistoryRowIcon";
import { HistoryEntry } from "popup/views/AccountHistory/model";

/** "2024-04-08T14:33:00Z" → "Apr 8 2024 · 2:33pm" */
export const formatDetailTimestamp = (createdAt: string) => {
  const date = new Date(Date.parse(createdAt));
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s/g, "")
    .toLowerCase();
  return `${day} · ${time}`;
};

/**
 * Header for the detail drawer. Reuses the legacy `TransactionDetailModal`
 * title-row layout (icon + title + subtitle date) and adds the redesign's
 * right-aligned protocol domain.
 */
export const DetailHeader = ({ entry }: { entry: HistoryEntry }) => {
  const { details, rowIcon, createdAt } = entry;

  return (
    <div
      className="TransactionDetailModal__title-row"
      data-testid="detail-header"
    >
      <div className="TransactionDetailModal__icon">
        <HistoryRowIcon icon={rowIcon} />
      </div>
      <div className="TransactionDetailModal__title-details">
        <div
          className="TransactionDetailModal__title"
          data-testid="detail-header-title"
        >
          {details.title}
        </div>
        <Text
          as="div"
          size="xs"
          weight="regular"
          addlClassName="TransactionDetailModal__subtitle"
        >
          <span className="TransactionDetailModal__subtitle-date">
            {formatDetailTimestamp(createdAt)}
          </span>
        </Text>
      </div>
      <div className="TransactionDetailSheet__header-meta">
        {details.protocol ? (
          <Text
            as="div"
            size="xs"
            weight="regular"
            addlClassName="TransactionDetailSheet__header-domain"
          >
            <span data-testid="detail-header-domain">
              {details.protocol.domain}
            </span>
          </Text>
        ) : null}
      </div>
    </div>
  );
};
