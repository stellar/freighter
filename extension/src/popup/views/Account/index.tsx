import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import BigNumber from "bignumber.js";
import {
  CopyText,
  Icon,
  NavButton,
  Notification,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  settingsNetworkDetailsSelector,
  settingsSorobanSupportedSelector,
  settingsSelector,
} from "popup/ducks/settings";
import { View } from "popup/basics/layout/View";
import {
  accountNameSelector,
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { isFullscreenMode } from "popup/helpers/isFullscreenMode";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";

import { AccountAssets } from "popup/components/account/AccountAssets";
import { AccountHeader } from "popup/components/account/AccountHeader";
import { AccountOptionsDropdown } from "popup/components/account/AccountOptionsDropdown";
import { AssetDetail } from "popup/components/account/AssetDetail";
import { Loading } from "popup/components/Loading";
import { NotFundedMessage } from "popup/components/account/NotFundedMessage";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";
import { getBalanceByIssuer } from "popup/helpers/balance";
import { useIsSoroswapEnabled } from "popup/helpers/useIsSwap";

import { useGetAccountData, RequestState } from "./hooks/useGetAccountData";

import "popup/metrics/authServices";
import "./styles.scss";

export const Account = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const { userNotification } = useSelector(settingsSelector);
  const currentAccountName = useSelector(accountNameSelector);
  const allAccounts = useSelector(allAccountsSelector);
  const [selectedAsset, setSelectedAsset] = useState("");
  const isFullscreenModeEnabled = isFullscreenMode();
  const isMainnetNetwork = isMainnet(networkDetails);
  const isSoroswapSupported = useIsSoroswapEnabled();
  const { state: accountData, fetchData } = useGetAccountData(
    publicKey,
    networkDetails,
    isSoroswapSupported,
    {
      isMainnet: isMainnetNetwork,
      showHidden: false,
      includeIcons: true,
    },
  );

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  if (selectedAsset) {
    return (
      <AssetDetail
        accountBalances={accountData.data!.balances}
        assetOperations={accountData.data!.operationsByAsset[selectedAsset]}
        networkDetails={networkDetails}
        publicKey={publicKey}
        selectedAsset={selectedAsset}
        setSelectedAsset={setSelectedAsset}
        subentryCount={accountData.data!.balances.subentryCount}
      />
    );
  }

  if (
    accountData.state === RequestState.IDLE ||
    accountData.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  const hasError = accountData.state === RequestState.ERROR;

  const tokenPrices = accountData.data?.tokenPrices || {};
  const totalBalanceUsd = Object.keys(tokenPrices).reduce((prev, curr) => {
    const balances = accountData.data?.balances.balances!;
    const asset = getAssetFromCanonical(curr);
    const priceBalance = getBalanceByIssuer(asset.issuer, balances);
    if (!priceBalance) {
      return prev;
    }
    const currentAssetBalance = priceBalance.total;
    const currentPrice = tokenPrices[curr]
      ? tokenPrices[curr].currentPrice
      : "0";
    const currentUsdBalance = new BigNumber(currentPrice).multipliedBy(
      currentAssetBalance,
    );
    return currentUsdBalance.plus(prev);
  }, new BigNumber(0));

  return (
    <>
      <AccountHeader
        allAccounts={allAccounts}
        currentAccountName={currentAccountName}
        publicKey={publicKey}
      />
      <View.Content hasNoTopPadding>
        <div className="AccountView" data-testid="account-view">
          <div className="AccountView__account-actions">
            <div className="AccountView__account-details">
              <div className="AccountView__name-key-display">
                <div
                  className="AccountView__account-name"
                  data-testid="account-view-account-name"
                >
                  {currentAccountName}
                </div>
                <CopyText
                  textToCopy={publicKey}
                  tooltipPlacement="bottom"
                  doneLabel="Copied address"
                >
                  <div className="AccountView__account-num">
                    <Icon.Copy01 />
                  </div>
                </CopyText>
              </div>
              <div
                className="AccountView__total-usd-balance"
                key="total-balance"
              >
                {isMainnetNetwork && !hasError
                  ? `$${formatAmount(
                      roundUsdValue(totalBalanceUsd.toString()),
                    )}`
                  : ""}
              </div>
            </div>
            <div className="AccountView__send-receive-display">
              <div className="AccountView__send-receive-button">
                <NavButton
                  showBorder
                  title={t("Send Payment")}
                  id="nav-btn-send"
                  icon={<Icon.Send01 />}
                  onClick={() => navigateTo(ROUTES.sendPayment, navigate)}
                />
              </div>
              <div
                className="AccountView__send-receive-button"
                data-testid="account-options-dropdown"
              >
                <AccountOptionsDropdown
                  isFunded={!!accountData.data?.balances?.isFunded}
                />
              </div>
            </div>
          </div>
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
          {accountData.data?.balances?.error?.horizon && (
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

          {accountData.data?.balances?.isFunded && !hasError && (
            <div
              className="AccountView__assets-wrapper"
              data-testid="account-assets"
            >
              <AccountAssets
                sortedBalances={accountData.data.balances.balances}
                assetPrices={tokenPrices}
                assetIcons={accountData.data.balances.icons || {}}
                setSelectedAsset={setSelectedAsset}
                soroswapTokens={accountData.data.soroswapTokens}
              />
            </div>
          )}
        </div>
      </View.Content>
      {!accountData.data?.balances?.isFunded &&
        !hasError &&
        !accountData.data?.balances?.error?.horizon && (
          <View.Footer>
            <NotFundedMessage
              canUseFriendbot={!!networkDetails.friendbotUrl}
              publicKey={publicKey}
              reloadBalances={fetchData}
            />
          </View.Footer>
        )}
    </>
  );
};
