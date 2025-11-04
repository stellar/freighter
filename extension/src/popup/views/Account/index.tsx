import React, { useState, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { isEqual } from "lodash";

import {
  settingsSorobanSupportedSelector,
  settingsSelector,
} from "popup/ducks/settings";
import { View } from "popup/basics/layout/View";
import { accountNameSelector } from "popup/ducks/accountServices";
import { openTab } from "popup/helpers/navigate";
import { isFullscreenMode } from "popup/helpers/isFullscreenMode";
import { isMainnet } from "helpers/stellar";

import { AccountAssets } from "popup/components/account/AccountAssets";
import { AccountHeader } from "popup/components/account/AccountHeader";
import { AssetDetail } from "popup/components/account/AssetDetail";
import { Loading } from "popup/components/Loading";
import { NotFundedMessage } from "popup/components/account/NotFundedMessage";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";

import { newTabHref } from "helpers/urls";
import { getTotalUsd } from "popup/helpers/balance";
import { NetworkDetails } from "@shared/constants/stellar";
import { reRouteOnboarding } from "popup/helpers/route";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { AccountBalances } from "helpers/hooks/useGetBalances";

import { useGetAccountData, RequestState } from "./hooks/useGetAccountData";
import { useGetAccountHistoryData } from "./hooks/useGetAccountHistoryData";
import {
  useGetIcons,
  RequestState as IconsRequestState,
} from "./hooks/useGetIcons";

import "popup/metrics/authServices";
import "./styles.scss";

export const Account = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const { userNotification } = useSelector(settingsSelector);
  const currentAccountName = useSelector(accountNameSelector);
  const [selectedAsset, setSelectedAsset] = useState("");
  const isFullscreenModeEnabled = isFullscreenMode();
  const {
    state: accountData,
    fetchData,
    refreshAppData,
  } = useGetAccountData({
    showHidden: false,
    includeIcons: false,
  });
  const { state: historyData, fetchData: fetchHistoryData } =
    useGetAccountHistoryData();

  const { state: iconsData, fetchData: fetchIconsData } = useGetIcons();

  const previousAccountBalancesRef = useRef<AccountBalances | null>(null);

  useEffect(() => {
    const getData = async () => {
      await fetchData({ useAppDataCache: false });
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accountBalances =
    accountData.state === RequestState.SUCCESS &&
    accountData.data.type === AppDataType.RESOLVED
      ? accountData.data?.balances
      : null;

  const isScanAppended =
    accountData.state === RequestState.SUCCESS &&
    accountData.data.type === AppDataType.RESOLVED
      ? accountData.data?.isScanAppended
      : false;

  useEffect(() => {
    const getData = async () => {
      if (accountBalances && !isScanAppended) {
        // tie refresh history data to account balances requests
        await fetchHistoryData({ balances: accountBalances });
      }
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountBalances]);

  useEffect(() => {
    const getData = async () => {
      if (
        accountBalances &&
        !isEqual(accountBalances, previousAccountBalancesRef.current) && // unless balances have changed, don't fetch icons; the cache should be hydrated already
        !isScanAppended // start fetching icons on the first scan-less balance fetch
      ) {
        previousAccountBalancesRef.current = accountBalances;

        await fetchIconsData();
      }
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountBalances]);

  if (
    accountData.state === RequestState.IDLE ||
    accountData.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  const hasError = accountData.state === RequestState.ERROR;

  if (accountData.data?.type === AppDataType.REROUTE) {
    if (accountData.data.shouldOpenTab) {
      openTab(newTabHref(accountData.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${accountData.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: accountData.data.type,
      applicationState: accountData.data?.applicationState,
      state: accountData.state,
    });
  }

  const resolvedData = accountData.data;
  const resolvedIcons =
    iconsData?.state === IconsRequestState.SUCCESS &&
    iconsData?.data?.type === AppDataType.RESOLVED
      ? iconsData?.data?.icons
      : {};

  if (
    !hasError &&
    selectedAsset &&
    accountData.data.type === AppDataType.RESOLVED
  ) {
    return (
      <AssetDetail
        accountBalances={accountData.data.balances}
        historyData={historyData.data}
        networkDetails={accountData.data.networkDetails}
        publicKey={accountData.data.publicKey}
        selectedAsset={selectedAsset}
        setSelectedAsset={setSelectedAsset}
        subentryCount={accountData.data.balances.subentryCount}
        tokenPrices={accountData.data.tokenPrices}
        assetIcons={resolvedIcons}
      />
    );
  }

  const tokenPrices = resolvedData?.tokenPrices || {};
  const balances = resolvedData?.balances.balances!;
  const totalBalanceUsd = getTotalUsd(tokenPrices, balances);
  const roundedTotalBalanceUsd =
    !hasError &&
    isMainnet(resolvedData!.networkDetails) &&
    resolvedData?.tokenPrices
      ? `$${formatAmount(roundUsdValue(totalBalanceUsd.toString()))}`
      : "";

  const activeAllowList =
    resolvedData?.allowList?.[resolvedData?.networkDetails?.networkName]?.[
      resolvedData?.publicKey
    ] ?? [];

  return (
    <>
      <AccountHeader
        allowList={activeAllowList}
        currentAccountName={currentAccountName}
        publicKey={resolvedData?.publicKey || ""}
        onAllowListRemove={refreshAppData}
        onClickRow={async (updatedValues: {
          publicKey?: string;
          network?: NetworkDetails;
        }) => {
          await fetchData({
            useAppDataCache: false,
            updatedAppData: updatedValues,
            shouldForceBalancesRefresh: true,
          });
        }}
        roundedTotalBalanceUsd={roundedTotalBalanceUsd}
        isFunded={!!resolvedData?.balances?.isFunded}
      />
      <View.Content hasNoTopPadding>
        <div className="AccountView" data-testid="account-view">
          {hasError && (
            <div className="AccountView__fetch-fail">
              <Notification
                variant="error"
                title={t("Failed to fetch your account balances.")}
              >
                {t("Your account balances could not be fetched at this time.")}
              </Notification>
            </div>
          )}
          {!isSorobanSuported && (
            <div className="AccountView__fetch-fail">
              <Notification
                title={t("Soroban RPC is temporarily experiencing issues")}
                variant="primary"
              >
                {t("Some features may be disabled at this time.")}
              </Notification>
            </div>
          )}
          {resolvedData?.balances?.error?.horizon && (
            <div className="AccountView__fetch-fail">
              <Notification
                title={t("Horizon is temporarily experiencing issues")}
                variant="primary"
              >
                {t(
                  "Some of your assets may not appear, but they are still safe on the network!",
                )}
              </Notification>
            </div>
          )}
          {userNotification?.enabled && (
            <div className="AccountView__fetch-fail">
              <Notification
                title={t("Please note the following message")}
                variant="primary"
              >
                {userNotification.message}
              </Notification>
            </div>
          )}
          {isFullscreenModeEnabled && (
            <div className="AccountView__fullscreen">
              <Notification
                title={t("You are in fullscreen mode")}
                variant="primary"
              >
                {t(
                  "Note that you will need to reload this tab to load any account changes that happen outside this session. For your own safety, please close this window when you are done.",
                )}
              </Notification>
            </div>
          )}

          {resolvedData?.balances?.isFunded && !hasError && (
            <div
              className="AccountView__assets-wrapper"
              data-testid="account-assets"
            >
              <AccountAssets
                sortedBalances={resolvedData.balances.balances}
                assetPrices={tokenPrices}
                assetIcons={resolvedIcons}
                setSelectedAsset={setSelectedAsset}
              />
            </div>
          )}
        </div>
      </View.Content>
      {!resolvedData?.balances?.isFunded &&
        !hasError &&
        !resolvedData?.balances?.error?.horizon && (
          <View.Footer>
            <NotFundedMessage
              canUseFriendbot={!!resolvedData!.networkDetails.friendbotUrl}
              publicKey={resolvedData?.publicKey || ""}
              reloadBalances={() =>
                fetchData({
                  useAppDataCache: true,
                  shouldForceBalancesRefresh: true,
                })
              }
            />
          </View.Footer>
        )}
    </>
  );
};
