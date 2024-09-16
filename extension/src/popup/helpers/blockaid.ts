import { useEffect, useState } from "react";
import * as Sentry from "@sentry/browser";
import { useSelector } from "react-redux";

import { INDEXER_URL } from "@shared/constants/mercury";
import { NetworkDetails } from "@shared/constants/stellar";
import { isCustomNetwork } from "@shared/helpers/stellar";
import {
  BlockAidScanAssetResult,
  BlockAidScanSiteResult,
} from "@shared/api/types";
import { isMainnet } from "helpers/stellar";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { fetchJson } from "./fetch";

interface ValidationResult {
  status: "Success" | "Error";
  result_type: "Benign" | "Warning" | "Malicious";
  description: string;
}
interface ValidationError {
  status: "Success" | "Error";
  error: string;
}
type Validation = ValidationResult | ValidationError;

interface SimulationResult {
  status: "Success" | "Error";
}
interface SimulationError {
  status: "Success" | "Error";
  error: string;
}
type Simulation = SimulationResult | SimulationError;

export interface BlockAidScanTxResult {
  simulation: Simulation;
  validation: Validation;
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
  const [data, setData] = useState(null as BlockAidScanTxResult | null);
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
      const response = await fetchJson<{
        data: BlockAidScanTxResult;
        error: string | null;
      }>(
        `${INDEXER_URL}/scan-tx?url=${encodeURIComponent(
          url,
        )}&tx_xdr=${encodeURIComponent(xdr)}&network=${networkDetails.network}`,
      );

      setData(response.data);
      emitMetric(METRIC_NAMES.blockaidTxScan, { response: response.data });
      setLoading(false);
      return response.data;
    } catch (err) {
      setError("Failed to scan transaction");
      Sentry.captureException({
        error: err,
        xdr,
        url,
        networkDetails,
      });
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
  data: BlockAidScanAssetResult;
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
      /* Scanning assets is only supported on Mainnet */
      return {} as BlockAidScanAssetResult;
    }
    const res = await fetch(`${INDEXER_URL}/scan-asset?address=${address}`);
    const response = (await res.json()) as ScanAssetResponse;

    if (!res.ok || response.error) {
      Sentry.captureException(response.error || "Failed to scan asset");
    }

    emitMetric(METRIC_NAMES.blockaidAssetScan, { response: response.data });
    if (!response.data) {
      return {} as BlockAidScanAssetResult;
    }
    return response.data;
  } catch (err) {
    console.error("Failed to scan asset");
    Sentry.captureException(err);
  }
  return {} as BlockAidScanAssetResult;
};

export const useScanAsset = (address: string) => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [scannedAssetStatus, setScannedAssetStatus] = useState(
    {} as BlockAidScanAssetResult,
  );

  useEffect(() => {
    const fetchScanAssetStatus = async () => {
      const scannedAsset = await scanAsset(address, networkDetails);
      setScannedAssetStatus(scannedAsset);
    };

    if (address) {
      fetchScanAssetStatus();
    }
  }, [networkDetails, address]);

  return {
    scannedAsset: scannedAssetStatus,
  };
};

export const isAssetSuspicious = (blockaidData?: BlockAidScanAssetResult) => {
  if (!blockaidData || !blockaidData.result_type) {
    return false;
  }
  return blockaidData.result_type !== "Benign";
};
