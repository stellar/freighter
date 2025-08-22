import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BASE_FEE } from "stellar-sdk";

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
  const [recommendedFee, setRecommendedFee] = useState(BASE_FEE);
  const [networkCongestion, setNetworkCongestion] = useState(
    "" as NetworkCongestion,
  );

  const fetchData = async () => {
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
      return { recommendedFee, networkCongestion };
    } catch (e) {
      setRecommendedFee(BASE_FEE);
      return { recommendedFee };
    }
  };

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkUrl, networkPassphrase]);

  return { recommendedFee, networkCongestion, fetchData };
};
