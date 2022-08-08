import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import StellarSdk from "stellar-sdk";

import { stroopToXlm } from "helpers/stellar";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

enum NetworkCongestion {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
}

export const useNetworkFees = () => {
  const { networkUrl } = useSelector(settingsNetworkDetailsSelector);
  const [recommendedFee, setRecommendedFee] = useState("");
  const [networkCongestion, setNetworkCongestion] = useState(
    "" as NetworkCongestion,
  );

  useEffect(() => {
    (async () => {
      try {
        const server = new StellarSdk.Server(networkUrl);
        const {
          max_fee: maxFee,
          ledger_capacity_usage: ledgerCapacityUsage,
        } = await server.feeStats();
        setRecommendedFee(stroopToXlm(maxFee.mode).toFixed());
        if (ledgerCapacityUsage > 0.5 && ledgerCapacityUsage <= 0.75) {
          setNetworkCongestion(NetworkCongestion.MEDIUM);
        } else if (ledgerCapacityUsage > 0.75) {
          setNetworkCongestion(NetworkCongestion.HIGH);
        } else {
          setNetworkCongestion(NetworkCongestion.LOW);
        }
      } catch (e) {
        // use default values
        console.error(e);
      }
    })();
  }, [networkUrl]);

  return { recommendedFee, networkCongestion };
};
