import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { stroopToXlm } from "helpers/stellar";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

export enum NetworkCongestion {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
}

export const useNetworkFees = () => {
  const { networkUrl, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );
  const [recommendedFee, setRecommendedFee] = useState("100");
  const [networkCongestion, setNetworkCongestion] = useState(
    "" as NetworkCongestion,
  );

  useEffect(() => {
    (async () => {
      try {
        const server = stellarSdkServer(networkUrl, networkPassphrase);
        const { max_fee: maxFee, ledger_capacity_usage: ledgerCapacityUsage } =
          await server.feeStats();
        const ledgerCapacityUsageNum = Number(ledgerCapacityUsage);

        setRecommendedFee(stroopToXlm(maxFee.mode).toFixed());
        if (ledgerCapacityUsageNum > 0.5 && ledgerCapacityUsageNum <= 0.75) {
          setNetworkCongestion(NetworkCongestion.MEDIUM);
        } else if (ledgerCapacityUsageNum > 0.75) {
          setNetworkCongestion(NetworkCongestion.HIGH);
        } else {
          setNetworkCongestion(NetworkCongestion.LOW);
        }
      } catch (e) {
        // use default values
        setRecommendedFee("100");
        console.error(e);
      }
    })();
  }, [networkUrl, networkPassphrase]);

  return { recommendedFee, networkCongestion };
};
