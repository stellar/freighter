import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BigNumber } from "bignumber.js";
import { isEmpty } from "lodash";

import { AssetIcons } from "@shared/api/types";
import { retryAssetIcon } from "@shared/api/internal";

import { getCanonicalFromAsset } from "helpers/stellar";
import StellarLogo from "popup/assets/stellar-logo.png";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import ImageMissingIcon from "popup/assets/image-missing.svg";

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
}) => {
  /*
    We load asset icons in 2 ways:
    Method 1. We get an asset's issuer and use that to look up toml info to get the icon path
    Method 2. We get an icon path directly from an API (like in the trustline flow) and just pass it to this component to render
  */

  const isXlm = code === "XLM";

  // in Method 1, while we wait for the icon path to load, `assetIcons` will be empty until the promise resolves
  // This does not apply for XLM as there is no lookup as that logo lives in this codebase
  const isFetchingAssetIcons = isEmpty(assetIcons) && !isXlm;

  const [hasError, setHasError] = useState(false);

  // For all non-XLM assets (assets where we need to fetch the icon from elsewhere), start by showing a loading state as there is work to do
  const [isLoading, setIsLoading] = useState(!isXlm);

  const canonicalAsset = assetIcons[getCanonicalFromAsset(code, issuerKey)];
  const imgSrc = hasError ? ImageMissingIcon : canonicalAsset || "";

  // If we're waiting on the icon lookup (Method 1), just return the loader until this re-renders with `assetIcons`. We can't do anything until we have it.
  if (isFetchingAssetIcons) {
    return (
      <div className="AccountAssets__asset--logo AccountAssets__asset--loading" />
    );
  }

  // if we have an asset path, start loading the path in an `<img>`
  return canonicalAsset || isXlm ? (
    <div
      className={`AccountAssets__asset--logo ${
        hasError ? "AccountAssets__asset--error" : ""
      } ${isLoading ? "AccountAssets__asset--loading" : ""}`}
    >
      <img
        alt={`${code} logo`}
        src={isXlm ? StellarLogo : imgSrc}
        onError={() => {
          if (retryAssetIconFetch) {
            retryAssetIconFetch({ key: issuerKey, code });
          }
          // we tried to load an image path but it failed, so show the broken image icon here
          setHasError(true);
        }}
        onLoad={() => {
          // we've sucessfully loaded an icon, end the "loading" state
          setIsLoading(false);
        }}
      />
    </div>
  ) : (
    // the image path wasn't found, show a default broken image icon
    <div className="AccountAssets__asset--logo AccountAssets__asset--error">
      <img src={ImageMissingIcon} alt="Asset icon missing" />
    </div>
  );
};

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
              {new BigNumber(total).toFixed()} <span>{code}</span>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
