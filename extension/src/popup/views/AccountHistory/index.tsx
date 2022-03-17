import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Horizon } from "stellar-sdk";

import { HorizonOperation } from "@shared/api/types";

import { PopupWrapper } from "popup/basics/PopupWrapper";

import { getAccountHistory } from "@shared/api/internal";

import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import {
  HistoryItem,
  HistoryItemOperation,
} from "popup/components/accountHistory/HistoryItem";
import {
  TransactionDetail,
  TransactionDetailProps,
} from "popup/components/accountHistory/TransactionDetail";
import { BottomNav } from "popup/components/BottomNav";

import "./styles.scss";

const getIsPayment = (type: Horizon.OperationResponseType) =>
  [
    Horizon.OperationResponseType.payment,
    Horizon.OperationResponseType.pathPayment,
    Horizon.OperationResponseType.pathPaymentStrictSend,
  ].includes(type);

enum SELECTOR_OPTIONS {
  ALL = "ALL",
  SENT = "SENT",
  RECEIVED = "RECEIVED",
}

type HistorySegments = {
  [key in SELECTOR_OPTIONS]: HistoryItemOperation[] | [];
};

export const AccountHistory = () => {
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [selectedSegment, setSelectedSegment] = useState(SELECTOR_OPTIONS.ALL);
  const [historySegments, setHistorySegments] = useState({
    [SELECTOR_OPTIONS.ALL]: [],
  } as HistorySegments);
  const [isDetailViewShowing, setIsDetailViewShowing] = useState(false);

  const defaultDetailViewProps: TransactionDetailProps = {
    operation: {} as HorizonOperation,
    headerTitle: "",
    isRecipient: false,
    operationText: "",
    externalUrl: "",
    setIsDetailViewShowing,
  };
  const [detailViewProps, setDetailViewProps] = useState(
    defaultDetailViewProps,
  );

  const STELLAR_EXPERT_URL = `https://stellar.expert/explorer/${
    networkDetails.isTestnet ? "testnet" : "public"
  }`;

  useEffect(() => {
    const createSegments = (operations: HistoryItemOperation[]) => {
      const segments = {
        [SELECTOR_OPTIONS.ALL]: [] as HistoryItemOperation[],
        [SELECTOR_OPTIONS.SENT]: [] as HistoryItemOperation[],
        [SELECTOR_OPTIONS.RECEIVED]: [] as HistoryItemOperation[],
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

  return isDetailViewShowing ? (
    <TransactionDetail {...detailViewProps} />
  ) : (
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
            (operation: HistoryItemOperation) => (
              <HistoryItem
                key={operation.id}
                operation={operation}
                publicKey={publicKey}
                url={STELLAR_EXPERT_URL}
                setDetailViewProps={setDetailViewProps}
                setIsDetailViewShowing={setIsDetailViewShowing}
              />
            ),
          )}
        </ul>
      </PopupWrapper>
      <BottomNav />
    </div>
  );
};
