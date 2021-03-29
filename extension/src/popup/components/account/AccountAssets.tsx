import React from "react";
import styled from "styled-components";
import { BigNumber } from "bignumber.js";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { AssetIcons } from "@shared/api/types";

import { ScrollingView } from "popup/basics/AccountSubview";

import StellarLogo from "popup/assets/stellar-logo.png";

const AssetWrapper = styled.div`
  ${ScrollingView}
  padding-left: 0.75rem;
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

const AssetBulletEl = styled.div`
  background: ${COLOR_PALETTE.primary};
  border-radius: 10rem;
  height: 0.5rem;
  margin: 0 1.375rem 0 0.5rem;
  width: 0.5rem;
`;

const LumenBalanceEl = styled.h2`
  font-size: 1.56rem;
  font-weight: ${FONT_WEIGHT.normal};
`;

const AssetTypeEl = styled.span`
  color: ${COLOR_PALETTE.lightText};
  font-size: 1.25rem;
`;

const AssetIcon = ({
  assetIcons,
  code,
  issuerKey,
  retryAssetIconFetch,
}: {
  assetIcons: AssetIcons;
  code: string;
  issuerKey: string;
  retryAssetIconFetch: (arg: { key: string; code: string }) => void;
}) =>
  assetIcons[code] || code === "XLM" ? (
    <AssetLogoEl
      alt={`${code} logo`}
      src={code === "XLM" ? StellarLogo : assetIcons[code] || ""}
      onError={() => {
        retryAssetIconFetch({ key: issuerKey, code });
      }}
    />
  ) : (
    <AssetBulletEl />
  );

export const AccountAssets = ({
  assetIcons,
  sortedBalances,
  retryAssetIconFetch,
}: {
  assetIcons: AssetIcons;
  sortedBalances: Array<any>;
  retryAssetIconFetch: (arg: { key: string; code: string }) => void;
}) => (
  <AssetWrapper>
    {sortedBalances.map(({ token: { issuer, code }, total }) => (
      <AssetEl key={code}>
        <AssetIcon
          assetIcons={assetIcons}
          code={code}
          issuerKey={issuer?.key}
          retryAssetIconFetch={retryAssetIconFetch}
        />
        <LumenBalanceEl>
          {new BigNumber(total).toString()} <AssetTypeEl>{code}</AssetTypeEl>
        </LumenBalanceEl>
      </AssetEl>
    ))}
  </AssetWrapper>
);
