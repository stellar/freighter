import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Horizon } from "stellar-sdk";
import SimpleBar from "simplebar-react";
import { useTranslation } from "react-i18next";
import "simplebar-react/dist/simplebar.min.css";

import { HorizonOperation } from "@shared/api/types";
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

const getIsSwap = (operation: HistoryItemOperation) =>
  operation.type_i === 13 && operation.source_account === operation.to;

enum SELECTOR_OPTIONS {
  ALL = "ALL",
  SENT = "SENT",
  RECEIVED = "RECEIVED",
}

export const AccountHistory = () => {
  /*
      t("ALL");
      t("SENT");
      t("RECEIVED");
    */
  type HistorySegments =
    | {
        [key in SELECTOR_OPTIONS]: HistoryItemOperation[] | [];
      }
    | null;

  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [selectedSegment, setSelectedSegment] = useState(SELECTOR_OPTIONS.ALL);
  const [historySegments, setHistorySegments] = useState(
    null as HistorySegments,
  );
  const [isDetailViewShowing, setIsDetailViewShowing] = useState(false);

  const defaultDetailViewProps: TransactionDetailProps = {
    operation: {} as HorizonOperation,
    headerTitle: "",
    isPayment: false,
    isRecipient: false,
    isSwap: false,
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

  // differentiate between if data is still loading and if no account history results came back from Horizon
  const isAccountHistoryLoading = historySegments === null;

  useEffect(() => {
    const createSegments = (operations: HistoryItemOperation[]) => {
      const segments = {
        [SELECTOR_OPTIONS.ALL]: [] as HistoryItemOperation[],
        [SELECTOR_OPTIONS.SENT]: [] as HistoryItemOperation[],
        [SELECTOR_OPTIONS.RECEIVED]: [] as HistoryItemOperation[],
      };
      operations.forEach((operation) => {
        const isPayment = getIsPayment(operation.type);
        const isSwap = getIsSwap(operation);
        const historyOperation = { ...operation, isPayment, isSwap };
        if (isPayment && !isSwap) {
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
      <div className="AccountHistory__wrapper">
        <header className="AccountHistory__header">{t("Transactions")}</header>
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
              {t(option)}
            </div>
          ))}
        </div>
        <div className="AccountHistory__list">
          {historySegments?.[SELECTOR_OPTIONS[selectedSegment]].length ? (
            <SimpleBar className="AccountHistory__list__scrollbar">
              <div className="AccountHistory__list__items">
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
              </div>
            </SimpleBar>
          ) : (
            <div>
              {isAccountHistoryLoading ? null : t("No transactions to show")}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
