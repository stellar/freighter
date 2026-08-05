import React from "react";
import { Text } from "@stellar/design-system";

import { HistoryRowIcon } from "popup/components/accountHistory/HistoryRowIcon";
import { formatDetailTimestamp } from "popup/helpers/date";
import { HistoryEntry } from "popup/views/AccountHistory/model";

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
