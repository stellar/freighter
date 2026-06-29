import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BASE_FEE } from "stellar-sdk";
import { TFunction } from "i18next";

import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { stroopToXlm } from "helpers/stellar";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

export enum NetworkCongestion {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
}

/**
 * Translation map for network congestion levels
 * This ensures translations are preserved and not deleted during build
 */
export const getNetworkCongestionTranslation = (
  t: TFunction,
  congestion: NetworkCongestion,
): string => {
  const congestionMap: Record<NetworkCongestion, string> = {
    [NetworkCongestion.LOW]: t("Low"),
    [NetworkCongestion.MEDIUM]: t("Medium"),
    [NetworkCongestion.HIGH]: t("High"),
  };
  return congestionMap[congestion] || congestion;
};

export const useNetworkFees = () => {
  const { networkUrl, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );
  // recommendedFee is always expressed in XLM (the fetched value below is
  // converted from stroops). Seed it with the base fee in XLM (0.00001) rather
  // than the raw stroop BASE_FEE, so the fee label and XLM available-balance
  // show a sane value on first render instead of "100 XLM".
  const [recommendedFee, setRecommendedFee] = useState(
    stroopToXlm(BASE_FEE).toFixed(),
  );
  const [networkCongestion, setNetworkCongestion] = useState(
    "" as NetworkCongestion,
  );
  // True until the first feeStats request settles. Callers can gate their
  // first paint on this so the fee label and the fee-derived XLM available
  // balance render their final values once, instead of flashing the seeded
  // base-fee placeholder and jumping (§ batch4 task 8). Stays false after the
  // first settle — a manual fetchData refresh never re-gates.
  const [isLoading, setIsLoading] = useState(true);

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
      setRecommendedFee(stroopToXlm(BASE_FEE).toFixed());
      return { recommendedFee };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkUrl, networkPassphrase]);

  return { recommendedFee, networkCongestion, fetchData, isLoading };
};
