import React from "react";
import { Icon, Text } from "@stellar/design-system";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { emitMetric } from "helpers/metrics";

import { HorizonOperation } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { AccountBalances } from "helpers/hooks/useGetBalances";

import { OperationDataRow } from "popup/views/AccountHistory/hooks/useGetHistoryData";

import "./styles.scss";

interface ActionIconProps {
  actionType: string | null;
}

const ActionIcon = ({ actionType }: ActionIconProps) => {
  const renderIcon = () => {
    switch (actionType) {
      case "sent": {
        return <Icon.ArrowCircleUp />;
      }
      case "received": {
        return <Icon.ArrowCircleDown />;
      }
      case "swap": {
        return <Icon.RefreshCcw03 />;
      }
      case "contractInteraction": {
        return <Icon.FileCode02 />;
      }
      case "failed": {
        return <Icon.AlertCircle />;
      }
      case "add": {
        return <Icon.PlusCircle />;
      }
      case "remove": {
        return <Icon.MinusCircle />;
      }
      case "genericAction": {
        return <Icon.CheckCircle />;
      }

      default:
        return <></>;
    }
  };

  return <div className="HistoryItem__action-icon">{renderIcon()}</div>;
};

export type HistoryItemOperation = HorizonOperation & {
  isCreateExternalAccount: boolean;
  isPayment: boolean;
  isSwap: boolean;
  isDustPayment: boolean;
};

interface HistoryItemProps {
  accountBalances: AccountBalances;
  operation: OperationDataRow;
  publicKey: string;
  networkDetails: NetworkDetails;
  setActiveHistoryDetailId: (id: string) => void;
}

export const HistoryItem = ({
  operation,
  setActiveHistoryDetailId,
}: HistoryItemProps) => {
  return (
    <div
      data-testid="history-item"
      className="HistoryItem"
      onClick={() => {
        emitMetric(METRIC_NAMES.historyOpenItem);
        setActiveHistoryDetailId(operation.id);
      }}
    >
      <div className="HistoryItem__row">
        <div className="HistoryItem__row HistoryItem--space-between">
          <div className="HistoryItem__row">
            <div className="HistoryItem__icon">{operation.rowIcon}</div>
            <Text
              as="div"
              size="md"
              weight="regular"
              addlClassName="HistoryItem__description"
            >
              <span data-testid="history-item-label">{operation.rowText}</span>
              <Text
                as="div"
                size="xs"
                weight="regular"
                addlClassName="HistoryItem--action"
              >
                <ActionIcon actionType={operation.actionIcon} />
                {operation.action}
              </Text>
            </Text>
          </div>
          <div
            className={`HistoryItem__amount ${operation.amount?.startsWith("+") ? "credit" : "debit"}`}
            data-testid="history-item-amount-component"
          >
            <span className="HistoryItem--amount">{operation.amount}</span>
            <Text
              as="div"
              size="xs"
              weight="regular"
              addlClassName="HistoryItem--date"
            >
              {operation.date}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};
