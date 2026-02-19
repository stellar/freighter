import { useCallback, useEffect, useState } from "react";
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
import { getBlockaidOverrideState } from "@shared/api/internal";
import { isDev } from "@shared/helpers/dev";
import { SecurityLevel } from "popup/constants/blockaid";
import { fetchJson } from "./fetch";
import { Action } from "constants/request";

export const ATTACK_TO_DISPLAY = {
  signature_farming:
    "A malicious RPC attempted to issue a raw transaction signature from the user.",
  transfer_farming:
    "A malicious transaction causes a transfer, draining the user's assets and tokens.",
  transfer_from_farming:
    "A malicious transaction causes a transferFrom, draining the user's assets and tokens.",
  raw_ether_transfer:
    "A transaction draining the user's native currency to a malicious address.",
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
        setLoading(false);
        return null;
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

      // If there's an error or no data, treat as unable to scan
      if (response.error || !response.data) {
        emitMetric(METRIC_NAMES.blockaidTxScanFailed);
        setLoading(false);
        return null;
      }

      setData(response.data);
      emitMetric(METRIC_NAMES.blockaidTxScan);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError("Failed to scan transaction");
      Sentry.captureException(
        err instanceof Error ? err : new Error("Failed to scan transaction"),
      );
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
  signal?: AbortSignal,
): Promise<BlockAidScanAssetResult | null> => {
  try {
    // Allow scanning in test environment (Playwright) even on testnet for e2e testing
    const isTestEnv =
      typeof window !== "undefined" && (window as any).IS_PLAYWRIGHT === "true";
    if (!isMainnet(networkDetails) && !isTestEnv) {
      /* Scanning assets is only supported on Mainnet */
      return null;
    }
    const res = await fetch(
      `${INDEXER_URL}/scan-asset?address=${encodeURIComponent(address)}`,
      {
        signal,
      },
    );
    const response = (await res.json()) as ScanAssetResponse;

    if (!res.ok || response.error) {
      Sentry.captureException(response.error || "Failed to scan asset");
      emitMetric(METRIC_NAMES.blockaidAssetScanFailed);
      // Return null to indicate unable to scan
      return null;
    }

    emitMetric(METRIC_NAMES.blockaidAssetScan);
    if (!response.data) {
      // Return null to indicate unable to scan
      return null;
    }
    return response.data;
  } catch (err) {
    console.error("Failed to scan asset");
    Sentry.captureException(err);
  }
  // Return null to indicate unable to scan
  return null;
};

export const useScanAsset = (address: string) => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [scannedAssetStatus, setScannedAssetStatus] =
    useState<BlockAidScanAssetResult | null>(null);

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

/**
 * Fetches the blockaid override state once on mount.
 * Use this directly in components that need multiple override-aware checks
 * to avoid redundant `getBlockaidOverrideState()` calls per hook.
 */
export const useBlockaidOverrideState = () => {
  const [blockaidOverrideState, setBlockaidOverrideState] = useState<
    string | null
  >(null);

  useEffect(() => {
    getBlockaidOverrideState()
      .then(setBlockaidOverrideState)
      .catch(() => setBlockaidOverrideState(null));
  }, []);

  return blockaidOverrideState;
};

/**
 * Hook that returns isAssetSuspicious with blockaid override state automatically applied
 * In production, blockaid override state is ignored
 */
export const useIsAssetSuspicious = () => {
  const blockaidOverrideState = useBlockaidOverrideState();
  return (blockaidData?: BlockAidScanAssetResult | null) =>
    isAssetSuspicious(blockaidData, blockaidOverrideState);
};

export const isAssetMalicious = (
  blockaidData?: BlockAidScanAssetResult | null,
  blockaidOverrideState?: string | null,
): boolean => {
  if (isDev && blockaidOverrideState === SecurityLevel.MALICIOUS) {
    return true;
  }
  if (!blockaidData?.result_type) {
    return false;
  }
  return blockaidData.result_type === "Malicious";
};

/**
 * Hook that returns isAssetMalicious with blockaid override state automatically applied
 * In production, blockaid override state is ignored
 */
export const useIsAssetMalicious = () => {
  const blockaidOverrideState = useBlockaidOverrideState();
  return (blockaidData?: BlockAidScanAssetResult | null) =>
    isAssetMalicious(blockaidData, blockaidOverrideState);
};

/**
 * Hook that returns isTxSuspicious with blockaid override state automatically applied
 * In production, blockaid override state is ignored
 */
export const useIsTxSuspicious = () => {
  const blockaidOverrideState = useBlockaidOverrideState();
  return (blockaidData?: BlockAidScanTxResult | null) =>
    isTxSuspicious(blockaidData, blockaidOverrideState);
};

/**
 * Hook that returns shouldTreatAssetAsUnableToScan with blockaid override state automatically applied
 * In production, blockaid override state is ignored
 */
