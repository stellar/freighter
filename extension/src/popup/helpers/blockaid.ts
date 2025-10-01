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

export const ATTACK_TO_DISPLAY = {
  signature_farming:
    "A malicious RPC attempted to issue a raw transaction signature from the user.",
  transfer_farming:
    "A malicious transaction causes a transfer, draining the user’s assets and tokens.",
  transfer_from_farming:
    "A malicious transaction causes a transferFrom, draining the user’s assets and tokens.",
  raw_ether_transfer:
    "A transaction draining the user’s native currency to a malicious address.",
  seed_farming: "A request for the user to enter the seed phrase.",
  malicious_network_interaction:
    "A malicious network interaction with a known Command and Control (CNC) server owned by an attacking group.",
  malicious_sdk: "A known piece of malicious code is embedded within the site.",
  investment_scam:
    "A request for the user to deposit money into a scam investment system.",
  other: "A malicious behavior was detected by the Blockaid network.",
};

export const useScanSite = () => {
  const [data, setData] = useState({} as BlockAidScanSiteResult);
  const [error, setError] = useState(null as string | null);
  const [isLoading, setLoading] = useState(true);

  const scanSite = async (url: string) => {
    setLoading(true);
    try {
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
      emitMetric(METRIC_NAMES.blockaidDomainScan);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError("Failed to scan site");
      Sentry.captureException(err);
      setLoading(false);
      return null;
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
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: encodeURIComponent(url),
          tx_xdr: xdr,
          network: networkDetails.network,
        }),
      };

      const response = await fetchJson<{
        data: BlockAidScanTxResult;
        error: string | null;
      }>(`${INDEXER_URL}/scan-tx`, options);

      setData(response.data);
      emitMetric(METRIC_NAMES.blockaidTxScan);
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
    setLoading,
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

type ReportAssetWarningResponse = { data: number; error: string };

type ReportTransactionWarningResponse = { data: number; error: string };

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

    emitMetric(METRIC_NAMES.blockaidAssetScan);
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

    emitMetric(METRIC_NAMES.blockaidAssetScan);
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

interface ReportAssetWarningParams {
  address: string;
  details: string;
  networkDetails: NetworkDetails;
}

export const reportAssetWarning = async ({
  address,
  details,
  networkDetails,
}: ReportAssetWarningParams) => {
  try {
    if (!isMainnet(networkDetails)) {
      /* Reporting assets is only supported on Mainnet */
      return {} as ReportAssetWarningResponse;
    }
    const res = await fetchJson<ReportAssetWarningResponse>(
      `${INDEXER_URL}/report-asset-warning?address=${address}&details=${encodeURIComponent(
        details,
      )}`,
    );

    if (res.error) {
      Sentry.captureException(res.error || "Failed to report asset warning");
    }

    emitMetric(METRIC_NAMES.blockaidAssetScan);
    if (!res.data) {
      return {} as ReportAssetWarningResponse;
    }
    return res.data;
  } catch (err) {
    console.error("Failed to report asset warning");
    Sentry.captureException(err);
  }
  return {} as ReportAssetWarningResponse;
};

interface ReportTransactionWarningParams {
  details: string;
  requestId: string;
  event: string;
}

export const reportTransactionWarning = async ({
  details,
  requestId,
  event,
}: ReportTransactionWarningParams) => {
  try {
    const res = await fetchJson<ReportTransactionWarningResponse>(
      `${INDEXER_URL}/report-transaction-warning?details=${encodeURIComponent(
        details,
      )}&request_id=${requestId}&event=${event}`,
    );

    if (res.error) {
      Sentry.captureException(
        res.error || "Failed to report transaction warning",
      );
    }

    emitMetric(METRIC_NAMES.blockaidAssetScan);
    if (!res.data) {
      return {} as ReportTransactionWarningResponse;
    }
    return res.data;
  } catch (err) {
    console.error("Failed to report transaction warning");
    Sentry.captureException(err);
  }
  return {} as ReportTransactionWarningResponse;
};
