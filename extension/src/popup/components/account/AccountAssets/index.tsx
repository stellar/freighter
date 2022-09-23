import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BigNumber } from "bignumber.js";
import isEmpty from "lodash/isEmpty";
import StellarSdk, { Horizon } from "stellar-sdk";

import { AssetIcons } from "@shared/api/types";
import { retryAssetIcon } from "@shared/api/internal";

import { getCanonicalFromAsset } from "helpers/stellar";
import StellarLogo from "popup/assets/stellar-logo.png";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";
import ImageMissingIcon from "popup/assets/image-missing.svg";

import "./styles.scss";

const getIsXlm = (code: string) => code === "XLM";

export const AssetIcon = ({
  assetIcons,
  code,
  issuerKey,
  retryAssetIconFetch,
  isLPShare = false,
}: {
  assetIcons: AssetIcons;
  code: string;
  issuerKey: string;
  retryAssetIconFetch?: (arg: { key: string; code: string }) => void;
  isLPShare?: boolean;
}) => {
  /*
    We load asset icons in 2 ways:
    Method 1. We get an asset's issuer and use that to look up toml info to get the icon path
    Method 2. We get an icon path directly from an API (like in the trustline flow) and just pass it to this component to render
  */

  const isXlm = getIsXlm(code);

  // in Method 1, while we wait for the icon path to load, `assetIcons` will be empty until the promise resolves
  // This does not apply for XLM as there is no lookup as that logo lives in this codebase
  const isFetchingAssetIcons = isEmpty(assetIcons) && !isXlm;

  const [hasError, setHasError] = useState(false);

  // For all non-XLM assets (assets where we need to fetch the icon from elsewhere), start by showing a loading state as there is work to do
  const [isLoading, setIsLoading] = useState(!isXlm);

  const canonicalAsset = assetIcons[getCanonicalFromAsset(code, issuerKey)];
  const imgSrc = hasError ? ImageMissingIcon : canonicalAsset || "";

  // If an LP share return early w/ hardcoded icon
  if (isLPShare) {
    return (
      <div className="AccountAssets__asset--logo AccountAssets__asset--lp-share">
        LP
      </div>
    );
  }

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

interface AccountAssetsProps {
  assetIcons: AssetIcons;
  sortedBalances: Array<any>;
  setSelectedAsset?: (selectedAsset: string) => void;
}

export const AccountAssets = ({
  assetIcons: inputAssetIcons,
  sortedBalances,
  setSelectedAsset,
}: AccountAssetsProps) => {
  const [assetIcons, setAssetIcons] = useState(inputAssetIcons);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [hasIconFetchRetried, setHasIconFetchRetried] = useState(false);
  const { assetDomains, blockedDomains } = useSelector(
    transactionSubmissionSelector,
  );

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

  const handleClick = (code: string) => {
    if (setSelectedAsset) {
      setSelectedAsset(getIsXlm(code) ? "native" : code);
    }
  };

  const getLPShareCode = (reserves: Horizon.Reserve[]) => {
    if (!reserves[0] || !reserves[1]) {
      return "";
    }

    let assetA = reserves[0].asset.split(":")[0];
    let assetB = reserves[1].asset.split(":")[0];

    if (assetA === StellarSdk.Asset.native().toString()) {
      assetA = StellarSdk.Asset.native().code;
    }
    if (assetB === StellarSdk.Asset.native().toString()) {
      assetB = StellarSdk.Asset.native().code;
    }

    return `${assetA} / ${assetB} `;
  };

  return (
    <>
      {sortedBalances.map((rb: any) => {
        let issuer;
        let code = "";
        let amountUnit;
        if (rb.liquidityPoolId) {
          issuer = "lp";
          code = getLPShareCode(rb.reserves);
          amountUnit = "shares";
        } else {
          issuer = rb.token.issuer;
          code = rb.token.code;
          amountUnit = rb.token.code;
        }
        const isLP = issuer === "lp";
        const canonicalAsset = getCanonicalFromAsset(code, issuer?.key);

        const assetDomain = assetDomains[canonicalAsset];
        const isScamAsset = !!blockedDomains.domains[assetDomain];

        return (
          <div
            className={`AccountAssets__asset ${
              setSelectedAsset && !isLP
                ? "AccountAssets__asset--has-detail"
                : ""
            }`}
            key={canonicalAsset}
            onClick={isLP ? () => null : () => handleClick(canonicalAsset)}
          >
            <div className="AccountAssets__copy-left">
              <AssetIcon
                assetIcons={assetIcons}
                code={code}
                issuerKey={issuer?.key}
                retryAssetIconFetch={retryAssetIconFetch}
                isLPShare={!!rb.liquidityPoolId}
              />
              <span>{code}</span>
              <ScamAssetIcon isScamAsset={isScamAsset} />
            </div>
            <div className="AccountAssets__copy-right">
              <div>
                {new BigNumber(rb.total).toFixed()} <span>{amountUnit}</span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
