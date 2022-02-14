import React, { useEffect, useRef, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import styled, { css } from "styled-components";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { emitMetric } from "helpers/metrics";
import {
  accountNameSelector,
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { getAccountDetails } from "@shared/api/internal";

import { COLOR_PALETTE } from "popup/constants/styles";
import { POPUP_WIDTH } from "constants/dimensions";
import { ROUTES } from "popup/constants/routes";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { BasicButton } from "popup/basics/Buttons";

import { Header } from "popup/components/Header";
import { AccountDetails } from "popup/components/account/AccountDetails";
import { AccountDropdown } from "popup/components/account/AccountDropdown";
import { Toast } from "popup/components/Toast";
import { Menu } from "popup/components/Menu";

import CopyColorIcon from "popup/assets/copy-color.svg";
import QrCode from "popup/assets/qr-code.png";

import { AccountDetailsInterface } from "@shared/api/types";

import "popup/metrics/authServices";

const AccountEl = styled.div`
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  box-sizing: border-box;
  padding: 1.75rem 0 0 0;
  background-color: #ffffff;
`;

const AccountHeaderEl = styled.div`
  align-items: center;
  background: ${COLOR_PALETTE.white};
  display: flex;
  font-size: 0.81rem;
  justify-content: space-between;
  padding: 0 1rem;
`;

const AccountHeaderButtonStyle = css`
  border-radius: 0.3125rem;
  padding: 0.5rem;

  &:hover {
    background: #f8fafe;
  }
`;

const CopyButtonEl = styled(BasicButton)`
  color: ${COLOR_PALETTE.primary};
  display: flex;
  ${AccountHeaderButtonStyle}

  img {
    margin-right: 0.5rem;
    width: 1rem;
    height: 1rem;
  }
`;

const QrButton = styled(BasicButton)`
  background: url(${QrCode});
  background-size: cover;
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  vertical-align: text-top;
`;

const DetailsLink = styled(Link)`
  ${AccountHeaderButtonStyle}
  vertical-align: middle;
`;

const CopiedToastWrapperEl = styled.div`
  margin: 5rem 0 0 -2rem;
  padding: 0.5rem;
  position: absolute;
  right: 15rem;
`;

const defaultAccountDetails = {
  balances: null,
  isFunded: null,
  operations: [],
} as AccountDetailsInterface;

export const Account = () => {
  const [isCopied, setIsCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [accountDetails, setAccountDetails] = useState(defaultAccountDetails);
  const [isAccountFriendbotFunded, setIsAccountFriendbotFunded] = useState(
    false,
  );
  const [sortedBalances, setSortedBalances] = useState([] as Array<any>);

  const publicKey = useSelector(publicKeySelector);
  const allAccounts = useSelector(allAccountsSelector);
  const currentAccountName = useSelector(accountNameSelector);
  const accountDropDownRef = useRef<HTMLDivElement>(null);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const { balances } = accountDetails;

  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        const res = await getAccountDetails({ publicKey, networkDetails });
        setAccountDetails(res);
      } catch (e) {
        console.error(e);
      }
    };

    fetchAccountDetails();
  }, [publicKey, networkDetails, isAccountFriendbotFunded]);

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
  }, [balances, networkDetails]);

  const closeDropdown = (e: React.ChangeEvent<any>) => {
    if (
      accountDropDownRef.current &&
      !accountDropDownRef.current.contains(e.target)
    ) {
      setIsDropdownOpen(false);
    }
  };

  return (
    <section onClick={closeDropdown}>
      <Header>
        <Menu />
      </Header>
      <AccountHeaderEl>
        <AccountDropdown
          accountDropDownRef={accountDropDownRef}
          allAccounts={allAccounts}
          currentAccountName={currentAccountName}
          isDropdownOpen={isDropdownOpen}
          setIsDropdownOpen={setIsDropdownOpen}
          publicKey={publicKey}
        />
        <CopyToClipboard
          text={publicKey}
          onCopy={() => {
            setIsCopied(true);
            emitMetric(METRIC_NAMES.accountScreenCopyPublickKey);
          }}
        >
          <CopyButtonEl>
            <img src={CopyColorIcon} alt="copy button" /> Copy
          </CopyButtonEl>
        </CopyToClipboard>
        <CopiedToastWrapperEl>
          <Toast
            message="Copied to your clipboard 👌"
            isShowing={isCopied}
            setIsShowing={setIsCopied}
          />
        </CopiedToastWrapperEl>
        <DetailsLink to={ROUTES.viewPublicKey}>
          <QrButton /> Details
        </DetailsLink>
      </AccountHeaderEl>
      <AccountEl>
        <AccountDetails
          accountDetails={accountDetails}
          sortedBalances={sortedBalances}
          setIsAccountFriendbotFunded={setIsAccountFriendbotFunded}
        />
      </AccountEl>
    </section>
  );
};
