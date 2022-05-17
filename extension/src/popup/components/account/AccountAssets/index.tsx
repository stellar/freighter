import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BigNumber } from "bignumber.js";

import { AssetIcons } from "@shared/api/types";
import { retryAssetIcon } from "@shared/api/internal";

import { getCanonicalFromAsset } from "helpers/stellar";
import StellarLogo from "popup/assets/stellar-logo.png";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import "./styles.scss";

export const AssetIcon = ({
  assetIcons,
  code,
  issuerKey,
  retryAssetIconFetch,
}: {
  assetIcons: AssetIcons;
  code: string;
  issuerKey: string;
  retryAssetIconFetch?: (arg: { key: string; code: string }) => void;
}) =>
  assetIcons[getCanonicalFromAsset(code, issuerKey)] || code === "XLM" ? (
    <img
      className="AccountAssets__asset--logo"
      alt={`${code} logo`}
      src={
        code === "XLM"
          ? StellarLogo
          : assetIcons[getCanonicalFromAsset(code, issuerKey)] || ""
      }
      onError={() => {
        if (retryAssetIconFetch) {
          retryAssetIconFetch({ key: issuerKey, code });
        }
      }}
    />
  ) : (
    <div className="AccountAssets__asset--bullet" />
  );

export const AccountAssets = ({
  assetIcons: inputAssetIcons,
  sortedBalances,
}: {
  assetIcons: AssetIcons;
  sortedBalances: Array<any>;
}) => {
  const [assetIcons, setAssetIcons] = useState(inputAssetIcons);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [hasIconFetchRetried, setHasIconFetchRetried] = useState(false);

  useEffect(() => {
    setAssetIcons(inputAssetIcons);
  }, [inputAssetIcons]);

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

  return (
    <>
      {sortedBalances.map(({ token: { issuer, code }, total }) => (
        <div
          className="AccountAssets__asset"
          key={`${code}:${issuer?.key || ""}`}
        >
          <div className="AccountAssets__copy-left">
            <AssetIcon
              assetIcons={assetIcons}
              code={code}
              issuerKey={issuer?.key}
              retryAssetIconFetch={retryAssetIconFetch}
            />
            <span>{code}</span>
          </div>
          <div className="AccountAssets__copy-right">
            <div>
              {new BigNumber(total).toString()} <span>{code}</span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
