import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Text } from "@stellar/design-system";

import {
  settingsSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { formatMonthLabel } from "popup/helpers/date";
import { HistoryItemV2 } from "popup/components/accountHistory/HistoryItemV2";
import { TransactionDetailSheet } from "popup/components/accountHistory/TransactionDetailSheet";
import { Loading } from "popup/components/Loading";
import { View } from "popup/basics/layout/View";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import { SlideupModal } from "popup/components/SlideupModal";

import { AccountHistoryLegacy } from "./AccountHistoryLegacy";
import { useGetHistoryDataV2 } from "./hooks/useGetHistoryDataV2";
import { HistoryEntry } from "./model";

import "./styles.scss";

export const AccountHistoryV2 = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { isHideDustEnabled } = useSelector(settingsSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const {
    state: historyState,
    fetchData,
    fetchNextPage,
    isLoadingMore,
  } = useGetHistoryDataV2({ isHideDustEnabled });

  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolved =
    historyState.data?.type === AppDataType.RESOLVED ? historyState.data : null;
  const hasNextPage = resolved?.hasNextPage ?? false;

  // Infinite-scroll sentinel: request the next page as it approaches the
  // viewport. fetchNextPage internally no-ops without a cursor or while a
  // page is already loading, so re-observing on state changes is safe.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isLoadingMore, fetchNextPage]);

  const isLoaderShowing =
    historyState.state === RequestState.IDLE ||
    historyState.state === RequestState.LOADING;

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

  // Unsupported network / flag resolved off at fetch time → the router served
  // v1. Render the legacy history until the U8 Horizon adapter maps v1 into
  // this model.
  if (resolved?.fallbackToV1) {
    return <AccountHistoryLegacy />;
  }

  if (!hasError && resolved) {
    reRouteOnboarding({
      type: resolved.type,
      applicationState: resolved.applicationState,
      state: historyState.state,
    });
  }

  const sections = resolved?.sections ?? [];
  const allEntries = sections.flatMap((section) => section.entries);
  const activeEntry: HistoryEntry | undefined =
    activeEntryId && !hasError
      ? allEntries.find((entry) => entry.id === activeEntryId)
      : undefined;

  const isEmpty = !hasError && sections.length < 1;

  return (
    <>
      <View.AppHeader hasBackButton pageTitle={t("History")} />
      <View.Content hasNoTopPadding hasNoBottomPadding>
        <div className="AccountHistory" data-testid="AccountHistoryV2">
          {!hasError &&
            sections.map((section) => (
              <div key={section.monthYear} className="AccountHistory__list">
                <Text
                  as="div"
                  size="sm"
                  addlClassName="AccountHistory__section-header"
                >
                  {formatMonthLabel(Number(section.monthYear.split(":")[0]))}
                </Text>

                <div className="AccountHistory__list">
                  {section.entries.map((entry) => (
                    <HistoryItemV2
                      key={entry.id}
                      entry={entry}
                      onClick={setActiveEntryId}
                    />
                  ))}
                </div>
              </div>
            ))}

          {hasError || isEmpty ? (
            <div>{t("No transactions to show")}</div>
          ) : null}

          {hasNextPage ? (
            <div
              ref={sentinelRef}
              className="AccountHistory__sentinel"
              data-testid="AccountHistoryV2-sentinel"
            >
              {isLoadingMore ? (
                <Text
                  as="div"
                  size="xs"
                  addlClassName="AccountHistory__loading-more"
                >
                  {t("Loading…")}
                </Text>
              ) : null}
            </div>
          ) : null}
        </div>
      </View.Content>

      <SlideupModal
        isModalOpen={activeEntry !== undefined}
        setIsModalOpen={() => setActiveEntryId(null)}
      >
        <div
          className="AccountHistory__detail"
          data-testid="AccountHistoryV2-detail"
        >
          {activeEntry ? (
            <TransactionDetailSheet
              key={activeEntry.id}
              entry={activeEntry}
              networkDetails={networkDetails}
            />
          ) : null}
        </div>
      </SlideupModal>
    </>
  );
};
