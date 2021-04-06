import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useSelector } from "react-redux";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import { BasicButton } from "popup/basics/Buttons";
import { ScrollingView } from "popup/basics/AccountSubview";

import { publicKeySelector } from "popup/ducks/authServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  getAccountDetails,
  getAssetIcons,
  retryAssetIcon,
} from "@shared/api/internal";

import { AccountDetailsInterface, AssetIcons } from "@shared/api/types";

import { AccountAssets } from "./AccountAssets";
import { AccountHistory } from "./AccountHistory";
import { NotFundedMessage } from "./NotFundedMessage";

const AccountHeaderEl = styled.section`
  align-items: center;
  border-bottom: 1px solid ${COLOR_PALETTE.greyFaded};
  display: flex;
`;

const AccountBodyEl = styled.section`
  ${ScrollingView}
`;

interface AccountToggleBtnElProps {
  isActive: boolean;
}

const AccountToggleBtnEl = styled(BasicButton)`
  border-bottom: 2px solid
    ${({ isActive }: AccountToggleBtnElProps) =>
      isActive ? COLOR_PALETTE.primary : COLOR_PALETTE.background};
  color: ${({ isActive }: AccountToggleBtnElProps) =>
    isActive ? COLOR_PALETTE.primary : COLOR_PALETTE.lightText};
  font-size: 1rem;
  font-weight: ${({ isActive }: AccountToggleBtnElProps) =>
    isActive ? FONT_WEIGHT.bold : FONT_WEIGHT.normal};
  margin: 0;
  padding: 0 1rem 1.25rem 1rem;
  width: 50%;

  &:hover {
    color: ${COLOR_PALETTE.primary};
  }
`;

const defaultAccountDetails = {
  balances: null,
  isFunded: null,
  operations: [],
} as AccountDetailsInterface;

export const AccountDetails = () => {
  const [isAccountAssetsActive, setIsAccountAssetsActive] = useState(true);
  const [accountDetails, setAccountDetails] = useState(defaultAccountDetails);
  const [sortedBalances, setSortedBalances] = useState([] as Array<any>);
  const [hasIconFetchRetried, setHasIconFetchRetried] = useState(false);
  const [assetIcons, setAssetIcons] = useState({} as AssetIcons);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const { isFunded, balances, operations } = accountDetails;

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
      } else {
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

  const handleDetailToggle = (isAssetsActive: boolean) => {
    if (isAccountAssetsActive !== isAssetsActive) {
      setIsAccountAssetsActive(isAssetsActive);
    }
  };

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

  if (isFunded === null) {
    return null;
  }
  return isFunded ? (
    <>
      <AccountHeaderEl>
        <AccountToggleBtnEl
          isActive={isAccountAssetsActive}
          onClick={() => handleDetailToggle(true)}
        >
          Account assets
        </AccountToggleBtnEl>
        <AccountToggleBtnEl
          isActive={!isAccountAssetsActive}
          onClick={() => handleDetailToggle(false)}
        >
          History
        </AccountToggleBtnEl>
      </AccountHeaderEl>
      <AccountBodyEl>
        {isAccountAssetsActive ? (
          <AccountAssets
            sortedBalances={sortedBalances}
            assetIcons={assetIcons}
            retryAssetIconFetch={retryAssetIconFetch}
          />
        ) : (
          <AccountHistory publicKey={publicKey} operations={operations} />
        )}
      </AccountBodyEl>
    </>
  ) : (
    <NotFundedMessage />
  );
};
