import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useSelector } from "react-redux";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import { BasicButton } from "popup/basics/Buttons";

import { publicKeySelector } from "popup/ducks/authServices";
import { getAccountDetails } from "@shared/api/internal";
import { AccountDetailsInterface } from "@shared/api/types";

import { AccountAssets } from "./AccountAssets";
import { AccountHistory } from "./AccountHistory";
import { NotFundedMessage } from "./NotFundedMessage";

const AccountHeaderEl = styled.section`
  align-items: center;
  display: flex;
`;

interface AccountToggleBtnElProps {
  isActive: boolean;
}

const AccountToggleBtnEl = styled(BasicButton)`
  border-bottom: 2px solid
    ${({ isActive }: AccountToggleBtnElProps) =>
      isActive ? COLOR_PALETTE.primary : COLOR_PALETTE.background};
  color: ${({ isActive }: AccountToggleBtnElProps) =>
    isActive ? COLOR_PALETTE.primary : COLOR_PALETTE.greyDark};
  font-size: 1rem;
  font-weight: ${FONT_WEIGHT.normal};
  margin: 0;
  padding: 0 1rem 1.25rem 1rem;
  width: 50%;
`;

const defaultAccountDetails = {
  balances: null,
  isFunded: null,
  payments: null,
} as AccountDetailsInterface;

export const AccountDetails = () => {
  const [isAccountAssetsActive, setIsAccountAssetsActive] = useState(true);

  const [accountDetails, setAccountDetails] = useState(defaultAccountDetails);
  const publicKey = useSelector(publicKeySelector);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        const res = await getAccountDetails(publicKey);
        setAccountDetails(res);
      } catch (e) {
        console.error(e);
      }
    };

    fetchAccountDetails();
  }, [publicKey]);

  const { isFunded, balances } = accountDetails;

  const handleDetailToggle = (isAssetsActive: boolean) => {
    if (isAccountAssetsActive !== isAssetsActive) {
      setIsAccountAssetsActive(isAssetsActive);
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
      {isAccountAssetsActive ? (
        <AccountAssets balances={balances} />
      ) : (
        <AccountHistory />
      )}
    </>
  ) : (
    <NotFundedMessage />
  );
};
