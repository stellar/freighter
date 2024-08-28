import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { CopyValue } from "popup/components/CopyValue";
import StellarLogo from "popup/assets/stellar-logo.png";
import { displaySorobanId, isSorobanIssuer } from "popup/helpers/account";

import "./styles.scss";

interface AssetNetworkInfoProps {
  assetIssuer: string;
  assetCode: string;
  assetType: string;
  assetDomain: string;
  contractId?: string;
}

export const AssetNetworkInfo = ({
  assetIssuer,
  assetCode,
  assetType,
  assetDomain,
  contractId,
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

    if (assetIssuer && !isSorobanIssuer(assetIssuer)) {
      fetchIconUrl();
    }
  }, [assetCode, assetIssuer, networkDetails]);

  const decideNetworkIcon = () => {
    if (networkIconUrl || assetType === "native") {
      return <img src={networkIconUrl || StellarLogo} alt="Network icon" />;
    }
    if (!assetDomain) {
      return null;
    }

    return <div className="AssetNetworkInfo__network__icon" />;
  };

  return (
    <div className="AssetNetworkInfo__network">
      <>
        {decideNetworkIcon()}
        {contractId ? (
          <CopyValue
            value={contractId}
            displayValue={displaySorobanId(contractId, 28)}
          />
        ) : (
          <span>{assetDomain || "Stellar Lumens"}</span>
        )}
      </>
    </div>
  );
};
