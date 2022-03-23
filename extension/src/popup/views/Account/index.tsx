import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { CopyText, Icon, Button } from "@stellar/design-system";

import { AccountBalancesInterface } from "@shared/api/types";

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
            <div
              className="AccountView__send-receive-button"
              onClick={() => navigateTo(ROUTES.viewPublicKey)}
            >
              <span className="AccountView__qr-icon">
                <Icon.QrCode />
              </span>
            </div>

            <div className="AccountView__send-receive-button">
              <Link
                to={{
                  pathname: ROUTES.sendPayment,
                  state: { accountBalances: JSON.stringify(accountBalances) },
                }}
              >
                <span className="AccountView__send-icon">
                  <Icon.Send />
                </span>
              </Link>
            </div>
          </div>
        </div>
        <div className="AccountView__assets-wrapper">
          {isFunded ? (
            <>
              <AccountAssets balances={balances} />
              <div>
                <Button
                  fullWidth
                  variant={Button.variant.tertiary}
                  onClick={() => navigateTo(ROUTES.manageAssets)}
                >
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
