import { useState } from "react";
import * as Sentry from "@sentry/browser";

import { INDEXER_URL } from "@shared/constants/mercury";
import { NetworkDetails } from "@shared/constants/stellar";
import { isCustomNetwork } from "@shared/helpers/stellar";
import { isMainnet } from "helpers/stellar";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

interface BlockAidScanSiteResult {
  status: "hit" | "miss";
  url: string;
  scan_start_time: Date;
  scan_end_time: Date;
  malicious_score: number; // 0-1
  is_reachable: boolean;
  is_web3_site: true;
  is_malicious: boolean;
  // ...
}

export interface BlockAidScanTxResult {
  simulation: object;
  validation: {
    result_type: "Benign" | "Warning" | "Malicious";
  };
}

export const useScanSite = () => {
  const [data, setData] = useState({} as BlockAidScanSiteResult);
  const [error, setError] = useState(null as string | null);
  const [isLoading, setLoading] = useState(true);

  const scanSite = async (url: string, networkDetails: NetworkDetails) => {
    setLoading(true);
    try {
      if (isCustomNetwork(networkDetails)) {
        setError("Scanning sites is not supported on custom networks");
        setLoading(false);
        return;
      }
      const res = await fetch(
        `${INDEXER_URL}/scan-dapp?url=${encodeURIComponent(url)}`,
      );
      const response = (await res.json()) as {
        data: BlockAidScanSiteResult;
        error: string | null;
      };

      if (!res.ok) {
        setError(response.error || "Failed to scan site");
      }
      setData(response.data);
      emitMetric(METRIC_NAMES.blockaidDomainScan, { response: response.data });
      setLoading(false);
    } catch (err) {
      setError("Failed to scan site");
      Sentry.captureException(err);
      setLoading(false);
    }
  };

  return {
    data,
    error,
    isLoading,
    scanSite,
  };
};

export const useScanTx = () => {
  const [data, setData] = useState({} as BlockAidScanTxResult);
  const [error, setError] = useState(null as string | null);
  const [isLoading, setLoading] = useState(true);

  const scanTx = async (
    xdr: string,
    url: string,
    networkDetails: NetworkDetails,
  ) => {
    setLoading(true);
    try {
      if (isCustomNetwork(networkDetails)) {
        setError("Scanning transactions is not supported on custom networks");
        setLoading(false);
        return null;
      }
      const res = await fetch(
        `${INDEXER_URL}/scan-tx?url=${encodeURIComponent(
          url,
        )}&tx_xdr=${xdr}&network=${networkDetails.network}`,
      );
      const response = (await res.json()) as {
        data: BlockAidScanTxResult;
        error: string | null;
      };

      if (!res.ok) {
        setError(response.error || "Failed to scan transaction");
        return null;
      }
      setData(response.data);
      emitMetric(METRIC_NAMES.blockaidTxScan, { response: response.data });
      setLoading(false);
      return response.data;
    } catch (err) {
      setError("Failed to scan transaction");
      Sentry.captureException(err);
      setLoading(false);
    }
    return null;
  };

  return {
    data,
    error,
    isLoading,
    scanTx,
  };
};

interface ScanAssetResponseSuccess {
  data: {
    result_type: "Benign" | "Warning" | "Malicious" | "Spam";
  };
  error: null;
}
interface ScanAssetResponseError {
  data: null;
  error: string;
}
type ScanAssetResponse = ScanAssetResponseSuccess | ScanAssetResponseError;

export const scanAsset = async (
  address: string,
  networkDetails: NetworkDetails,
) => {
  try {
    if (!isMainnet(networkDetails)) {
      console.error("Scanning assets is only supported on Mainnet");
      return {};
    }
    const res = await fetch(`${INDEXER_URL}/scan-asset?address=${address}`);
    const response = (await res.json()) as ScanAssetResponse;

    if (!res.ok || response.error) {
      Sentry.captureException(response.error || "Failed to scan asset");
    }

    emitMetric(METRIC_NAMES.blockaidAssetScan, { response: response.data });
    return response.data;
  } catch (err) {
    console.error("Failed to scan asset");
    Sentry.captureException(err);
  }
  return {};
};
