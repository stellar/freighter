import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import { isNativeAssetId } from "@shared/helpers/assetIdentity";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { CopyValue } from "popup/components/CopyValue";
import StellarLogo from "popup/assets/stellar-logo.png";
import { displaySorobanId, isSorobanIssuer } from "popup/helpers/account";

import "./styles.scss";

interface AssetNetworkInfoProps {
  assetIssuer: string;
  assetCode: string;
  /** Horizon `asset_type` value (e.g. "native", "credit_alphanum4"), or null. */
  assetType: string | null;
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
  const { t } = useTranslation();
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
    if (networkIconUrl || isNativeAssetId(assetType)) {
      return (
        <img src={networkIconUrl || StellarLogo} alt={t("Network icon")} />
      );
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
          <span>{assetDomain || "XLM"}</span>
        )}
      </>
    </div>
  );
};
