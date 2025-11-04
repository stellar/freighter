import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { getAssetDomains } from "@shared/api/internal";
import { isSorobanIssuer } from "./account";

interface UseAssetDomain {
  assetIssuer?: string;
  error?: string;
}

export const useAssetDomain = ({ assetIssuer = "" }: UseAssetDomain) => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [networkDomain, setNetworkDomain] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAssetDomain = async () => {
      let assetDomain = "";

      try {
        const account = await getAssetDomains({
          domainsToFetch: [assetIssuer],
          networkDetails,
        });

        assetDomain = account.home_domain || "";
      } catch (e) {
        console.error(e);
        setError(e as string);
      }
      setNetworkDomain(assetDomain || " ");
    };

    if (assetIssuer && !isSorobanIssuer(assetIssuer)) {
      fetchAssetDomain();
    }
  }, [assetIssuer, networkDetails]);

  return {
    assetDomain: networkDomain,
    error,
  };
};