export const useShouldTreatAssetAsUnableToScan = () => {
  const blockaidOverrideState = useBlockaidOverrideState();
  return (blockaidData?: BlockAidScanAssetResult | null) =>
    shouldTreatAssetAsUnableToScan(blockaidData, blockaidOverrideState);
};

/**
 * Hook that returns shouldTreatTxAsUnableToScan with blockaid override state automatically applied
 * In production, blockaid override state is ignored
 */
export const useShouldTreatTxAsUnableToScan = () => {
  const blockaidOverrideState = useBlockaidOverrideState();
  return (blockaidData?: BlockAidScanTxResult | null) =>
    shouldTreatTxAsUnableToScan(blockaidData, blockaidOverrideState);
};

/**
 * Checks if an asset scan result indicates the scan was unable to complete
 * Returns true if blockaidData is null/undefined or empty object without result_type
 */
export const isAssetUnableToScan = (
  blockaidData?: BlockAidScanAssetResult | null,
): boolean => {
  return !blockaidData || !blockaidData.result_type;
};

/**
 * Checks if a transaction scan result indicates the scan was unable to complete
 * Returns true if blockaidData is null/undefined
 */
export const isTxUnableToScan = (
  blockaidData?: BlockAidScanTxResult | null,
): boolean => {
  return !blockaidData;
};

/**
 * Checks if we're in development mode
 */

/**
 * Determines if a security level should be considered suspicious based on blockaid override state
 * @param blockaidOverrideState - The blockaid override state security level
 * @returns true if suspicious, false if not suspicious, null if no override or not in dev mode
 */
const getSuspiciousFromBlockaidOverrideState = (
  blockaidOverrideState?: string | null,
): boolean | null => {
  if (!isDev) {
    return null;
  }
  if (!blockaidOverrideState) {
    return null;
  }

  if (blockaidOverrideState === SecurityLevel.UNABLE_TO_SCAN) {
    return false; // Unable to scan is not suspicious
  }
  if (blockaidOverrideState === SecurityLevel.SAFE) {
    return false;
  }
  // SUSPICIOUS or MALICIOUS - both are suspicious
  if (
    blockaidOverrideState === SecurityLevel.SUSPICIOUS ||
    blockaidOverrideState === SecurityLevel.MALICIOUS
  ) {
    return true;
  }

  return null;
};

/**
 * Checks if asset should be treated as unable to scan based on blockaid override state
 */
export const shouldTreatAssetAsUnableToScan = (
  blockaidData?: BlockAidScanAssetResult | null,
  blockaidOverrideState?: string | null,
): boolean => {
  if (isDev && blockaidOverrideState === SecurityLevel.UNABLE_TO_SCAN) {
    return true;
  }
  return isAssetUnableToScan(blockaidData);
};

/**
 * Checks if transaction should be treated as unable to scan based on blockaid override state
 */
export const shouldTreatTxAsUnableToScan = (
  blockaidData?: BlockAidScanTxResult | null,
  blockaidOverrideState?: string | null,
): boolean => {
  if (isDev && blockaidOverrideState === SecurityLevel.UNABLE_TO_SCAN) {
    return true;
  }
  return isTxUnableToScan(blockaidData);
};

export const isAssetSuspicious = (
  blockaidData?: BlockAidScanAssetResult | null,
  blockaidOverrideState?: string | null,
) => {
  const overrideResult = getSuspiciousFromBlockaidOverrideState(
    blockaidOverrideState,
  );
  if (overrideResult !== null) {
    return overrideResult;
  }

  // If unable to scan, treat as benign (not suspicious)
  if (isAssetUnableToScan(blockaidData)) {
    return false;
  }
  return blockaidData!.result_type !== "Benign";
};

