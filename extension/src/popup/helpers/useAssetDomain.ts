import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
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
      const { networkUrl, networkPassphrase } = networkDetails;
      const server = stellarSdkServer(networkUrl, networkPassphrase);

      let assetDomain = "";

      try {
        const account = await server.loadAccount(assetIssuer);
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
