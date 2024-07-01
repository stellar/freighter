import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import { isTestnet } from "helpers/stellar";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

export const useIsSwap = () => {
  const location = useLocation();
  return location.pathname
    ? location.pathname.includes("swap") ||
        location.search.includes("swap=true")
    : false;
};

export const useIsSoroswapEnabled = () => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  return isTestnet(networkDetails);
};
