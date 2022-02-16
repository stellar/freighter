import React from "react";
import styled from "styled-components";
import { BigNumber } from "bignumber.js";

import { COLOR_PALETTE } from "popup/constants/styles";
import { AssetIcons } from "@shared/api/types";

import StellarLogo from "popup/assets/stellar-logo.png";

const AssetWrapper = styled.div`
  color: var(--pal-text-primary);
  font-size: 1rem;
  line-height: 1.5rem;
`;

const AssetEl = styled.div`
  align-items: center;
  justify-content: space-between;
  display: flex;
  margin: 2rem 0;
`;

const AssetLogoEl = styled.img`
  margin-right: 1rem;
  width: 2rem;
`;

const AssetBulletEl = styled.div`
  background: ${COLOR_PALETTE.primary};
  border-radius: 10rem;
  height: 0.5rem;
  margin: 0 1.375rem 0 0.5rem;
  width: 0.5rem;
`;

const LumenBalanceEl = styled.div``;

const LeftText = styled.div`
  align-items: center;
  display: flex;
  font-weight: var(--font-weight-medium);
`;

const RightText = styled.div`
  font-weight: var(--font-weight-normal);
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
        <LeftText>
          <AssetIcon
            assetIcons={assetIcons}
            code={code}
            issuerKey={issuer?.key}
            retryAssetIconFetch={retryAssetIconFetch}
          />
          <span>{code}</span>
        </LeftText>
        <RightText>
          <LumenBalanceEl>
            {new BigNumber(total).toString()} <span>{code}</span>
          </LumenBalanceEl>
        </RightText>
      </AssetEl>
    ))}
  </AssetWrapper>
);
