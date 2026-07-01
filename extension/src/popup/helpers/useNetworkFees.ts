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

// In-session cache of the last resolved fee per network (keyed by Horizon URL).
// feeStats() has no timeout, so callers must NOT block their UI on it — a slow
// /fee_stats can hang the screen behind a fullscreen spinner. Caching lets a
// re-entered screen seed the real fee immediately, avoiding a fee/balance flash,
// without ever gating render on the request.
const feeCacheByNetwork = new Map<
  string,
  { recommendedFee: string; networkCongestion: NetworkCongestion }
>();

/** Test-only: clear the module-scoped fee cache between tests. */
export const resetFeeCacheForTests = () => feeCacheByNetwork.clear();

export const useNetworkFees = () => {
  const { networkUrl, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );
  const cachedFee = feeCacheByNetwork.get(networkUrl);
  // recommendedFee is always expressed in XLM (the fetched value below is
  // converted from stroops). Seed from the in-session cache when available,
  // else the base fee in XLM (0.00001) rather than the raw stroop BASE_FEE, so
  // the fee label and XLM available-balance show a sane value on first render
  // instead of "100 XLM".
  const [recommendedFee, setRecommendedFee] = useState(
    cachedFee?.recommendedFee ?? stroopToXlm(BASE_FEE).toFixed(),
  );
  const [networkCongestion, setNetworkCongestion] = useState(
    cachedFee?.networkCongestion ?? ("" as NetworkCongestion),
  );
  // True until the first feeStats request settles for this network. Starts
  // false when the fee is already cached this session. Callers may surface a
  // hint on the fee field itself, but must NOT gate the whole screen on it —
  // feeStats has no timeout and can hang indefinitely.
  const [isLoading, setIsLoading] = useState(!cachedFee);

  const fetchData = async () => {
    try {
      const server = stellarSdkServer(networkUrl, networkPassphrase);
      const { max_fee: maxFee, ledger_capacity_usage: ledgerCapacityUsage } =
        await server.feeStats();
      const ledgerCapacityUsageNum = Number(ledgerCapacityUsage);

      const fee = stroopToXlm(maxFee.mode).toFixed();
      let congestion: NetworkCongestion;
      if (ledgerCapacityUsageNum > 0.5 && ledgerCapacityUsageNum <= 0.75) {
        congestion = NetworkCongestion.MEDIUM;
      } else if (ledgerCapacityUsageNum > 0.75) {
        congestion = NetworkCongestion.HIGH;
      } else {
        congestion = NetworkCongestion.LOW;
      }
      setRecommendedFee(fee);
      setNetworkCongestion(congestion);
      feeCacheByNetwork.set(networkUrl, {
        recommendedFee: fee,
        networkCongestion: congestion,
      });
      return { recommendedFee: fee, networkCongestion: congestion };
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
