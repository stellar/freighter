import { useCallback, useEffect, useState } from "react";
import * as Sentry from "@sentry/browser";
import { useSelector } from "react-redux";

import { INDEXER_URL } from "@shared/constants/mercury";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  BlockAidScanAssetResult,
  BlockAidScanSiteResult,
  BlockAidScanTxResult,
  BlockAidBulkScanAssetResult,
} from "@shared/api/types";
import { isMainnet } from "helpers/stellar";
import { emitMetric } from "helpers/metrics";
import { scrubStrKeys } from "helpers/stellarStrKey";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import {
  settingsNetworkDetailsSelector,
  overriddenBlockaidResponseSelector,
} from "popup/ducks/settings";
import { isDev } from "@shared/helpers/dev";
import { BlockaidWarning, SecurityLevel } from "popup/constants/blockaid";
import { fetchJson } from "./fetch";
import { captureFetchError } from "./captureFetchError";
import { Action } from "constants/request";

const isPlaywrightTestEnv = () =>
  typeof window !== "undefined" &&
  (window as unknown as { IS_PLAYWRIGHT?: string }).IS_PLAYWRIGHT === "true";

/**
 * Single source of truth for whether Blockaid scanning is applicable on
 * the active network. Blockaid only meaningfully supports Stellar mainnet,
 * so we suppress all client-side scanning, reporting, and "unable to scan"
 * UI on every other network. The IS_PLAYWRIGHT carve-out lets e2e tests
 * exercise the scan code paths against testnet fixtures.
 */
export const isBlockaidEnabled = (networkDetails: NetworkDetails) =>
  isMainnet(networkDetails) || isPlaywrightTestEnv();

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

/**
 * Map a raw Blockaid `result_type` to the shared cross-platform `result`
 * vocabulary (`safe | warn | block | unknown`) so blockaid.scan_completed.result
 * aligns with mobile's SecurityLevel mapping. `Spam` maps to `warn`.
 */
export const toBlockaidResultLevel = (
  raw?: string,
): "safe" | "warn" | "block" | "unknown" => {
  switch (raw) {
    case "Benign":
      return "safe";
    case "Warning":
    case "Spam":
      return "warn";
    case "Malicious":
      return "block";
    default:
      return "unknown";
  }
};

