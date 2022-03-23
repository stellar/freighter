import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { BigNumber } from "bignumber.js";

import { AssetIcons, Balances } from "@shared/api/types";
import { getAssetIcons, retryAssetIcon } from "@shared/api/internal";

import { sortBalances } from "popup/helpers/account";
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
  retryAssetIconFetch: (arg: { key: string; code: string }) => void;
}) =>
  assetIcons[code] || code === "XLM" ? (
    <img
      className="AccountAssets--asset-logo"
      alt={`${code} logo`}
      src={code === "XLM" ? StellarLogo : assetIcons[code] || ""}
      onError={() => {
        retryAssetIconFetch({ key: issuerKey, code });
      }}
    />
  ) : (
    <div className="AccountAssets__asset-bullet" />
  );

export const AccountAssets = ({ balances }: { balances: Balances }) => {
  const [sortedBalances, setSortedBalances] = useState([] as Array<any>);
  const [assetIcons, setAssetIcons] = useState({} as AssetIcons);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [hasIconFetchRetried, setHasIconFetchRetried] = useState(false);

  useEffect(() => {
    if (!balances) return;

    setSortedBalances(sortBalances(balances));

    // get each asset's icon
    const fetchAssetIcons = async () => {
      try {
        const res = await getAssetIcons({ balances, networkDetails });
        setAssetIcons(res);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAssetIcons();
  }, [balances, networkDetails]);

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
        <div className="AccountAssets__asset" key={code}>
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
