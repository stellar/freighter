import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CopyText, Icon, NavButton } from "@stellar/design-system";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import { AccountBalancesInterface } from "@shared/api/types";

import { Button } from "popup/basics/buttons/Button";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  accountNameSelector,
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import {
  getAccountBalances,
  getAssetIcons,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { ROUTES } from "popup/constants/routes";
import { sortBalances } from "popup/helpers/account";
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
  const { accountBalances, assetIcons } = useSelector(
    transactionSubmissionSelector,
  );
  const [isAccountFriendbotFunded, setIsAccountFriendbotFunded] = useState(
    false,
  );
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const currentAccountName = useSelector(accountNameSelector);
  const allAccounts = useSelector(allAccountsSelector);
  const [sortedBalances, setSortedBalances] = useState([] as Array<any>);

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
    if (!balances) return;

    setSortedBalances(sortBalances(balances));

    dispatch(getAssetIcons({ balances, networkDetails }));
  }, [balances, networkDetails, dispatch]);

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
        <SimpleBar className="AccountView__assets-wrapper">
          {isFunded ? (
            <AccountAssets
              sortedBalances={sortedBalances}
              assetIcons={assetIcons}
            />
          ) : (
            <NotFundedMessage
              isTestnet={networkDetails.isTestnet}
              setIsAccountFriendbotFunded={setIsAccountFriendbotFunded}
              publicKey={publicKey}
            />
          )}
        </SimpleBar>
        {isFunded ? (
          <Link to={ROUTES.manageAssets}>
            <Button fullWidth variant={Button.variant.tertiary}>
              Manage Assets
            </Button>
          </Link>
        ) : null}
      </div>
      <BottomNav />
    </>
  );
};
