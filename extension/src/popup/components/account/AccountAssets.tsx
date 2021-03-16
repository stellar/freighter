import React from "react";
import styled from "styled-components";
import { BigNumber } from "bignumber.js";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { Balances } from "@shared/api/types";

import StellarLogo from "popup/assets/stellar-logo.png";

const AssetWrapper = styled.div`
  height: 4rem;
`;

const AssetEl = styled.div`
  align-items: center;
  border-bottom: 1px solid ${COLOR_PALETTE.greyFaded};
  display: flex;
  padding: 0 1rem;
`;

const AssetLogoEl = styled.img`
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

export const AccountAssets = ({ balances }: { balances: Balances }) => (
  <AssetWrapper>
    {balances &&
      Object.values(balances).map(({ token: { code, type }, total }) => (
        <AssetEl key={type}>
          <AssetLogoEl alt="Asset logo" src={StellarLogo} />
          <LumenBalanceEl>
            {new BigNumber(total).toString()} <AssetTypeEl>{code}</AssetTypeEl>
          </LumenBalanceEl>
        </AssetEl>
      ))}
  </AssetWrapper>
);
