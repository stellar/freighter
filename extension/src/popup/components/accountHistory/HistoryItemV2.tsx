import React from "react";
import { Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { HistoryRowIcon } from "popup/components/accountHistory/HistoryRowIcon";
import { formatMonthDay } from "popup/helpers/date";
import { HistoryEntry } from "popup/views/AccountHistory/model";

import "./HistoryItemV2.scss";

type SecondaryIcon = HistoryEntry["secondaryIcon"];

const SecondaryActionIcon = ({ icon }: { icon: SecondaryIcon }) => {
  switch (icon) {
    case "sent":
      return <Icon.ArrowCircleUp />;
    case "received":
      return <Icon.ArrowCircleDown />;
    case "swap":
      return <Icon.RefreshCcw03 />;
    case "add":
      return <Icon.PlusCircle />;
    case "remove":
      return <Icon.MinusCircle />;
    case "globe":
      return <Icon.Globe01 />;
    case "contract":
      return <Icon.FileCode02 />;
    case "settings":
      return <Icon.Settings04 />;
    case "failed":
      return <Icon.AlertCircle />;
    default:
      return null;
  }
};

const RowAmounts = ({ amounts }: { amounts: HistoryEntry["amounts"] }) => {
  const { t } = useTranslation();

  if (amounts === null) {
    return null;
  }

  if (amounts === "multiple") {
    return (
      <span
        className="HistoryItemV2__amount HistoryItemV2__amount--multiple"
        data-testid="history-item-v2-amount"
      >
        {t("Multiple")}
      </span>
    );
  }

  return (
    <>
      {amounts.map((amount) => (
        <span
          key={`${amount.direction}-${amount.text}`}
          className={`HistoryItemV2__amount HistoryItemV2__amount--${amount.direction}`}
          data-testid="history-item-v2-amount"
        >
          {amount.text}
        </span>
      ))}
    </>
  );
};

interface HistoryItemV2Props {
  entry: HistoryEntry;
  onClick: (id: string) => void;
}

export const HistoryItemV2 = ({ entry, onClick }: HistoryItemV2Props) => (
  <div
    data-testid="history-item-v2"
    className="HistoryItemV2"
    onClick={() => {
      emitMetric(METRIC_NAMES.historyItemOpened, { source: "history_list" });
      onClick(entry.id);
    }}
  >
    <div className="HistoryItemV2__leading">
      <HistoryRowIcon icon={entry.rowIcon} />
    </div>

    <div className="HistoryItemV2__body">
      <Text
        as="div"
        size="sm"
        weight="medium"
        addlClassName="HistoryItemV2__primary"
      >
        <span data-testid="history-item-v2-primary">{entry.primaryText}</span>
      </Text>
      <Text
        as="div"
        size="xs"
        weight="regular"
        addlClassName="HistoryItemV2__secondary"
      >
        <span className="HistoryItemV2__secondary-icon">
          <SecondaryActionIcon icon={entry.secondaryIcon} />
        </span>
        <span data-testid="history-item-v2-secondary">
          {entry.secondaryText}
        </span>
      </Text>
    </div>

    <div className="HistoryItemV2__trailing">
      <div className="HistoryItemV2__amounts">
        <RowAmounts amounts={entry.amounts} />
      </div>
      <Text
        as="div"
        size="xs"
        weight="regular"
        addlClassName="HistoryItemV2__date"
      >
        {formatMonthDay(entry.createdAt)}
      </Text>
    </div>
  </div>
);
