import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Loader } from "@stellar/design-system";
import { Horizon } from "stellar-sdk";

import { getAccountHistory } from "@shared/api/internal";
import { HorizonOperation } from "@shared/api/types";

import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  getIsPayment,
  getIsSwap,
  getStellarExpertUrl,
} from "popup/helpers/account";

import {
  historyItemDetailViewProps,
  HistoryItem,
  HistoryItemOperation,
} from "popup/components/accountHistory/HistoryItem";
import { HistoryList } from "popup/components/accountHistory/HistoryList";
import {
  TransactionDetail,
  TransactionDetailProps,
} from "popup/components/accountHistory/TransactionDetail";
import { BottomNav } from "popup/components/BottomNav";

import "./styles.scss";

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
    ...historyItemDetailViewProps,
    setIsDetailViewShowing,
  };
  const [detailViewProps, setDetailViewProps] = useState(
    defaultDetailViewProps,
  );
  const [isLoading, setIsLoading] = useState(false);

  const stellarExpertUrl = getStellarExpertUrl(networkDetails.isTestnet);

  // differentiate between if data is still loading and if no account history results came back from Horizon
  const isAccountHistoryLoading = historySegments === null;

  useEffect(() => {
    setIsLoading(true);
    const createSegments = (operations: HorizonOperation[]) => {
      const segments = {
        [SELECTOR_OPTIONS.ALL]: [] as HistoryItemOperation[],
        [SELECTOR_OPTIONS.SENT]: [] as HistoryItemOperation[],
        [SELECTOR_OPTIONS.RECEIVED]: [] as HistoryItemOperation[],
      };
      operations.forEach((operation) => {
        const isPayment = getIsPayment(operation.type);
        const isSwap = getIsSwap(operation);
        const isCreateExternalAccount =
          operation.type === Horizon.OperationResponseType.createAccount &&
          operation.account !== publicKey;
        const historyOperation = {
          ...operation,
          isPayment,
          isSwap,
          isCreateExternalAccount,
        };

        if (isPayment && !isSwap) {
          if (operation.source_account === publicKey) {
            segments[SELECTOR_OPTIONS.SENT].push(historyOperation);
          } else if (operation.to === publicKey) {
            segments[SELECTOR_OPTIONS.RECEIVED].push(historyOperation);
          }
        }

        if (isCreateExternalAccount) {
          segments[SELECTOR_OPTIONS.SENT].push(historyOperation);
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
      setIsLoading(false);
    };
    fetchAccountHistory();
  }, [publicKey, networkDetails]);

  return isDetailViewShowing ? (
    <TransactionDetail {...detailViewProps} />
  ) : (
    <div className="AccountHistory">
      {isLoading && (
        <div className="AccountHistory__loader">
          <Loader size="2rem" />
        </div>
      )}
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
            <HistoryList>
              <>
                {historySegments[SELECTOR_OPTIONS[selectedSegment]].map(
                  (operation: HistoryItemOperation) => (
                    <HistoryItem
                      key={operation.id}
                      operation={operation}
                      publicKey={publicKey}
                      url={stellarExpertUrl}
                      setDetailViewProps={setDetailViewProps}
                      setIsDetailViewShowing={setIsDetailViewShowing}
                    />
                  ),
                )}
              </>
            </HistoryList>
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