export const isTxSuspicious = (
  blockaidData?: BlockAidScanTxResult | null,
  blockaidOverrideState?: string | null,
) => {
  const overrideResult = getSuspiciousFromBlockaidOverrideState(
    blockaidOverrideState,
  );
  if (overrideResult !== null) {
    return overrideResult;
  }

  // If unable to scan, treat as benign (not suspicious)
  if (isTxUnableToScan(blockaidData)) {
    return false;
  }

  if (!blockaidData) {
    return false;
  }

  const { simulation, validation } = blockaidData;

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

/**
 * Determines site security states from scan data and override state
 * @param scanData - The site scan result from Blockaid
 * @param blockaidOverrideState - Override state for dev mode (takes precedence)
 * @returns Object with isMalicious, isSuspicious, and isUnableToScan flags
 */
export const getSiteSecurityStates = (
  scanData: BlockAidScanSiteResult | null | undefined,
  blockaidOverrideState: string | null | undefined,
): {
  isMalicious: boolean;
  isSuspicious: boolean;
  isUnableToScan: boolean;
} => {
  if (isDev && blockaidOverrideState) {
    // Override state takes precedence (dev mode only)
    return {
      isMalicious: blockaidOverrideState === SecurityLevel.MALICIOUS,
      isSuspicious: blockaidOverrideState === SecurityLevel.SUSPICIOUS,
      isUnableToScan: blockaidOverrideState === SecurityLevel.UNABLE_TO_SCAN,
    };
  }

  // Use actual scan results
  return {
    isUnableToScan: !scanData || scanData.status === undefined,
    isMalicious: scanData?.status === "hit" && scanData.is_malicious === true,
    // Blockaid does not produce a "suspicious" verdict for site scans, so this
    // is always false for real results. The dev override intentionally allows
    // setting isSuspicious: true so the UI path for a suspicious site can be
    // exercised during development without needing a real suspicious scan result.
    isSuspicious: false,
  };
};

/**
 * Hook that handles asynchronous site scanning and updates state via dispatch
 * This prevents blocking the UI while scanning sites
 *
 * @param domain - The domain/URL to scan (optional)
 * @param dispatch - The dispatch function to update state
 * @param updatePayload - Function that merges scan data into the existing payload
 *
 * @example
 * ```tsx
 * const { scanSite } = useAsyncSiteScan(
 *   domain,
 *   dispatch,
 *   (payload, scanData) => ({ ...payload, scanData })
 * );
 *
 * // Call scanSite after initial payload is dispatched
 * scanSite(initialPayload);
 * ```
 */
export const useAsyncSiteScan = <T>(
  domain: string | undefined,
  dispatch: (action: Action<T, unknown>) => void,
  updatePayload: (payload: T, scanData: BlockAidScanSiteResult | null) => T,
) => {
  const { scanSite: scanSiteFn } = useScanSite();

  const scanSite = useCallback(
    async (currentPayload: T) => {
      if (!domain) {
        return;
      }

      // Scan asynchronously without blocking
      scanSiteFn(domain)
        .then((scanResult) => {
          const updatedPayload = updatePayload(currentPayload, scanResult);
          dispatch({ type: "FETCH_DATA_SUCCESS", payload: updatedPayload });
        })
        .catch((error) => {
          console.error("Failed to scan site:", error);
          Sentry.captureException(`Failed to call scan site: ${error}`);
          const updatedPayload = updatePayload(currentPayload, null);
          dispatch({ type: "FETCH_DATA_SUCCESS", payload: updatedPayload });
        });
    },
    [domain, dispatch, updatePayload, scanSiteFn],
  );

  return { scanSite };
};

/**
 * @deprecated Use useAsyncSiteScan hook instead
 * Fetches site scan data asynchronously and updates the payload via dispatch
 * This helper prevents blocking the UI while scanning sites
 * @param scanSiteFn - The scanSite function to call
 * @param url - The URL/domain to scan
 * @param initialPayload - The initial payload to update
 * @param dispatch - The dispatch function to update state
 * @param updatePayload - Optional function to customize how the payload is updated with scan data (defaults to setting scanData field)
 */
export const fetchSiteScanData = async <T>(
  scanSiteFn: (url: string) => Promise<BlockAidScanSiteResult | null>,
  url: string | undefined,
  initialPayload: T,
  dispatch: (action: Action<T, unknown>) => void,
  updatePayload?: (payload: T, scanData: BlockAidScanSiteResult | null) => T,
): Promise<void> => {
  if (!url) {
    return;
  }

  try {
    const scanResult = await scanSiteFn(url);
    const updatedPayload = updatePayload
      ? updatePayload(initialPayload, scanResult)
      : ({ ...initialPayload, scanData: scanResult } as T);
    dispatch({ type: "FETCH_DATA_SUCCESS", payload: updatedPayload });
  } catch (error) {
    console.error("Failed to scan site:", error);
    Sentry.captureException(`Failed to call scan site: ${error}`);
    const updatedPayload = updatePayload
      ? updatePayload(initialPayload, null)
      : ({ ...initialPayload, scanData: null } as T);
    dispatch({ type: "FETCH_DATA_SUCCESS", payload: updatedPayload });
  }
};

export const scanAssetBulk = async (
  addressList: string[],
  networkDetails: NetworkDetails,
  signal?: AbortSignal,
): Promise<BlockAidBulkScanAssetResult | null> => {
  try {
    if (!isMainnet(networkDetails)) {
      /* Scanning assets is only supported on Mainnet */
      return null;
    }
    const url = new URL(`${INDEXER_URL}/scan-asset-bulk`);
    addressList.forEach((address) => {
      url.searchParams.append("asset_ids", address);
    });
    const response = await fetch(url.href, { signal });
    const resJson = (await response.json()) as ScanAssetBulkResponse;

    if (!response.ok || resJson.error) {
      Sentry.captureException(resJson.error || "Failed to bulk scan assets");
    }

    emitMetric(METRIC_NAMES.blockaidAssetScan);
    if (!resJson.data) {
      return null;
    }
    return resJson.data;
  } catch (err) {
    console.error("Failed to bulk scan asset");
    Sentry.captureException(err);
  }
  return null;
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
      `${INDEXER_URL}/report-asset-warning?address=${encodeURIComponent(address)}&details=${encodeURIComponent(
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
      )}&request_id=${encodeURIComponent(requestId)}&event=${encodeURIComponent(event)}`,
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
