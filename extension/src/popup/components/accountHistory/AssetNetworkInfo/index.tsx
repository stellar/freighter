import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";

import StellarLogo from "popup/assets/stellar-logo.png";

import "./styles.scss";

interface AssetNetworkInfoProps {
  assetIssuer: string;
  assetCode: string;
  assetType: string;
  assetDomain: string;
}

export const AssetNetworkInfo = ({
  assetIssuer,
  assetCode,
  assetType,
  assetDomain,
}: AssetNetworkInfoProps) => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [networkIconUrl, setNetworkIconUrl] = useState("");

  useEffect(() => {
    const fetchIconUrl = async () => {
      let iconUrl = "";

      try {
        iconUrl = await getIconUrlFromIssuer({
          key: assetIssuer || "",
          code: assetCode || "",
          networkDetails,
        });
      } catch (e) {
        console.error(e);
      }

      setNetworkIconUrl(iconUrl);
    };

    if (assetIssuer) {
      fetchIconUrl();
    }
  }, [assetCode, assetIssuer, networkDetails]);
  return (
    <div className="AssetNetworkInfo__network">
      <>
        {networkIconUrl || assetType === "native" ? (
          <img src={networkIconUrl || StellarLogo} alt="Network icon" />
        ) : (
          <div className="AssetNetworkInfo__network__icon" />
        )}

        <span>{assetDomain || "Stellar Lumens"}</span>
      </>
    </div>
  );
};
