import { Text } from "@stellar/design-system";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
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
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { Navigate, useLocation } from "react-router-dom";
import { useGetHistoryData } from "./hooks/useGetHistoryData";

import "./styles.scss";
import { reRouteOnboarding } from "popup/helpers/route";

export const AccountHistory = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { isHideDustEnabled } = useSelector(settingsSelector);
  const { state: historyState, fetchData } = useGetHistoryData(
    {
      showHidden: false,
      includeIcons: true,
    },
    {
      isHideDustEnabled,
    },
  );

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

  const isLoaderShowing =
    historyState.state === RequestState.IDLE ||
    historyState.state === RequestState.LOADING;

  if (isDetailViewShowing) {
    return <TransactionDetail {...detailViewProps} />;
  }

  if (isLoaderShowing) {
    return <Loading />;
  }

  const hasError = historyState.state === RequestState.ERROR;
  if (historyState.data?.type === AppDataType.REROUTE) {
    if (historyState.data.shouldOpenTab) {
      openTab(newTabHref(historyState.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${historyState.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: historyState.data.type,
      applicationState: historyState.data.applicationState,
      state: historyState.state,
    });
  }

  const balances = historyState.data?.balances!;
  const publicKey = historyState.data?.publicKey!;

  return (
    <>
      <View.AppHeader hasBackButton pageTitle={t("History")} />
      <View.Content hasNoTopPadding hasNoBottomPadding>
        <div className="AccountHistory" data-testid="AccountHistory">
          {!hasError &&
            historyState.data.history.map((section) => (
              <div key={section.monthYear} className="AccountHistory__list">
                <Text
                  as="div"
                  size="sm"
                  addlClassName="AccountHistory__section-header"
                >
                  {getMonthLabel(Number(section.monthYear.split(":")[0]))}
                </Text>

                <div className="AccountHistory__list">
                  {section.operations.map((operation: HistoryItemOperation) => (
                    <HistoryItem
                      key={operation.id}
                      accountBalances={balances}
                      operation={operation}
                      publicKey={publicKey}
                      networkDetails={networkDetails}
                      setDetailViewProps={setDetailViewProps}
                      setIsDetailViewShowing={setIsDetailViewShowing}
                    />
                  ))}
                </div>
              </div>
            ))}
          {hasError || historyState.data.history.length < 1 ? (
            <div>{t("No transactions to show")}</div>
          ) : null}
        </div>
      </View.Content>
    </>
  );
};
