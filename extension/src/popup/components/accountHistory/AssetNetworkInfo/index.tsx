import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";
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
  const { blockedDomains } = useSelector(transactionSubmissionSelector);
  const [networkIconUrl, setNetworkIconUrl] = useState("");
  const isBlockedDomain = blockedDomains.domains[assetDomain];

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
    if (isBlockedDomain) {
      return <ScamAssetIcon isScamAsset={true} />;
    }
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
