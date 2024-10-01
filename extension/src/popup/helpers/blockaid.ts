import { useEffect, useState } from "react";
import * as Sentry from "@sentry/browser";
import { useSelector } from "react-redux";

import { INDEXER_URL } from "@shared/constants/mercury";
import { NetworkDetails } from "@shared/constants/stellar";
import { isCustomNetwork } from "@shared/helpers/stellar";
import {
  BlockAidScanAssetResult,
  BlockAidScanSiteResult,
  BlockAidScanTxResult,
  BlockAidBulkScanAssetResult,
} from "@shared/api/types";
import { isMainnet } from "helpers/stellar";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { fetchJson } from "./fetch";

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

interface ScanAssetBulkResponseSuccess {
  data: BlockAidBulkScanAssetResult;
  error: null;
}
interface ScanAssetBulkResponseError {
  data: null;
  error: string;
}
type ScanAssetBulkResponse =
  | ScanAssetBulkResponseSuccess
  | ScanAssetBulkResponseError;

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

export const isTxSuspicious = (blockaidData: BlockAidScanTxResult) => {
  const { simulation, validation } = blockaidData;

  if (!blockaidData) {
    return false;
  }

  if (simulation && "error" in simulation) {
    return true;
  }

  if (
    validation &&
    "result_type" in validation &&
    validation.result_type !== "Benign"
  ) {
    return true;
  }

  return false;
};

export const isBlockaidWarning = (resultType: string) =>
  resultType === "Warning" || resultType === "Spam";

export const scanAssetBulk = async (
  addressList: string[],
  networkDetails: NetworkDetails,
) => {
  try {
    if (!isMainnet(networkDetails)) {
      /* Scanning assets is only supported on Mainnet */
      return {} as BlockAidBulkScanAssetResult;
    }
    const url = new URL(`${INDEXER_URL}/scan-asset-bulk`);
    addressList.forEach((address) => {
      url.searchParams.append("asset_ids", address);
    });
    const response = await fetch(url.href);
    const resJson = (await response.json()) as ScanAssetBulkResponse;

    if (!response.ok || resJson.error) {
      Sentry.captureException(resJson.error || "Failed to bulk scan assets");
    }

    emitMetric(METRIC_NAMES.blockaidAssetScan, { response: resJson });
    if (!resJson.data) {
      return {} as BlockAidBulkScanAssetResult;
    }
    return resJson.data || {};
  } catch (err) {
    console.error("Failed to bulk scan asset");
    Sentry.captureException(err);
  }
  return {} as BlockAidBulkScanAssetResult;
};
