import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { Loader } from "@stellar/design-system";
import { Horizon } from "stellar-sdk";

import { getAccountHistory } from "@shared/api/internal";
import { ActionStatus } from "@shared/api/types";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";

import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import {
  getIsPayment,
  getIsSwap,
  getStellarExpertUrl,
} from "popup/helpers/account";
import { getAttrsFromSorobanHorizonOp } from "popup/helpers/soroban";

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
import { View } from "popup/basics/layout/View";

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
  const dispatch = useDispatch();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { accountBalances, accountBalanceStatus } = useSelector(
    transactionSubmissionSelector,
  );

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

  const stellarExpertUrl = getStellarExpertUrl(networkDetails);

  const isAccountHistoryLoading =
    historySegments === null ||
    accountBalanceStatus === ActionStatus.IDLE ||
    accountBalanceStatus === ActionStatus.PENDING;

  useEffect(() => {
    const createSegments = (
      operations: Horizon.ServerApi.OperationRecord[],
    ) => {
      const segments = {
        [SELECTOR_OPTIONS.ALL]: [] as HistoryItemOperation[],
        [SELECTOR_OPTIONS.SENT]: [] as HistoryItemOperation[],
        [SELECTOR_OPTIONS.RECEIVED]: [] as HistoryItemOperation[],
      };
      operations.forEach((operation) => {
        const isPayment = getIsPayment(operation.type);
        const isSorobanXfer =
          getAttrsFromSorobanHorizonOp(operation, networkDetails)?.fnName ===
          SorobanTokenInterface.transfer;
        const isSwap = getIsSwap(operation);
        const isCreateExternalAccount =
          operation.type ===
            Horizon.HorizonApi.OperationResponseType.createAccount &&
          operation.account !== publicKey;
        const historyOperation = {
          ...operation,
          isPayment,
          isSwap,
          isCreateExternalAccount,
        };

        if ((isPayment || isSorobanXfer) && !isSwap) {
          if (operation.source_account === publicKey) {
            segments[SELECTOR_OPTIONS.SENT].push(historyOperation);
          } else if ("to" in operation && operation.to === publicKey) {
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
        const operations = await getAccountHistory(publicKey, networkDetails);
        setHistorySegments(createSegments(operations));
      } catch (e) {
        console.error(e);
      }
    };

    const getData = async () => {
      setIsLoading(true);
      await fetchAccountHistory();
      setIsLoading(false);
    };

    getData();
  }, [publicKey, networkDetails, dispatch]);

  return isDetailViewShowing ? (
    <TransactionDetail {...detailViewProps} />
  ) : (
    <>
      <View.Content>
        <div className="AccountHistory">
          {isLoading ? (
            <div className="AccountHistory__loader">
              <Loader size="2rem" />
            </div>
          ) : (
            <>
              <header className="AccountHistory__header">
                {t("Transactions")}
              </header>
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
                            accountBalances={accountBalances}
                            operation={operation}
                            publicKey={publicKey}
                            url={stellarExpertUrl}
                            networkDetails={networkDetails}
                            setDetailViewProps={setDetailViewProps}
                            setIsDetailViewShowing={setIsDetailViewShowing}
                          />
                        ),
                      )}
                    </>
                  </HistoryList>
                ) : (
                  <div>
                    {isAccountHistoryLoading
                      ? null
                      : t("No transactions to show")}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </View.Content>
    </>
  );
};
