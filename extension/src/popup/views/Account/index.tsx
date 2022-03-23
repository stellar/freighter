import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CopyText, Icon, Button, NavButton } from "@stellar/design-system";

import { AccountBalancesInterface, AssetIcons } from "@shared/api/types";
import { getAssetIcons } from "@shared/api/internal";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  accountNameSelector,
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import {
  getAccountBalances,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { ROUTES } from "popup/constants/routes";
import { truncatedPublicKey } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { AccountAssets } from "popup/components/account/AccountAssets";
import { AccountHeader } from "popup/components/account/AccountHeader";
import { NotFundedMessage } from "popup/components/account/NotFundedMessage";
import { BottomNav } from "popup/components/BottomNav";

import "popup/metrics/authServices";

import "./styles.scss";

export const defaultAccountBalances = {
  balances: null,
  isFunded: null,
} as AccountBalancesInterface;

export const Account = () => {
  const dispatch = useDispatch();
  const { accountBalances } = useSelector(transactionSubmissionSelector);
  const [isAccountFriendbotFunded, setIsAccountFriendbotFunded] = useState(
    false,
  );
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const currentAccountName = useSelector(accountNameSelector);
  const [sortedBalances, setSortedBalances] = useState([] as Array<any>);
  const [assetIcons, setAssetIcons] = useState({} as AssetIcons);

  const allAccounts = useSelector(allAccountsSelector);
  const accountDropDownRef = useRef<HTMLDivElement>(null);

  const { balances, isFunded } = accountBalances;

  useEffect(() => {
    dispatch(
      getAccountBalances({
        publicKey,
        networkDetails,
      }),
    );
  }, [publicKey, networkDetails, isAccountFriendbotFunded, dispatch]);

  useEffect(() => {
    const collection = [] as Array<any>;
    if (!balances) return;

    // put XLM at the top of the balance list
    Object.entries(balances).forEach(([k, v]) => {
      if (k === "native") {
        collection.unshift(v);
      } else if (!k.includes(":lp")) {
        collection.push(v);
      }
    });
    setSortedBalances(collection);

    // get each asset's icon
    const fetchAssetIcons = async () => {
      try {
        const res = await getAssetIcons({ balances, networkDetails });
        setAssetIcons(res);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAssetIcons();
  }, [balances, networkDetails]);

  return (
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
                title="qr-nav"
                id="nav-btn-qr"
                icon={<Icon.QrCode />}
                onClick={() => navigateTo(ROUTES.viewPublicKey)}
              />
            </div>
            <div className="AccountView__send-receive-button">
              <NavButton
                showBorder
                title="send-nav"
                id="nav-btn-send"
                icon={<Icon.Send />}
                onClick={() => navigateTo(ROUTES.sendPayment)}
              />
            </div>
          </div>
        </div>
        <div className="AccountView__assets-wrapper">
          {isFunded ? (
            <>
              <AccountAssets
                sortedBalances={sortedBalances}
                assetIcons={assetIcons}
              />
              <div>
                {/* TODO - handle click */}
                <Button fullWidth variant={Button.variant.tertiary}>
                  Manage Assets
                </Button>
              </div>
            </>
          ) : (
            <NotFundedMessage
              isTestnet={networkDetails.isTestnet}
              setIsAccountFriendbotFunded={setIsAccountFriendbotFunded}
              publicKey={publicKey}
            />
          )}
        </div>
      </div>
      <BottomNav />
    </>
  );
};
