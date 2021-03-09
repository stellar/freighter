import React from "react";
import styled from "styled-components";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import StellarLogo from "popup/assets/stellar-logo.png";

const AccountAssetsHeaderEl = styled.h3`
  color: ${COLOR_PALETTE.greyDark};
  font-size: 1rem;
  font-weight: ${FONT_WEIGHT.normal};
  margin: 0;
`;

const AssetWrapper = styled.div`
  align-items: center;
  display: flex;
  height: 4rem;
`;

const StellarLogoEl = styled.img`
  margin-right: 0.75rem;
  width: 1.625rem;
`;

const LumenBalanceEl = styled.h2`
  font-size: 1.56rem;
  font-weight: ${FONT_WEIGHT.bold};
`;

const AssetTypeEl = styled.span`
  color: ${COLOR_PALETTE.secondaryText};
  font-size: 1.25rem;
  font-weight: ${FONT_WEIGHT.normal};
`;

interface AccountAssetsProps {
  accountBalance: string;
}

export const AccountAssets = ({ accountBalance }: AccountAssetsProps) => (
  <>
    <AccountAssetsHeaderEl>Account assets</AccountAssetsHeaderEl>
    <AssetWrapper>
      <StellarLogoEl alt="Stellar logo" src={StellarLogo} />
      <LumenBalanceEl>
        {accountBalance} <AssetTypeEl>XLM</AssetTypeEl>
      </LumenBalanceEl>
    </AssetWrapper>
  </>
);
