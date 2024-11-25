import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Horizon } from "stellar-sdk";
import BigNumber from "bignumber.js";

import { SorobanTokenInterface } from "@shared/constants/soroban/token";

import { publicKeySelector } from "popup/ducks/accountServices";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
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
import { RequestState, useGetHistory } from "helpers/hooks/use-get-history";

import "./styles.scss";
import { Loading } from "popup/components/Loading";

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
  const { accountBalances } = useSelector(transactionSubmissionSelector);
  const { isHideDustEnabled } = useSelector(settingsSelector);
  const { state: getHistoryState, fetchData } = useGetHistory(
    publicKey,
    networkDetails,
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

  const stellarExpertUrl = getStellarExpertUrl(networkDetails);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const isDustPayment =
          isPayment &&
          "asset_type" in operation &&
          operation.asset_type === "native" &&
          "to" in operation &&
          operation.to === publicKey &&
          "amount" in operation &&
          new BigNumber(operation.amount).lte(new BigNumber(0.1));
        const historyOperation = {
          ...operation,
          isPayment,
          isSwap,
          isCreateExternalAccount,
        };

        if (isDustPayment && isHideDustEnabled) {
          return;
        }

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

    if (getHistoryState.state === RequestState.SUCCESS) {
      setHistorySegments(createSegments(getHistoryState.data));
    }
  }, [
    getHistoryState.state,
    getHistoryState.data,
    publicKey,
    networkDetails,
    isHideDustEnabled,
  ]);

  const showLoader =
    getHistoryState.state === RequestState.IDLE ||
    getHistoryState.state === RequestState.LOADING;
  const hasEmptyHistory = !showLoader || !getHistoryState.data;

  if (isDetailViewShowing) {
    return <TransactionDetail {...detailViewProps} />;
  }

  console.log(getHistoryState);

  return showLoader ? (
    <Loading />
  ) : (
    <View.Content>
      <div className="AccountHistory" data-testid="AccountHistory">
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
            <div>{hasEmptyHistory ? t("No transactions to show") : null}</div>
          )}
        </div>
      </div>
    </View.Content>
  );
};
