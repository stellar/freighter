import React, { useEffect, useRef, useContext, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { isEqual } from "lodash";
import { toast } from "sonner";

import {
  settingsSorobanSupportedSelector,
  settingsSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { View } from "popup/basics/layout/View";
import {
  accountNameSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { openTab } from "popup/helpers/navigate";
import { isFullscreenMode } from "popup/helpers/isFullscreenMode";
import { useSwapTopTokensPrewarm } from "popup/helpers/useSwapTopTokensPrewarm";

import { AccountAssets } from "popup/components/account/AccountAssets";
import {
  AccountCollectibles,
  hasVisibleCollections,
} from "popup/components/account/AccountCollectibles";
import { AccountHeader } from "popup/components/account/AccountHeader";
import { FloatingAddButton } from "popup/components/account/FloatingAddButton";
import { useHiddenCollectibles } from "popup/components/account/hooks/useHiddenCollectibles";
import { Loading } from "popup/components/Loading";
import { NotFundedMessage } from "popup/components/account/NotFundedMessage";

import { isMainnet } from "helpers/stellar";
import { newTabHref } from "helpers/urls";
import { getTotalUsd, getTotalUsdLabel } from "popup/helpers/balance";
import { NetworkDetails } from "@shared/constants/stellar";
import { reRouteOnboarding } from "popup/helpers/route";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";

import { useGetAccountData, RequestState } from "./hooks/useGetAccountData";
import { useGetAccountHistoryData } from "./hooks/useGetAccountHistoryData";
import {
  useGetIcons,
  RequestState as IconsRequestState,
} from "./hooks/useGetIcons";
import { useStableSortedBalances } from "./hooks/useStableSortedBalances";
import { AccountTabsContext, TabsList } from "./contexts/activeTabContext";

import {
  Sheet,
  SheetContent,
  ScreenReaderOnly,
  SheetTitle,
} from "popup/basics/shadcn/Sheet";
import { Discover } from "popup/views/Discover";

import "popup/metrics/authServices";
import "./styles.scss";

export const Account = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const { userNotification } = useSelector(settingsSelector);
  const currentAccountName = useSelector(accountNameSelector);
  // Fallback for the error state, where the fetch yields no data. The account
  // name already came from Redux, so without this the header rendered a named
  // account with a blank identicon (and a copy button holding "").
  const reduxPublicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { activeTab } = useContext(AccountTabsContext);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);

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
  const { refreshHiddenCollectibles, isCollectibleHidden } =
    useHiddenCollectibles();

  // Warm the swap top-tokens cache in the background so the first Swap entry
  // paints Popular instantly; no-op on testnet / when already cached.
  useSwapTopTokensPrewarm();

  const previousAccountBalancesRef = useRef<AccountBalances | null>(null);
  const sorobanErrorShownRef = useRef(false);

  useEffect(() => {
    const getData = async () => {
      await fetchData({ useAppDataCache: false });
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isSorobanSuported && !sorobanErrorShownRef.current) {
      toast.info(t("Soroban is temporarily experiencing issues"), {
        description: t(
          "You may not be able to transact with Soroban smart contracts or see your Soroban tokens at this time.",
        ),
      });
      sorobanErrorShownRef.current = true;
    } else if (isSorobanSuported) {
      sorobanErrorShownRef.current = false;
    }
  }, [isSorobanSuported, t]);

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

  // Derive `balances` and `tokenPrices` *before* the early returns below
  // so that `useStableSortedBalances` is called unconditionally on every
  // render (Rules of Hooks). When `accountData` is in `RequestState.ERROR`
  // its reducer sets `data: null`, so `accountBalances` is null and we
  // pass an empty list — the helpers below stay safe and the error UI
  // farther down can still render.
  const balances = accountBalances?.balances ?? [];
  const tokenPrices =
    accountData.state === RequestState.SUCCESS &&
    accountData.data.type === AppDataType.RESOLVED
      ? accountData.data?.tokenPrices
      : undefined;
  const sortedBalances = useStableSortedBalances(balances, tokenPrices);

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

  const isFunded = !!resolvedData?.balances?.isFunded;
  const canUseFriendbot = !!resolvedData?.networkDetails?.friendbotUrl;
  const collections = resolvedData?.collectibles?.collections ?? [];
  const reloadBalances = () =>
    fetchData({
      useAppDataCache: true,
      shouldForceBalancesRefresh: true,
    });

  const totalBalanceUsd = getTotalUsd(tokenPrices ?? {}, balances);
  // The hero is never hidden; see getTotalUsdLabel for which of a total, a
  // zero or the placeholder it shows. The network comes from Redux because
  // `resolvedData` is null once the fetch has failed.
  const roundedTotalBalanceUsd = getTotalUsdLabel({
    hasError,
    hasPriceFeed: isMainnet(networkDetails),
    isFunded,
    tokenPrices,
    totalUsd: totalBalanceUsd,
  });

  const activeAllowList =
    resolvedData?.allowList?.[resolvedData?.networkDetails?.networkName]?.[
      resolvedData?.publicKey
    ] ?? [];

  // The Tokens tab dictates which kind of Add button the Collectibles tab uses,
  // so the two match wherever they can. It is carrying its own inline CTA exactly
  // when it renders the unfunded empty state: a funded account shows its assets
  // instead, and a failed fetch shows an error, in which case the Tokens tab has
  // no CTA of either kind and Collectibles falls back to the pill.
  const isTokensEmptyStateShown =
    !isFunded && !hasError && !resolvedData?.balances?.error?.horizon;

  // Collectibles follows that lead, but can only host an inline CTA when it has
  // an empty state to put one in -- with collectibles on screen the pill stays,
  // so the tab is never left without a way to add one. `hasVisibleCollections`
  // is the same predicate that pane switches on, so the two cannot disagree.
  const isCollectiblesCtaInline =
    isTokensEmptyStateShown &&
    !hasVisibleCollections(collections, isCollectibleHidden);

  return (
    <>
      <AccountHeader
        allowList={activeAllowList}
        currentAccountName={currentAccountName}
        publicKey={resolvedData?.publicKey || reduxPublicKey}
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
        isFunded={isFunded}
        onDiscoverClick={() => setIsDiscoverOpen(true)}
      />
      <View.Content hasNoPadding>
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
            <div
              className="AccountView__fetch-fail"
              data-testid="account-view-user-notification"
            >
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
                {`${t(
                  "Note that you will need to reload this tab to load any account changes that happen outside this session.",
                )} ${t(
                  "For your own safety, please close this window when you are done.",
                )}`}
              </Notification>
            </div>
          )}

          <MultiPaneSlider
            activeIndex={Object.values(TabsList).indexOf(activeTab)}
            panes={[
              resolvedData?.balances?.isFunded && !hasError ? (
                <div
                  className="AccountView__assets-wrapper"
                  data-testid="account-assets"
                >
                  <AccountAssets
                    balances={{
                      ...resolvedData.balances,
                      balances: sortedBalances,
                    }}
                    historyData={historyData.data}
                    assetPrices={tokenPrices ?? {}}
                    assetIcons={resolvedIcons}
                  />
                </div>
              ) : (
                !hasError &&
                !resolvedData?.balances?.error?.horizon && (
                  <NotFundedMessage
                    canUseFriendbot={canUseFriendbot}
                    publicKey={resolvedData?.publicKey || ""}
                    reloadBalances={reloadBalances}
                  />
                )
              ),
              <div data-testid="account-collectibles">
                <AccountCollectibles
                  collections={collections}
                  hasInlineCta={isCollectiblesCtaInline}
                  refreshHiddenCollectibles={refreshHiddenCollectibles}
                  isCollectibleHidden={isCollectibleHidden}
                />
              </div>,
            ]}
          />
        </div>
      </View.Content>
      {/*
        Kept a sibling of View.Content for readability only — the pill is
        `position: fixed`, so with no transform/filter ancestor its containing
        block is the viewport and nesting depth doesn't affect where it lands.
        On Home nothing here is a scroll container: AccountView overrides
        View.Content and its inset to `overflow: visible`, so the document
        itself is the scrollport (document.scrollingElement === html).
      */}
      <FloatingAddButton
        isFunded={isFunded}
        isCollectiblesCtaInline={isCollectiblesCtaInline}
      />
      <Sheet
        open={isDiscoverOpen}
        onOpenChange={(open) => !open && setIsDiscoverOpen(false)}
      >
        <SheetContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
          side="bottom"
          className="AccountView__discover-sheet"
        >
          <ScreenReaderOnly>
            <SheetTitle>{t("Discover")}</SheetTitle>
          </ScreenReaderOnly>
          <Discover onClose={() => setIsDiscoverOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};
