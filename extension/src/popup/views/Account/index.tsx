import React, { useContext, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  CopyText,
  Icon,
  NavButton,
  Notification,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  getAccountHistoryStandalone,
  getIndexerAccountHistory,
} from "@shared/api/internal";
import {
  AccountBalancesInterface,
  ActionStatus,
  AssetType,
} from "@shared/api/types";

import {
  settingsNetworkDetailsSelector,
  settingsSorobanSupportedSelector,
  settingsSelector,
} from "popup/ducks/settings";
import { View } from "popup/basics/layout/View";
import {
  accountStatusSelector,
  accountNameSelector,
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import {
  getAssetIcons,
  getAssetDomains,
  transactionSubmissionSelector,
  resetSubmission,
  resetAccountBalanceStatus,
  saveAssetSelectType,
  AssetSelectType,
  getBlockedDomains,
  getAccountBalances,
} from "popup/ducks/transactionSubmission";
import { ROUTES } from "popup/constants/routes";
import {
  AssetOperations,
  sortBalances,
  sortOperationsByAsset,
} from "popup/helpers/account";
import { isCustomNetwork, truncatedPublicKey } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { AccountAssets } from "popup/components/account/AccountAssets";
import { AccountHeader } from "popup/components/account/AccountHeader";
import { AssetDetail } from "popup/components/account/AssetDetail";
import { Loading } from "popup/components/Loading";
import { NotFundedMessage } from "popup/components/account/NotFundedMessage";

import "popup/metrics/authServices";

import { SorobanContext } from "../../SorobanContext";

import "./styles.scss";

export const defaultAccountBalances = {
  balances: null,
  isFunded: null,
} as AccountBalancesInterface;

export const Account = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { accountBalances, assetIcons, accountBalanceStatus } = useSelector(
    transactionSubmissionSelector,
  );
  const accountStatus = useSelector(accountStatusSelector);
  const [isAccountFriendbotFunded, setIsAccountFriendbotFunded] = useState(
    false,
  );

  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const { userNotification } = useSelector(settingsSelector);
  const currentAccountName = useSelector(accountNameSelector);
  const allAccounts = useSelector(allAccountsSelector);
  const [sortedBalances, setSortedBalances] = useState([] as AssetType[]);
  const [assetOperations, setAssetOperations] = useState({} as AssetOperations);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [isLoading, setLoading] = useState(true);

  const sorobanClient = useContext(SorobanContext);

  const { balances, isFunded, error } = accountBalances;

  useEffect(() => {
    // reset to avoid any residual data eg switching between send and swap or
    // previous stale sends
    setLoading(true);
    dispatch(resetSubmission());
    dispatch(
      getAccountBalances({
        publicKey,
        networkDetails,
        sorobanClient,
      }),
    );
    dispatch(getBlockedDomains());

    return () => {
      dispatch(resetAccountBalanceStatus());
    };
  }, [
    publicKey,
    networkDetails,
    isAccountFriendbotFunded,
    sorobanClient,
    dispatch,
  ]);

  useEffect(() => {
    if (!balances) {
      return;
    }

    setSortedBalances(sortBalances(balances));
    dispatch(getAssetIcons({ balances, networkDetails }));
    dispatch(getAssetDomains({ balances, networkDetails }));
  }, [balances, networkDetails, dispatch]);

  useEffect(() => {
    if (!balances) {
      return;
    }

    const fetchAccountHistory = async () => {
      try {
        let operations = [];
        if (isCustomNetwork(networkDetails)) {
          operations = await getAccountHistoryStandalone({
            publicKey,
            networkDetails,
          });
        } else {
          operations = await getIndexerAccountHistory({
            publicKey,
            networkDetails,
          });
        }
        setAssetOperations(
          sortOperationsByAsset({
            operations,
            balances: sortedBalances,
            networkDetails,
            publicKey,
          }),
        );
      } catch (e) {
        console.error(e);
      }
    };
    fetchAccountHistory();
  }, [publicKey, networkDetails, balances, sortedBalances]);

  const hasError = accountBalanceStatus === ActionStatus.ERROR;

  useEffect(() => {
    if (
      !(
        accountBalanceStatus === ActionStatus.PENDING ||
        accountBalanceStatus === ActionStatus.IDLE ||
        accountStatus === ActionStatus.PENDING
      )
    ) {
      setLoading(false);
    }
  }, [accountBalanceStatus, accountStatus]);

  return selectedAsset ? (
    <AssetDetail
      accountBalances={sortedBalances}
      assetOperations={assetOperations[selectedAsset] || []}
      networkDetails={networkDetails}
      publicKey={publicKey}
      selectedAsset={selectedAsset}
      setSelectedAsset={setSelectedAsset}
      subentryCount={accountBalances.subentryCount}
    />
  ) : (
    <>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <AccountHeader
            // accountDropDownRef={accountDropDownRef}
            allAccounts={allAccounts}
            currentAccountName={currentAccountName}
            publicKey={publicKey}
            setLoading={setLoading}
          />
          <View.Content
            hasNoTopPadding
            contentFooter={
              isFunded ? (
                <div className="AccountView__assets-button">
                  <Button
                    size="md"
                    variant="secondary"
                    onClick={() => {
                      dispatch(saveAssetSelectType(AssetSelectType.MANAGE));
                      navigateTo(ROUTES.manageAssets);
                    }}
                  >
                    {t("Manage Assets")}
                  </Button>
                </div>
              ) : null
            }
          >
            <div className="AccountView" data-testid="account-view">
              <div className="AccountView__account-actions">
                <div className="AccountView__name-key-display">
                  <div
                    className="AccountView__account-name"
                    data-testid="account-view-account-name"
                  >
                    {currentAccountName}
                  </div>
                  <CopyText textToCopy={publicKey} tooltipPlacement="right">
                    <div className="AccountView__account-num">
                      {truncatedPublicKey(publicKey)}
                      <Icon.ContentCopy />
                    </div>
                  </CopyText>
                </div>
                <div className="AccountView__send-receive-display">
                  <div className="AccountView__send-receive-button">
                    <NavButton
                      showBorder
                      title={t("View public key")}
                      id="nav-btn-qr"
                      icon={<Icon.QrCode />}
                      onClick={() => navigateTo(ROUTES.viewPublicKey)}
                    />
                  </div>
                  <div className="AccountView__send-receive-button">
                    <NavButton
                      showBorder
                      title={t("Send Payment")}
                      id="nav-btn-send"
                      icon={<Icon.Send />}
                      onClick={() => navigateTo(ROUTES.sendPayment)}
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
                    {t(
                      "Your account balances could not be fetched at this time.",
                    )}
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
              {error?.horizon && (
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

              {isFunded && !hasError && (
                <div className="AccountView__assets-wrapper">
                  <AccountAssets
                    sortedBalances={sortedBalances}
                    assetIcons={assetIcons}
                    setSelectedAsset={setSelectedAsset}
                  />
                </div>
              )}
              {!isFunded && !hasError && !error?.horizon && (
                <NotFundedMessage
                  canUseFriendbot={!!networkDetails.friendbotUrl}
                  setIsAccountFriendbotFunded={setIsAccountFriendbotFunded}
                  publicKey={publicKey}
                />
              )}
            </div>
          </View.Content>
        </>
      )}
    </>
  );
};
