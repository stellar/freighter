import BigNumber from "bignumber.js";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Horizon } from "stellar-sdk";

import { publicKeySelector } from "popup/ducks/accountServices";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import { getIsPayment, getIsSwap } from "popup/helpers/account";

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
import { Loading } from "popup/components/Loading";
import { View } from "popup/basics/layout/View";

import { RequestState, useGetHistory } from "helpers/hooks/useGetHistory";

import "./styles.scss";

export const AccountHistory = () => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { accountBalances } = useSelector(transactionSubmissionSelector);
  const { isHideDustEnabled } = useSelector(settingsSelector);
  const { state: getHistoryState, fetchData } = useGetHistory(
    publicKey,
    networkDetails,
  );

  const [historyOperations, setHistoryOperations] = useState<
    HistoryItemOperation[]
  >([]);
  const [isDetailViewShowing, setIsDetailViewShowing] = useState(false);

  const defaultDetailViewProps: TransactionDetailProps = {
    ...historyItemDetailViewProps,
    setIsDetailViewShowing,
  };
  const [detailViewProps, setDetailViewProps] = useState(
    defaultDetailViewProps,
  );

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const createOperations = (
      operations: Horizon.ServerApi.OperationRecord[],
    ) =>
      operations
        .map((operation) => {
          const isPayment = getIsPayment(operation.type);
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
            return undefined;
          }

          return historyOperation;
        })
        .filter(Boolean) as HistoryItemOperation[];

    if (getHistoryState.state === RequestState.SUCCESS) {
      const operations = createOperations(getHistoryState.data);
      setHistoryOperations(operations);
    }
  }, [
    getHistoryState.state,
    getHistoryState.data,
    publicKey,
    isHideDustEnabled,
  ]);

  const isLoaderShowing =
    getHistoryState.state === RequestState.IDLE ||
    getHistoryState.state === RequestState.LOADING;

  if (isDetailViewShowing) {
    return <TransactionDetail {...detailViewProps} />;
  }

  if (isLoaderShowing) {
    return <Loading />;
  }

  const hasHistoryContent = historyOperations.length > 0;

  return (
    <View.Content>
      <div className="AccountHistory" data-testid="AccountHistory">
        <header className="AccountHistory__header">{t("History")}</header>
        <div className="AccountHistory__list">
          {hasHistoryContent && (
            <HistoryList>
              <>
                {historyOperations.map((operation: HistoryItemOperation) => (
                  <HistoryItem
                    key={operation.id}
                    accountBalances={accountBalances}
                    operation={operation}
                    publicKey={publicKey}
                    networkDetails={networkDetails}
                    setDetailViewProps={setDetailViewProps}
                    setIsDetailViewShowing={setIsDetailViewShowing}
                  />
                ))}
              </>
            </HistoryList>
          )}
          {!hasHistoryContent && <div>{t("No transactions to show")}</div>}
        </div>
      </div>
    </View.Content>
  );
};
