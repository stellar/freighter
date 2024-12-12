import { Text } from "@stellar/design-system";
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
import { getMonthLabel } from "popup/helpers/getMonthLabel";

import {
  historyItemDetailViewProps,
  HistoryItem,
  HistoryItemOperation,
} from "popup/components/accountHistory/HistoryItem";
import {
  TransactionDetail,
  TransactionDetailProps,
} from "popup/components/accountHistory/TransactionDetail";
import { Loading } from "popup/components/Loading";
import { View } from "popup/basics/layout/View";

import { RequestState, useGetHistory } from "helpers/hooks/useGetHistory";

import "./styles.scss";

type HistorySection = {
  monthYear: string; // in format {month}:{year}
  operations: HistoryItemOperation[];
};

export const AccountHistory = () => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { accountBalances } = useSelector(transactionSubmissionSelector);
  const { isHideDustEnabled } = useSelector(settingsSelector);
  const { state: historyState, fetchData } = useGetHistory(
    publicKey,
    networkDetails,
  );

  const [historySections, setHistorySections] = useState<HistorySection[]>([]);

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
    const createHistorySections = (
      operations: Horizon.ServerApi.OperationRecord[],
    ) =>
      operations.reduce(
        (
          sections: HistorySection[],
          operation: Horizon.ServerApi.OperationRecord,
        ) => {
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
          const parsedOperation = {
            ...operation,
            isPayment,
            isSwap,
            isCreateExternalAccount,
          };

          if (isDustPayment && isHideDustEnabled) {
            return sections;
          }

          const date = new Date(operation.created_at);
          const month = date.getMonth();
          const year = date.getFullYear();
          const monthYear = `${month}:${year}`;

          // pop() is a very performant method to get the last element of an array
          // but it actually removes the last element, so we need to make sure
          // to put it back later.
          const lastSection = sections.pop();

          // if we have no sections yet, let's create the first one
          if (!lastSection) {
            return [{ monthYear, operations: [parsedOperation] }];
          }

          // if element belongs to this section let's add it right away
          if (lastSection.monthYear === monthYear) {
            lastSection.operations.push(parsedOperation);
            return [...sections, lastSection];
          }

          // otherwise let's add a new section at the bottom of the array
          return [
            ...sections,
            lastSection,
            { monthYear, operations: [parsedOperation] },
          ];
        },
        [] as HistorySection[],
      );

    if (historyState.state === RequestState.SUCCESS) {
      const sections = createHistorySections(historyState.data);
      setHistorySections(sections);
    }
  }, [historyState.state, historyState.data, publicKey, isHideDustEnabled]);

  const isLoaderShowing =
    historyState.state === RequestState.IDLE ||
    historyState.state === RequestState.LOADING;

  if (isDetailViewShowing) {
    return <TransactionDetail {...detailViewProps} />;
  }

  if (isLoaderShowing) {
    return <Loading />;
  }

  const hasHistoryContent = historySections.length > 0;

  return (
    <>
      <View.AppHeader pageTitle={t("History")} />
      <View.Content hasNoTopPadding hasNoBottomPadding>
        <div className="AccountHistory" data-testid="AccountHistory">
          {hasHistoryContent && (
            <>
              {historySections.map((section: HistorySection) => (
                <div className="AccountHistory__list">
                  <Text
                    as="div"
                    size="sm"
                    addlClassName="AccountHistory__section-header"
                  >
                    {getMonthLabel(Number(section.monthYear.split(":")[0]))}
                  </Text>

                  <div className="AccountHistory__list">
                    {section.operations.map(
                      (operation: HistoryItemOperation) => (
                        <HistoryItem
                          key={operation.id}
                          accountBalances={accountBalances}
                          operation={operation}
                          publicKey={publicKey}
                          networkDetails={networkDetails}
                          setDetailViewProps={setDetailViewProps}
                          setIsDetailViewShowing={setIsDetailViewShowing}
                        />
                      ),
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
          {!hasHistoryContent && <div>{t("No transactions to show")}</div>}
        </div>
      </View.Content>
    </>
  );
};