export const useScanSite = () => {
  const [data, setData] = useState({} as BlockAidScanSiteResult);
  const [error, setError] = useState(null as string | null);
  const [isLoading, setLoading] = useState(true);

  const scanSite = async (url: string, networkDetails: NetworkDetails) => {
    setLoading(true);
    try {
      if (!isBlockaidEnabled(networkDetails)) {
        // Blockaid only supports mainnet; treat off-mainnet as a no-op.
        setLoading(false);
        return null;
      }
      const response = await fetchJson<{
        data: BlockAidScanSiteResult;
        error: string | null;
      }>(`${INDEXER_URL}/scan-dapp?url=${encodeURIComponent(url)}`);

      setData(response.data);
      // Mirrors mobile's assessSiteSecurity: no data => unknown; status "miss"
      // (domain not in Blockaid's DB) => warn; hit + is_malicious => block;
      // hit + clean => safe. Extension previously only emitted block/safe.
      emitMetric(METRIC_NAMES.blockaidScanCompleted, {
        scan_target: "domain",
        result: !response.data
          ? "unknown"
          : response.data.status === "miss"
            ? "warn"
            : response.data.is_malicious
              ? "block"
              : "safe",
      });
      setLoading(false);
      return response.data;
    } catch (err) {
      setError("Failed to scan site");
      captureFetchError(err);
      // Mirror mobile's domain-scan failure emit (scanSite catch →
      // trackScanFailed("domain", …)) so blockaid.scan_failed has
      // cross-platform coverage for scan_target="domain". Skip aborts (expected
      // on cancel), matching scanAsset's guard.
      if (!(err instanceof Error && err.name === "AbortError")) {
        emitMetric(METRIC_NAMES.blockaidScanFailed, {
          scan_target: "domain",
          reason_code:
            err instanceof Error
              ? (scrubStrKeys(err.message) ?? err.message)
              : "unknown",
        });
      }
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
      if (!isBlockaidEnabled(networkDetails)) {
        setError("Scanning transactions is not supported on this network");
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
        emitMetric(METRIC_NAMES.blockaidScanFailed, {
          scan_target: "transaction",
          reason_code: scrubStrKeys(response.error) ?? "no_data",
        });
        setLoading(false);
        return null;
      }

      setData(response.data);
      emitMetric(METRIC_NAMES.blockaidScanCompleted, {
        scan_target: "transaction",
        result:
          response.data.validation && "result_type" in response.data.validation
            ? toBlockaidResultLevel(response.data.validation.result_type)
            : "unknown",
      });
      setLoading(false);
      return response.data;
    } catch (err) {
      setError("Failed to scan transaction");
      captureFetchError(err);
      // A thrown scan failure (backend 5xx / network) must report too, not just
      // the response.error branch — mirrors mobile's trackScanFailed coverage.
      // Skip aborts (expected on cancel), matching scanAsset's guard.
      if (!(err instanceof Error && err.name === "AbortError")) {
        emitMetric(METRIC_NAMES.blockaidScanFailed, {
          scan_target: "transaction",
          reason_code:
            err instanceof Error
              ? (scrubStrKeys(err.message) ?? err.message)
              : "unknown",
        });
      }
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
    if (!isBlockaidEnabled(networkDetails)) {
      /* Scanning assets is only supported on Mainnet */
      return null;
    }
    const response = await fetchJson<ScanAssetResponse>(
      `${INDEXER_URL}/scan-asset?address=${encodeURIComponent(address)}`,
      { signal },
    );

    if (response.error) {
      Sentry.captureException(
        new Error(response.error || "Failed to scan asset"),
      );
      emitMetric(METRIC_NAMES.blockaidScanFailed, {
        scan_target: "asset",
        reason_code: scrubStrKeys(response.error) ?? "unknown",
      });
      return null;
    }

    emitMetric(METRIC_NAMES.blockaidScanCompleted, {
      scan_target: "asset",
      result: toBlockaidResultLevel(response.data?.result_type),
      // Callers pass a `CODE-ISSUER` address; asset codes never contain "-".
      token_code: address.split("-")[0],
    });
    if (!response.data) {
      return null;
    }
    return response.data;
  } catch (err) {
    console.error("Failed to scan asset");
    captureFetchError(err);
    // Report thrown failures too (skip aborts, which are expected on cancel).
    if (!(err instanceof Error && err.name === "AbortError")) {
      emitMetric(METRIC_NAMES.blockaidScanFailed, {
        scan_target: "asset",
        reason_code:
          err instanceof Error
            ? (scrubStrKeys(err.message) ?? err.message)
            : "unknown",
      });
    }
  }
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
 * Reads the blockaid override state from the Redux store.
 * Use this directly in components that need multiple override-aware checks
 * to avoid redundant `getBlockaidOverrideState()` calls per hook.
 */
export const useBlockaidOverrideState = () =>
  useSelector(overriddenBlockaidResponseSelector);

/**
 * Hook that returns isAssetSuspicious with blockaid override state automatically applied
 * In production, blockaid override state is ignored
 */
export const useIsAssetSuspicious = () => {
  const blockaidOverrideState = useBlockaidOverrideState();
  return useCallback(
    (blockaidData?: BlockAidScanAssetResult | null) =>
      isAssetSuspicious(blockaidData, blockaidOverrideState),
    [blockaidOverrideState],
  );
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
  return useCallback(
    (blockaidData?: BlockAidScanAssetResult | null) =>
      isAssetMalicious(blockaidData, blockaidOverrideState),
    [blockaidOverrideState],
  );
};

/**
 * Hook that returns isTxSuspicious with blockaid override state automatically applied
 * In production, blockaid override state is ignored
 */
export const useIsTxSuspicious = () => {
  const blockaidOverrideState = useBlockaidOverrideState();
  return useCallback(
    (blockaidData?: BlockAidScanTxResult | null) =>
      isTxSuspicious(blockaidData, blockaidOverrideState),
    [blockaidOverrideState],
  );
};

/**
 * Hook that returns shouldTreatAssetAsUnableToScan with blockaid override state automatically applied
 * In production, blockaid override state is ignored
 */
export const useShouldTreatAssetAsUnableToScan = () => {
  const blockaidOverrideState = useBlockaidOverrideState();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  return useCallback(
    (blockaidData?: BlockAidScanAssetResult | null) =>
      shouldTreatAssetAsUnableToScan(
        blockaidData,
        blockaidOverrideState,
        networkDetails,
      ),
    [blockaidOverrideState, networkDetails],
  );
};

/**
 * Hook that returns shouldTreatTxAsUnableToScan with blockaid override state automatically applied
 * In production, blockaid override state is ignored
 */
export const useShouldTreatTxAsUnableToScan = () => {
  const blockaidOverrideState = useBlockaidOverrideState();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  return useCallback(
    (blockaidData?: BlockAidScanTxResult | null) =>
      shouldTreatTxAsUnableToScan(
        blockaidData,
        blockaidOverrideState,
        networkDetails,
      ),
    [blockaidOverrideState, networkDetails],
  );
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
 * Precedence: dev override > network gate > scan data.
 */
export const shouldTreatAssetAsUnableToScan = (
  blockaidData: BlockAidScanAssetResult | null | undefined,
  blockaidOverrideState: string | null | undefined,
  networkDetails: NetworkDetails,
): boolean => {
  if (isDev && blockaidOverrideState === SecurityLevel.UNABLE_TO_SCAN) {
    return true;
  }
  if (!isBlockaidEnabled(networkDetails)) {
    return false;
  }
  return isAssetUnableToScan(blockaidData);
};

/**
 * Checks if transaction should be treated as unable to scan based on blockaid override state
 * Precedence: dev override > network gate > scan data.
 */
export const shouldTreatTxAsUnableToScan = (
  blockaidData: BlockAidScanTxResult | null | undefined,
  blockaidOverrideState: string | null | undefined,
  networkDetails: NetworkDetails,
): boolean => {
  if (isDev && blockaidOverrideState === SecurityLevel.UNABLE_TO_SCAN) {
    return true;
  }
  if (!isBlockaidEnabled(networkDetails)) {
    return false;
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

/**
 * Collapses a token's Blockaid scan result into a single SecurityLevel,
 * honoring the dev override and the network gate. UNABLE_TO_SCAN only applies
 * where Blockaid runs (mainnet); a clean scan returns SAFE.
 */
export const getAssetSecurityLevel = ({
  blockaidData,
  blockaidOverrideState,
  networkDetails,
}: {
  blockaidData?: BlockAidScanAssetResult | null;
  blockaidOverrideState?: string | null;
  networkDetails: NetworkDetails;
}): SecurityLevel => {
  if (isAssetMalicious(blockaidData, blockaidOverrideState)) {
    return SecurityLevel.MALICIOUS;
  }
  if (isAssetSuspicious(blockaidData, blockaidOverrideState)) {
    return SecurityLevel.SUSPICIOUS;
  }
  if (
    shouldTreatAssetAsUnableToScan(
      blockaidData,
      blockaidOverrideState,
      networkDetails,
    )
  ) {
    return SecurityLevel.UNABLE_TO_SCAN;
  }
  return SecurityLevel.SAFE;
};

/**
 * Friendly per-feature reasons from a token (asset) Blockaid scan — the same
 * descriptions the Add-a-token flow shows. Only Warning/Malicious features are
 * surfaced (Benign/Info are trust signals, not reasons). Carried through the
 * swap picker so the review's "Do not proceed" pane can list token reasons
 * alongside the transaction-scan reasons.
 */
export const extractAssetScanWarnings = (
  blockaidData?: BlockAidScanAssetResult | null,
): BlockaidWarning[] => {
  const features = blockaidData?.features;
  if (!features?.length) {
    return [];
  }
  return features
    .filter(
      (feature) => feature.type === "Warning" || feature.type === "Malicious",
    )
    .map((feature) => ({
      description: feature.description,
      isError: feature.type === "Malicious",
      featureId: feature.feature_id,
    }));
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
 * Determines site security states from scan data and override state.
 *
 * Precedence (high → low): dev override > network gate > scan data.
 *
 * - When a dev override is set (and `isDev`), the override drives the
 *   returned flags directly — useful for exercising UI states locally
 *   without a real Blockaid result.
 * - Otherwise, when `networkDetails` is null (not yet resolved) or the
 *   active network is one where Blockaid is not applicable
 *   (`!isBlockaidEnabled(...)`, e.g. testnet/futurenet/custom), all flags
 *   are returned `false` so the caller renders no Blockaid-driven UI
 *   (no malicious/suspicious banner, no "unable to scan" affordance).
 * - Otherwise, the scan data drives the flags.
 *
 * @param scanData - The site scan result from Blockaid (undefined while a
 *                   scan is in flight, null when the scan failed).
 * @param blockaidOverrideState - Override state for dev mode (takes precedence).
 * @param networkDetails - The active network. Pass null if it has not
 *                         resolved yet; off-mainnet networks short-circuit
 *                         to all-clear flags.
 * @returns Object with isMalicious, isSuspicious, and isUnableToScan flags.
 */
export const getSiteSecurityStates = (
  scanData: BlockAidScanSiteResult | null | undefined,
  blockaidOverrideState: string | null | undefined,
  networkDetails: NetworkDetails | null,
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

  // Network gate: when Blockaid is not applicable on the active network
  // (or networkDetails has not resolved yet), suppress all security UI.
  // This matches the "scan in-flight" branch below so UI stays neutral.
  if (!networkDetails || !isBlockaidEnabled(networkDetails)) {
    return {
      isMalicious: false,
      isSuspicious: false,
      isUnableToScan: false,
    };
  }

  // Use actual scan results
  return {
    // undefined = scan in-flight (suppress warning); null = scan failed; check status otherwise
    isUnableToScan:
      scanData !== undefined && (!scanData || scanData.status !== "hit"),
    isMalicious: scanData?.status === "hit" && scanData.is_malicious === true,
    // Blockaid does not produce a "suspicious" verdict for site scans, so this
    // is always false for real results. The dev override intentionally allows
    // setting isSuspicious: true so the UI path for a suspicious site can be
    // exercised during development without needing a real suspicious scan result.
    isSuspicious: false,
  };
};

/**
 * Collapses a site (dApp domain) Blockaid scan into a single SecurityLevel for
 * the reusable BlockaidBanner. Blockaid sites have no "suspicious" verdict for
 * real results (only the dev override can set it), so this is malicious /
 * unable-to-scan / safe in practice. Honors the override and the network gate
 * via getSiteSecurityStates.
 */
export const getSiteSecurityLevel = ({
  scanData,
  blockaidOverrideState,
  networkDetails,
}: {
  scanData: BlockAidScanSiteResult | null | undefined;
  blockaidOverrideState: string | null | undefined;
  networkDetails: NetworkDetails | null;
}): SecurityLevel => {
  const { isMalicious, isSuspicious, isUnableToScan } = getSiteSecurityStates(
    scanData,
    blockaidOverrideState,
    networkDetails,
  );
  if (isMalicious) {
    return SecurityLevel.MALICIOUS;
  }
  if (isSuspicious) {
    return SecurityLevel.SUSPICIOUS;
  }
  if (isUnableToScan) {
    return SecurityLevel.UNABLE_TO_SCAN;
  }
  return SecurityLevel.SAFE;
};

/**
 * Collapses a transaction Blockaid scan into a single SecurityLevel (or null
 * when nothing is flagged) for the reusable BlockaidBanner. A simulation error
 * is treated as suspicious. The dev override takes precedence. Shared by the
 * swap review and the dApp sign-transaction flow so both read one source.
 */
export const getTransactionSecurityLevel = (
  txScanResult: BlockAidScanTxResult | null | undefined,
  isUnableToScan: boolean,
  blockaidOverrideState: string | null,
): SecurityLevel | null => {
  // Check overrides first (takes precedence, dev mode only)
  if (blockaidOverrideState) {
    return blockaidOverrideState as SecurityLevel;
  }

  if (!txScanResult) {
    return isUnableToScan ? SecurityLevel.UNABLE_TO_SCAN : null;
  }

  const { simulation, validation } = txScanResult;

  // Handle simulation error - treat as suspicious
  if (simulation && "error" in simulation) {
    return SecurityLevel.SUSPICIOUS;
  }

  if (validation && "result_type" in validation) {
    const resultType = validation.result_type;
    if (resultType === "Malicious") {
      return SecurityLevel.MALICIOUS;
    }
    if (resultType === "Warning") {
      return SecurityLevel.SUSPICIOUS;
    }
  }

  if (isUnableToScan) {
    return SecurityLevel.UNABLE_TO_SCAN;
  }

  return null;
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
    async (currentPayload: T, networkDetails: NetworkDetails) => {
      if (!domain) {
        return;
      }

      // Scan asynchronously without blocking
      scanSiteFn(domain, networkDetails)
        .then((scanResult) => {
          const updatedPayload = updatePayload(currentPayload, scanResult);
          dispatch({ type: "FETCH_DATA_SUCCESS", payload: updatedPayload });
        })
        .catch((error) => {
          console.error("Failed to scan site:", error);
          captureFetchError(error);
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
    captureFetchError(error);
    const updatedPayload = updatePayload
      ? updatePayload(initialPayload, null)
      : ({ ...initialPayload, scanData: null } as T);
    dispatch({ type: "FETCH_DATA_SUCCESS", payload: updatedPayload });
  }
};

// Max assets per /scan-asset-bulk request; callers chunk their candidate list
// into batches of this size. Not a cap on how many assets get scanned.
export const MAX_ASSETS_TO_SCAN = 10;

export const scanAssetBulk = async (
  addressList: string[],
  networkDetails: NetworkDetails,
  signal?: AbortSignal,
): Promise<BlockAidBulkScanAssetResult | null> => {
  try {
    if (!isBlockaidEnabled(networkDetails)) {
      /* Scanning assets is only supported on Mainnet */
      return null;
    }
    const url = new URL(`${INDEXER_URL}/scan-asset-bulk`);
    addressList.forEach((address) => {
      url.searchParams.append("asset_ids", address);
    });
    const resJson = await fetchJson<ScanAssetBulkResponse>(url.href, {
      signal,
    });

    if (resJson.error) {
      Sentry.captureException(
        new Error(resJson.error || "Failed to bulk scan assets"),
      );
    }

    // Aggregate the batch to a worst-case verdict (block > warn > safe),
    // matching mobile's aggregateBulkResult, so asset_bulk carries `result`.
    const bulkLevels = Object.values(resJson.data?.results ?? {}).map((r) =>
      toBlockaidResultLevel(r?.result_type),
    );
    const bulkResult = bulkLevels.includes("block")
      ? "block"
      : bulkLevels.includes("warn")
        ? "warn"
        : bulkLevels.includes("safe")
          ? "safe"
          : "unknown";
    emitMetric(METRIC_NAMES.blockaidScanCompleted, {
      scan_target: "asset_bulk",
      result: bulkResult,
      address_count: addressList.length,
    });
    if (!resJson.data) {
      return null;
    }
    return resJson.data;
  } catch (err) {
    console.error("Failed to bulk scan asset");
    captureFetchError(err);
    if (!(err instanceof Error && err.name === "AbortError")) {
      emitMetric(METRIC_NAMES.blockaidScanFailed, {
        scan_target: "asset_bulk",
        reason_code:
          err instanceof Error
            ? (scrubStrKeys(err.message) ?? err.message)
            : "unknown",
      });
    }
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
    if (!isBlockaidEnabled(networkDetails)) {
      /* Reporting assets is only supported on Mainnet */
      return {} as ReportAssetWarningResponse;
    }
    const res = await fetchJson<ReportAssetWarningResponse>(
      `${INDEXER_URL}/report-asset-warning?address=${encodeURIComponent(address)}&details=${encodeURIComponent(
        details,
      )}`,
    );

    if (res.error) {
      Sentry.captureException(
        new Error(res.error || "Failed to report asset warning"),
      );
    }

    emitMetric(METRIC_NAMES.blockaidWarningReported, { scan_target: "asset" });
    if (!res.data) {
      return {} as ReportAssetWarningResponse;
    }
    return res.data;
  } catch (err) {
    console.error("Failed to report asset warning");
    captureFetchError(err);
  }
  return {} as ReportAssetWarningResponse;
};

interface ReportTransactionWarningParams {
  details: string;
  requestId: string;
  event: string;
  networkDetails: NetworkDetails;
}

export const reportTransactionWarning = async ({
  details,
  requestId,
  event,
  networkDetails,
}: ReportTransactionWarningParams) => {
  try {
    if (!isBlockaidEnabled(networkDetails)) {
      /* Reporting transaction warnings is only supported on Mainnet */
      return {} as ReportTransactionWarningResponse;
    }
    const res = await fetchJson<ReportTransactionWarningResponse>(
      `${INDEXER_URL}/report-transaction-warning?details=${encodeURIComponent(
        details,
      )}&request_id=${encodeURIComponent(requestId)}&event=${encodeURIComponent(event)}`,
    );

    if (res.error) {
      Sentry.captureException(
        new Error(res.error || "Failed to report transaction warning"),
      );
    }

    emitMetric(METRIC_NAMES.blockaidWarningReported, {
      scan_target: "transaction",
    });
    if (!res.data) {
      return {} as ReportTransactionWarningResponse;
    }
    return res.data;
  } catch (err) {
    console.error("Failed to report transaction warning");
    captureFetchError(err);
  }
  return {} as ReportTransactionWarningResponse;
};
