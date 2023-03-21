import React, { useContext, useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CopyText, Icon, NavButton } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import { getAccountHistory } from "@shared/api/internal";
import {
  AssetType,
  AccountBalancesInterface,
  ActionStatus,
} from "@shared/api/types";

import { AppDispatch } from "popup/App";
import { Sep24Status } from "popup/constants/sep24";
import { Button } from "popup/basics/buttons/Button";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import {
  accountNameSelector,
  allAccountsSelector,
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import {
  getAccountBalances,
  getAssetIcons,
  getAssetDomains,
  transactionSubmissionSelector,
  resetSubmission,
  resetAccountBalanceStatus,
  saveAssetSelectType,
  AssetSelectType,
  getBlockedDomains,
  loadSep24Data,
  signFreighterTransaction,
  setSubmitStatus,
} from "popup/ducks/transactionSubmission";
import {
  sorobanSelector,
  getTokenBalances,
  resetSorobanTokensStatus,
} from "popup/ducks/soroban";
import { ROUTES } from "popup/constants/routes";
import {
  AssetOperations,
  sortBalances,
  sortOperationsByAsset,
} from "popup/helpers/account";
import { isTestnet, truncatedPublicKey } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import {
  getAuthToken,
  startSep24Polling,
  getAnchorSep24Data,
} from "popup/helpers/sep24";
import { Sep24Todo } from "popup/components/sep24";
import { AccountAssets } from "popup/components/account/AccountAssets";
import { AccountHeader } from "popup/components/account/AccountHeader";
import { AssetDetail } from "popup/components/account/AssetDetail";
import { NotFundedMessage } from "popup/components/account/NotFundedMessage";
import { BottomNav } from "popup/components/BottomNav";
import { SorobanContext } from "../../SorobanContext";

import "popup/metrics/authServices";

import "./styles.scss";

export const defaultAccountBalances = {
  balances: null,
  isFunded: null,
} as AccountBalancesInterface;

export const Account = () => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const {
    accountBalances,
    assetIcons,
    accountBalanceStatus,
    hardwareWalletData: { lastSignedXDR: hwSignedXDR },
    sep24Data: {
      sep10Url,
      sep24Url,
      txId: sep24TxId,
      status: sep24Status,
      anchorDomain,
      asset: sep24Asset,
    },
  } = useSelector(transactionSubmissionSelector);
  const {
    tokenBalances: sorobanBalances,
    getTokenBalancesStatus,
  } = useSelector(sorobanSelector);
  const [isAccountFriendbotFunded, setIsAccountFriendbotFunded] = useState(
    false,
  );

  const { isExperimentalModeEnabled } = useSelector(settingsSelector);

  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const currentAccountName = useSelector(accountNameSelector);
  const allAccounts = useSelector(allAccountsSelector);
  const [sortedBalances, setSortedBalances] = useState([] as Array<AssetType>);
  const [assetOperations, setAssetOperations] = useState({} as AssetOperations);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [sep24Todo, setSep24Todo] = useState("");
  const [sep10Token, setSep10Token] = useState("");
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);
  const [freighterSignedXDR, setFreighterSignedXDR] = useState("");

  const accountDropDownRef = useRef<HTMLDivElement>(null);

  const { balances, isFunded } = accountBalances;

  const builder = useContext(SorobanContext);

  useEffect(() => {
    // reset to avoid any residual data eg switching between send and swap or
    // previous stale sends
    dispatch(resetSubmission());
    dispatch(
      getAccountBalances({
        publicKey,
        networkDetails,
      }),
    );
    dispatch(getBlockedDomains());
    dispatch(loadSep24Data());

    if (isExperimentalModeEnabled) {
      dispatch(getTokenBalances({ sorobanClient: builder }));
    }

    return () => {
      dispatch(resetAccountBalanceStatus());
      if (isExperimentalModeEnabled) {
        dispatch(resetSorobanTokensStatus());
      }
    };
  }, [
    builder,
    isExperimentalModeEnabled,
    publicKey,
    networkDetails,
    isAccountFriendbotFunded,
    dispatch,
  ]);

  useEffect(() => {
    const hasFetchedSorobanTokens =
      isExperimentalModeEnabled &&
      (getTokenBalancesStatus === ActionStatus.IDLE ||
        getTokenBalancesStatus === ActionStatus.PENDING);
    if (!balances || hasFetchedSorobanTokens) return;

    setSortedBalances(sortBalances(balances, sorobanBalances));

    dispatch(getAssetIcons({ balances, networkDetails }));
    dispatch(getAssetDomains({ balances, networkDetails }));
  }, [
    isExperimentalModeEnabled,
    getTokenBalancesStatus,
    sorobanBalances,
    balances,
    networkDetails,
    dispatch,
  ]);

  useEffect(() => {
    const fetchAccountHistory = async () => {
      try {
        const res = await getAccountHistory({ publicKey, networkDetails });
        setAssetOperations(
          sortOperationsByAsset({
            operations: res.operations,
            balances: sortedBalances,
          }),
        );
      } catch (e) {
        console.error(e);
      }
    };
    fetchAccountHistory();
  }, [publicKey, networkDetails, sortedBalances]);

  // if we have sep24 txid then start polling
  useEffect(() => {
    (async () => {
      if (!sep24TxId) {
        return;
      }
      const signedXdr = freighterSignedXDR || hwSignedXDR;
      if (signedXdr) {
        const token = await getAuthToken({
          signedXdr,
          sep10Url,
        });
        setSep10Token(token);
        const _sep24Todo = await startSep24Polling({
          dispatch,
          sep24Url,
          txId: sep24TxId,
          token,
          status: sep24Status,
        });
        setSep24Todo(_sep24Todo === Sep24Status.COMPLETED ? "" : _sep24Todo);
      } else {
        // need to get signed Xdr first
        if (isHardwareWallet) {
          setSep24Todo(Sep24Status.PENDING_HARDWARE_WALLET_SIGN);
          return;
        }
        const {
          challengeTx: transactionXDR,
          networkPassphrase,
        } = await getAnchorSep24Data({
          anchorDomain,
          publicKey,
        });
        const res = await dispatch(
          signFreighterTransaction({
            transactionXDR,
            network: networkPassphrase,
          }),
        );
        if (signFreighterTransaction.fulfilled.match(res)) {
          const { signedTransaction } = res.payload;
          setFreighterSignedXDR(signedTransaction);
        }
        dispatch(setSubmitStatus(ActionStatus.IDLE));
      }
    })();
  }, [
    dispatch,
    sep10Url,
    sep24Url,
    sep24Status,
    publicKey,
    isHardwareWallet,
    sep24TxId,
    anchorDomain,
    freighterSignedXDR,
    hwSignedXDR,
  ]);

  const isLoading =
    accountBalanceStatus === ActionStatus.PENDING ||
    accountBalanceStatus === ActionStatus.IDLE;

  return selectedAsset ? (
    <AssetDetail
      accountBalances={sortedBalances}
      assetOperations={assetOperations[selectedAsset]}
      networkDetails={networkDetails}
      publicKey={publicKey}
      selectedAsset={selectedAsset}
      setSelectedAsset={setSelectedAsset}
      subentryCount={accountBalances.subentryCount}
    />
  ) : (
    <>
      {isLoading ? null : (
        <div className="AccountView">
          <AccountHeader
            accountDropDownRef={accountDropDownRef}
            allAccounts={allAccounts}
            currentAccountName={currentAccountName}
            publicKey={publicKey}
          />
          <div className="AccountView__account-actions">
            <div className="AccountView__name-key-display">
              <div className="AccountView__account-name">
                {currentAccountName}
              </div>
              <CopyText
                textToCopy={publicKey}
                showTooltip
                tooltipPosition={CopyText.tooltipPosition.RIGHT}
              >
                <div className="AccountView__account-num">
                  {truncatedPublicKey(publicKey)}
                  <Icon.Copy />
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
          {isFunded ? (
            <SimpleBar className="AccountView__assets-wrapper">
              <AccountAssets
                sortedBalances={sortedBalances}
                assetIcons={assetIcons}
                setSelectedAsset={setSelectedAsset}
              />
              {sep24Todo && (
                <Sep24Todo
                  todo={sep24Todo}
                  asset={sep24Asset}
                  token={sep10Token}
                />
              )}
            </SimpleBar>
          ) : (
            <NotFundedMessage
              isTestnet={isTestnet(networkDetails)}
              setIsAccountFriendbotFunded={setIsAccountFriendbotFunded}
              publicKey={publicKey}
            />
          )}
          {isFunded ? (
            <Button
              fullWidth
              variant={Button.variant.tertiary}
              onClick={() => {
                dispatch(saveAssetSelectType(AssetSelectType.MANAGE));
                navigateTo(ROUTES.manageAssets);
              }}
            >
              {t("Manage Assets")}
            </Button>
          ) : null}
        </div>
      )}
      <BottomNav />
    </>
  );
};
