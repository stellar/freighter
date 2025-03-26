import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import isEmpty from "lodash/isEmpty";
import { Asset, Horizon } from "stellar-sdk";
import BigNumber from "bignumber.js";

import { ApiTokenPrices, AssetIcons, AssetType } from "@shared/api/types";
import { retryAssetIcon } from "@shared/api/internal";

import { getCanonicalFromAsset } from "helpers/stellar";
import { isSorobanIssuer } from "popup/helpers/account";
import { formatTokenAmount } from "popup/helpers/soroban";
import { isAssetSuspicious } from "popup/helpers/blockaid";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";

import StellarLogo from "popup/assets/stellar-logo.png";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";
import ImageMissingIcon from "popup/assets/image-missing.svg?react";
import IconSoroban from "popup/assets/icon-soroban.svg?react";
import { AnimatedNumber } from "popup/components/AnimatedNumber";

import "./styles.scss";

const getIsXlm = (code: string) => code === "XLM";

export const SorobanTokenIcon = ({ noMargin }: { noMargin?: boolean }) => (
  <div
    className={`AccountAssets__asset--logo AccountAssets__asset--soroban-token ${
      noMargin ? "AccountAssets__asset--no-margin" : ""
    }`}
  >
    <IconSoroban />
  </div>
);

export const AssetIcon = ({
  assetIcons,
  code,
  issuerKey,
  retryAssetIconFetch,
  isLPShare = false,
  isSorobanToken = false,
  icon,
  isSuspicious = false,
  isModal = false,
}: {
  assetIcons: AssetIcons;
  code: string;
  issuerKey: string;
  retryAssetIconFetch?: (arg: { key: string; code: string }) => void;
  isLPShare?: boolean;
  isSorobanToken?: boolean;
  icon?: string;
  isSuspicious?: boolean;
  isModal?: boolean;
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

  const { soroswapTokens } = useSelector(transactionSubmissionSelector);

  const canonicalAsset = assetIcons[getCanonicalFromAsset(code, issuerKey)];
  let imgSrc = hasError ? ImageMissingIcon : canonicalAsset || "";
  if (icon) {
    imgSrc = icon;
  }

  const _isSorobanToken = !isSorobanToken
    ? issuerKey && isSorobanIssuer(issuerKey)
    : isSorobanToken;

  // If an LP share return early w/ hardcoded icon
  if (isLPShare) {
    return (
      <div className="AccountAssets__asset--logo AccountAssets__asset--lp-share">
        LP
      </div>
    );
  }

  // Get icons for Soroban tokens
  if (_isSorobanToken && !icon) {
    const soroswapTokenDetail = soroswapTokens.find(
      (token) => token.contract === issuerKey,
    );
    // check to see if we have an icon from an external service, like Soroswap
    if (soroswapTokenDetail?.icon) {
      imgSrc = soroswapTokenDetail?.icon;
    } else {
      return <SorobanTokenIcon />;
    }
  }

  // If we're waiting on the icon lookup (Method 1), just return the loader until this re-renders with `assetIcons`. We can't do anything until we have it.
  if (isFetchingAssetIcons) {
    return (
      <div
        data-testid="AccountAssets__asset--loading"
        className="AccountAssets__asset--logo AccountAssets__asset--loading"
      >
        <ScamAssetIcon isScamAsset={isSuspicious} />
      </div>
    );
  }

  // if we have an asset path, start loading the path in an `<img>`
  return canonicalAsset || isXlm || imgSrc ? (
    <div
      data-testid={`AccountAssets__asset--loading-${code}`}
      className={`AccountAssets__asset--logo ${
        hasError ? "AccountAssets__asset--error" : ""
      } ${isLoading ? "AccountAssets__asset--loading" : ""} ${
        isModal ? "AccountAssets__asset--modal" : ""
      }`}
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
      <ScamAssetIcon isScamAsset={isSuspicious} />
    </div>
  ) : (
    // the image path wasn't found, show a default broken image icon
    <div
      className={`AccountAssets__asset--logo AccountAssets__asset--error ${
        isModal ? "AccountAssets__asset--modal" : ""
      }`}
    >
      <ImageMissingIcon />
      <ScamAssetIcon isScamAsset={isSuspicious} />
    </div>
  );
};

interface AccountAssetsProps {
  assetIcons: AssetIcons;
  sortedBalances: AssetType[];
  assetPrices?: ApiTokenPrices;
  setSelectedAsset?: (selectedAsset: string) => void;
}

export const AccountAssets = ({
  assetIcons: inputAssetIcons,
  sortedBalances,
  assetPrices,
  setSelectedAsset,
}: AccountAssetsProps) => {
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
    if (hasIconFetchRetried) {
      return;
    }
    try {
      const res = await retryAssetIcon({
        activePublicKey: null,
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

  const getLPShareCode = (reserves: Horizon.HorizonApi.Reserve[]) => {
    if (!reserves[0] || !reserves[1]) {
      return "";
    }

    let assetA = reserves[0].asset.split(":")[0];
    let assetB = reserves[1].asset.split(":")[0];

    if (assetA === Asset.native().toString()) {
      assetA = Asset.native().code;
    }
    if (assetB === Asset.native().toString()) {
      assetB = Asset.native().code;
    }

    return `${assetA} / ${assetB} `;
  };

  return (
    <>
      {sortedBalances.map((rb) => {
        let isLP = false;
        let issuer = {
          key: "",
        };
        let code = "";
        if (rb.liquidityPoolId) {
          isLP = true;
          code = getLPShareCode(rb.reserves as Horizon.HorizonApi.Reserve[]);
        } else if (rb.contractId && "symbol" in rb) {
          issuer = {
            key: rb.contractId,
          };
          code = rb.symbol;
        } else {
          if ("issuer" in rb.token && rb.token) {
            issuer = rb.token.issuer;
          }
          code = rb.token.code;
        }

        const canonicalAsset = getCanonicalFromAsset(code, issuer?.key);
        const assetPrice = assetPrices ? assetPrices[canonicalAsset] : null;

        const isSuspicious = isAssetSuspicious(rb.blockaidData);

        const amountVal =
          rb.contractId && "decimals" in rb
            ? formatTokenAmount(rb.total, rb.decimals)
            : rb.total.toFixed();

        const getDeltaColor = (delta: BigNumber) => {
          if (delta.isZero()) {
            return "";
          }

          if (delta.isNegative()) {
            return "negative";
          }
          if (delta.isPositive()) {
            return "positive";
          }

          return "";
        };

        return (
          <div
            data-testid="account-assets-item"
            className={`AccountAssets__asset ${
              setSelectedAsset && !isLP
                ? "AccountAssets__asset--has-detail"
                : ""
            }`}
            key={canonicalAsset}
            onClick={isLP ? () => null : () => handleClick(canonicalAsset)}
          >
            <div className="AccountAssets__copy-left">
              <div className="asset-icon">
                <AssetIcon
                  assetIcons={assetIcons}
                  code={code}
                  issuerKey={issuer?.key}
                  retryAssetIconFetch={retryAssetIconFetch}
                  isLPShare={!!rb.liquidityPoolId}
                  isSuspicious={isSuspicious}
                />
              </div>
              <div className="asset-native-value">
                <span className="asset-code">{code}</span>
                <div className="asset-native-amount" data-testid="asset-amount">
                  {formatAmount(amountVal)}
                </div>
              </div>
            </div>
            {assetPrice ? (
              <div className="AccountAssets__copy-right">
                <AnimatedNumber
                  valueAddlClasses="asset-usd-amount"
                  valueAddlProperties={{
                    "data-testid": `asset-amount-${canonicalAsset}`,
                  }}
                  value={`$${formatAmount(
                    roundUsdValue(
                      new BigNumber(assetPrice.currentPrice)
                        .multipliedBy(rb.total)
                        .toString(),
                    ),
                  )}`}
                />
                {assetPrice.percentagePriceChange24h ? (
                  <AnimatedNumber
                    valueAddlProperties={{
                      "data-testid": `asset-price-delta-${canonicalAsset}`,
                    }}
                    valueAddlClasses={`asset-value-delta ${getDeltaColor(
                      new BigNumber(
                        roundUsdValue(assetPrice.percentagePriceChange24h),
                      ),
                    )}
                    `}
                    value={`${formatAmount(
                      roundUsdValue(assetPrice.percentagePriceChange24h),
                    )}%`}
                  />
                ) : (
                  <div className="asset-value-delta">--</div>
                )}
              </div>
            ) : (
              <div className="asset-value-delta">--</div>
            )}
          </div>
        );
      })}
    </>
  );
};
