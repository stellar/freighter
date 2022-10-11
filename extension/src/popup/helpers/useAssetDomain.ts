import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

interface UseAssetDomain {
  assetIssuer?: string;
}

export const useAssetDomain = ({ assetIssuer }: UseAssetDomain) => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [networkDomain, setNetworkDomain] = useState("");

  useEffect(() => {
    const fetchAssetDomain = async () => {
      const { networkUrl } = networkDetails;
      const server = stellarSdkServer(networkUrl);

      let assetDomain = "";

      try {
        ({ home_domain: assetDomain } = await server.loadAccount(assetIssuer));
      } catch (e) {
        console.error(e);
      }
      setNetworkDomain(assetDomain || " ");
    };

    if (assetIssuer) {
      fetchAssetDomain();
    }
  }, [assetIssuer, networkDetails]);

  return {
    assetDomain: networkDomain,
  };
};
