import React, { useEffect, useState } from "react";
import { camelCase } from "lodash";
import { useSelector } from "react-redux";
import { Icon } from "@stellar/design-system";
import { BigNumber } from "bignumber.js";
import { Horizon } from "stellar-sdk";

import { OPERATION_TYPES } from "constants/transaction";
import { HorizonOperation } from "@shared/api/types";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { PopupWrapper } from "popup/basics/PopupWrapper";

import { getAccountHistory } from "@shared/api/internal";

import { emitMetric } from "helpers/metrics";
import { openTab } from "popup/helpers/navigate";

import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { BottomNav } from "popup/components/BottomNav";

import "./styles.scss";

type HistoryOperation = HorizonOperation & { isPayment?: boolean };

const getIsPayment = (type: Horizon.OperationResponseType) =>
  [
    Horizon.OperationResponseType.payment,
    Horizon.OperationResponseType.pathPayment,
    Horizon.OperationResponseType.pathPaymentStrictSend,
  ].includes(type);

const HistoryItem = ({
  operation: {
    amount,
    asset_code: assetCode,
    created_at: createdAt,
    id,
    to,
    type,
    transaction_attr: { operation_count: operationCount },
    isPayment,
  },
  publicKey,
  url,
}: {
  operation: HistoryOperation;
  publicKey: string;
  url: string;
}) => {
  const operationType = camelCase(type) as keyof typeof OPERATION_TYPES;
  const operationString = OPERATION_TYPES[operationType];
  const date = new Date(Date.parse(createdAt))
    .toDateString()
    .split(" ")
    .slice(1, 3)
    .join(" ");
  const operationAssetCode = assetCode || "XLM";

  let isRecipient;
  let IconComponent = (
    <Icon.Shuffle className="AccountHistory__icon--default" />
  );
  let PaymentComponent = null as React.ReactElement | null;

  if (isPayment) {
    isRecipient = to === publicKey;
    PaymentComponent = (
      <>
        {isRecipient ? "+" : "-"}
        {new BigNumber(amount).toFixed(2).toString()} {operationAssetCode}
      </>
    );
    IconComponent = isRecipient ? (
      <Icon.ArrowDown className="AccountHistory__icon--received" />
    ) : (
      <Icon.ArrowUp className="AccountHistory__icon--sent" />
    );
  }

  const renderPaymentComponent = () => PaymentComponent;
  const renderIcon = () => IconComponent;

  return (
    <div
      onClick={() => {
        emitMetric(METRIC_NAMES.historyOpenItem);
        openTab(`${url}/op/${id}`);
      }}
    >
      <div className="AccountHistory__row">
        <div className="AccountHistory__icon">{renderIcon()}</div>
        <div className="AccountHistory__operation">
          {isPayment ? operationAssetCode : operationString}
          {operationCount > 1 && !isPayment
            ? ` + ${operationCount - 1} ops`
            : null}
          <div className="AccountHistory__date">
            {isRecipient ? "Received" : "Sent"} • {date}
          </div>
        </div>

        <div>{renderPaymentComponent()}</div>
      </div>
    </div>
  );
};

enum SELECTOR_OPTIONS {
  ALL = "ALL",
  SENT = "SENT",
  RECEIVED = "RECEIVED",
}

type HistorySegments = {
  [key in SELECTOR_OPTIONS]: HistoryOperation[] | [];
};

export const AccountHistory = () => {
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [selectedSegment, setSelectedSegment] = useState(SELECTOR_OPTIONS.ALL);
  const [historySegments, setHistorySegments] = useState({
    [SELECTOR_OPTIONS.ALL]: [],
  } as HistorySegments);

  const STELLAR_EXPERT_URL = `https://stellar.expert/explorer/${
    networkDetails.isTestnet ? "testnet" : "public"
  }`;

  useEffect(() => {
    const createSegments = (operations: HistoryOperation[]) => {
      const segments = {
        [SELECTOR_OPTIONS.ALL]: [] as HistoryOperation[],
        [SELECTOR_OPTIONS.SENT]: [] as HistoryOperation[],
        [SELECTOR_OPTIONS.RECEIVED]: [] as HistoryOperation[],
      };
      operations.forEach((operation) => {
        const isPayment = getIsPayment(operation.type);
        const historyOperation = { ...operation, isPayment };
        if (isPayment) {
          if (operation.source_account === publicKey) {
            segments[SELECTOR_OPTIONS.SENT].push(historyOperation);
          }
          if (operation.to === publicKey) {
            segments[SELECTOR_OPTIONS.RECEIVED].push(historyOperation);
          }
        }

        segments[SELECTOR_OPTIONS.ALL].push(historyOperation);
      });

      return segments;
    };

    const fetchAccountHistory = async () => {
      try {
        const res = await getAccountHistory({ publicKey, networkDetails });
        setHistorySegments(createSegments(res.operations));
      } catch (e) {
        console.error(e);
      }
    };
    fetchAccountHistory();
  }, [publicKey, networkDetails]);

  return (
    <div className="AccountHistory">
      <PopupWrapper>
        <header className="AccountHistory__header">Transactions</header>
        <div className="AccountHistory__selector">
          {Object.values(SELECTOR_OPTIONS).map((option) => (
            <div
              key={option}
              className={`AccountHistory__selector__item ${
                option === selectedSegment
                  ? "AccountHistory__selector__item--active"
                  : ""
              }`}
              onClick={() => setSelectedSegment(option)}
            >
              {option}
            </div>
          ))}
        </div>
        <ul className="AccountHistory__list">
          {historySegments[SELECTOR_OPTIONS[selectedSegment]].map(
            (operation: HistoryOperation) => (
              <HistoryItem
                key={operation.id}
                operation={operation}
                publicKey={publicKey}
                url={STELLAR_EXPERT_URL}
              />
            ),
          )}
        </ul>
      </PopupWrapper>
      <BottomNav />
    </div>
  );
};
