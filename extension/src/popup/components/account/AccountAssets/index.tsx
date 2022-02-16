import React from "react";
import { BigNumber } from "bignumber.js";

import { AssetIcons } from "@shared/api/types";

import StellarLogo from "popup/assets/stellar-logo.png";

import "./styles.scss";

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
    <img
      className="AssetWrapper--asset-logo"
      alt={`${code} logo`}
      src={code === "XLM" ? StellarLogo : assetIcons[code] || ""}
      onError={() => {
        retryAssetIconFetch({ key: issuerKey, code });
      }}
    />
  ) : (
    <div className="AssetWrapper__asset-bullet" />
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
  <div className="AssetWrapper">
    {sortedBalances.map(({ token: { issuer, code }, total }) => (
      <div className="AssetWrapper__asset" key={code}>
        <div className="AssetWrapper__copy-left">
          <AssetIcon
            assetIcons={assetIcons}
            code={code}
            issuerKey={issuer?.key}
            retryAssetIconFetch={retryAssetIconFetch}
          />
          <span>{code}</span>
        </div>
        <div className="AssetWrapper__copy-right">
          <div>
            {new BigNumber(total).toString()} <span>{code}</span>
          </div>
        </div>
      </div>
    ))}
  </div>
);
