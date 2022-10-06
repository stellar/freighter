import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CopyText, Icon, NavButton } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Types } from "@stellar/wallet-sdk";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import { getAccountHistory } from "@shared/api/internal";
import { AccountBalancesInterface } from "@shared/api/types";

import { Button } from "popup/basics/buttons/Button";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  accountNameSelector,
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import {
  ActionStatus,
  getAccountBalances,
  getAssetIcons,
  transactionSubmissionSelector,
  resetSubmission,
  saveAssetSelectType,
  AssetSelectType,
} from "popup/ducks/transactionSubmission";
import { ROUTES } from "popup/constants/routes";
import {
  AssetOperations,
  sortBalances,
  sortOperationsByAsset,
} from "popup/helpers/account";
import { isTestnet, truncatedPublicKey } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { AccountAssets } from "popup/components/account/AccountAssets";
import { AccountHeader } from "popup/components/account/AccountHeader";
import { AssetDetail } from "popup/components/account/AssetDetail";
import { NotFundedMessage } from "popup/components/account/NotFundedMessage";
import { BottomNav } from "popup/components/BottomNav";

import "popup/metrics/authServices";

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
  const [isAccountFriendbotFunded, setIsAccountFriendbotFunded] = useState(
    false,
  );
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const currentAccountName = useSelector(accountNameSelector);
  const allAccounts = useSelector(allAccountsSelector);
  const [sortedBalances, setSortedBalances] = useState(
    [] as Array<Types.AssetBalance | Types.NativeBalance>,
  );
  const [assetOperations, setAssetOperations] = useState({} as AssetOperations);
  const [selectedAsset, setSelectedAsset] = useState("");

  const accountDropDownRef = useRef<HTMLDivElement>(null);

  const { balances, isFunded } = accountBalances;

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
  }, [publicKey, networkDetails, isAccountFriendbotFunded, dispatch]);

  useEffect(() => {
    if (!balances) return;

    setSortedBalances(sortBalances(balances));

    dispatch(getAssetIcons({ balances, networkDetails }));
  }, [balances, networkDetails, dispatch]);

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

  if (accountBalanceStatus === ActionStatus.PENDING) {
    // waiting for account balances to load
    return null;
  }

  return selectedAsset ? (
    <AssetDetail
      accountBalances={accountBalances}
      assetOperations={assetOperations[selectedAsset]}
      networkDetails={networkDetails}
      publicKey={publicKey}
      selectedAsset={selectedAsset}
      setSelectedAsset={setSelectedAsset}
    />
  ) : (
    <>
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
      <BottomNav />
    </>
  );
};
