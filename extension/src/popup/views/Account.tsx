import React, { useState, useEffect, useRef } from "react";
// import CopyToClipboard from "react-copy-to-clipboard";
import styled, { css } from "styled-components";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

// import { emitMetric } from "helpers/metrics";
import {
  accountNameSelector,
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";

import { AccountDetailsInterface, AssetIcons } from "@shared/api/types";
import {
  getAccountDetails,
  getAssetIcons,
  retryAssetIcon,
} from "@shared/api/internal";

import { COLOR_PALETTE } from "popup/constants/styles";
// import { POPUP_WIDTH } from "constants/dimensions";
import { ROUTES } from "popup/constants/routes";

// import { METRIC_NAMES } from "popup/constants/metricsNames";

import { BasicButton } from "popup/basics/Buttons";

import { AccountHeader } from "popup/components/account/AccountHeader";
import { BottomNav } from "popup/components/BottomNav";
// import { Header } from "popup/components/Header";
// import { AccountDetails } from "popup/components/account/AccountDetails";
import { AccountAssets } from "popup/components/account/AccountAssets";
// import { AccountDropdown } from "popup/components/account/AccountDropdown";
// import { Toast } from "popup/components/Toast";
// import { Menu } from "popup/components/Menu";

// import CopyColorIcon from "popup/assets/copy-color.svg";
import QrCode from "popup/assets/qr-code.png";

import { CopyText, Icon } from "@stellar/design-system";

import "popup/metrics/authServices";

// const AccountEl = styled.div`
//   width: 100%;
//   max-width: ${POPUP_WIDTH}px;
//   box-sizing: border-box;
//   padding: 1.75rem 0 0 0;
//   background-color: #ffffff;
// `;

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

// const CopyButtonEl = styled(BasicButton)`
//   color: ${COLOR_PALETTE.primary};
//   display: flex;
//   ${AccountHeaderButtonStyle}

//   img {
//     margin-right: 0.5rem;
//     width: 1rem;
//     height: 1rem;
//   }
// `;

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

const SendLink = styled.div``;

const ManageAssetsButton = styled.div``;

const AccountAssetsListEl = styled.div``;

// ALEC TODO - better name?
const AccountTopEl = styled.div``;

// const CopiedToastWrapperEl = styled.div`
//   margin: 5rem 0 0 -2rem;
//   padding: 0.5rem;
//   position: absolute;
//   right: 15rem;
// `;

const defaultAccountDetails = {
  balances: null,
  isFunded: null,
  operations: [],
} as AccountDetailsInterface;

export const Account = () => {
  const [accountDetails, setAccountDetails] = useState(defaultAccountDetails);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const currentAccountName = useSelector(accountNameSelector);
  const [sortedBalances, setSortedBalances] = useState([] as Array<any>);
  const [hasIconFetchRetried, setHasIconFetchRetried] = useState(false);
  const [assetIcons, setAssetIcons] = useState({} as AssetIcons);

  // const [isCopied, setIsCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const allAccounts = useSelector(allAccountsSelector);
  const accountDropDownRef = useRef<HTMLDivElement>(null);

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
  }, [publicKey, networkDetails]);

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

  // ALEC TODO - need this?
  // ALEC TODO - move to the AccountAssets component?
  /* if an image url 404's, this will try exactly once to rescrape the toml for a new url to cache */
  const retryAssetIconFetch = async ({
    key,
    code,
  }: {
    key: string;
    code: string;
  }) => {
    /* if we retried the toml and their link is still bad, just give up here */
    if (hasIconFetchRetried) return;
    try {
      const res = await retryAssetIcon({
        key,
        code,
        assetIcons,
        networkDetails,
      });
      setAssetIcons(res);
      setHasIconFetchRetried(true);
    } catch (e) {
      console.error(e);
    }
  };

  // const closeDropdown = (e: React.ChangeEvent<any>) => {
  //   if (
  //     accountDropDownRef.current &&
  //     !accountDropDownRef.current.contains(e.target)
  //   ) {
  //     setIsDropdownOpen(false);
  //   }
  // };

  return (
    <section>
      {/* ALEC TODO - rename to AccountHeader */}
      <AccountTopEl>
        {" "}
        <AccountHeader
          accountDropDownRef={accountDropDownRef}
          allAccounts={allAccounts}
          currentAccountName={currentAccountName}
          isDropdownOpen={isDropdownOpen}
          setIsDropdownOpen={setIsDropdownOpen}
          publicKey={publicKey}
        />
      </AccountTopEl>

      <AccountHeaderEl>
        <CopyText
          textToCopy={publicKey}
          showCopyIcon
          showTooltip
          tooltipPosition={CopyText.tooltipPosition.RIGHT}
        >
          <div>
            {currentAccountName} <br />
            {publicKey} <br />
          </div>
        </CopyText>

        {/* 
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
        </CopiedToastWrapperEl> */}
        <DetailsLink to={ROUTES.viewPublicKey}>
          <QrButton /> Details
        </DetailsLink>
        {/* TODO - link to new sendFunds page */}
        <SendLink>
          <Icon.Send />
        </SendLink>
      </AccountHeaderEl>
      <AccountAssetsListEl>
        <AccountAssets
          sortedBalances={sortedBalances}
          assetIcons={assetIcons}
          retryAssetIconFetch={retryAssetIconFetch}
        />
      </AccountAssetsListEl>
      <ManageAssetsButton>
        {/* ALEC TODO */}
        <button>Manage Assets</button>
      </ManageAssetsButton>
      <BottomNav></BottomNav>
    </section>
  );
};
