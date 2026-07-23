import { useCallback, useEffect, useReducer, useRef } from "react";

import { initialState, reducer } from "helpers/request";
import { checkForSuspiciousAsset } from "popup/helpers/checkForSuspiciousAsset";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  scanAsset,
  isAssetSuspicious,
  shouldTreatAssetAsUnableToScan,
  useBlockaidOverrideState,
} from "popup/helpers/blockaid";
import { BlockAidScanAssetResult } from "@shared/api/types";
import { getManageAssetXDR } from "popup/helpers/getManageAssetXDR";
import { FlaggedKeys } from "types/transactions";
import { isAssetSac } from "popup/helpers/soroban";

export interface NewAssetFlags {
  isInvalidDomain: boolean;
  isRevocable: boolean;
}

export interface ChangeTrustData {
  asset: NewAssetFlags;
  flaggedKeys: FlaggedKeys;
  scanResult: BlockAidScanAssetResult | null;
  transactionXDR: string;
  isAssetSuspicious: boolean;
  isAssetUnableToScan: boolean;
  isAssetVerified: boolean;
}

function useGetChangeTrustData({
  asset,
  networkDetails,
  recommendedFee,
  publicKey,
  addTrustline,
}: {
  asset: {
    code: string;
    issuer: string;
    domain: string | null;
    contract?: string;
  };
  assetImage: string | null;
  networkDetails: NetworkDetails;
  recommendedFee: string;
  publicKey: string;
  addTrustline: boolean;
}) {
  const [state, dispatch] = useReducer(
    reducer<ChangeTrustData, unknown>,
    initialState,
  );

  const blockaidOverrideState = useBlockaidOverrideState() ?? null;

  // The asset scan / suspicious-asset checks depend only on asset identity, not
  // the fee. Cache them so editing the fee (which only changes the XDR) doesn't
  // re-issue the Blockaid scan and account load.
  const scanCacheRef = useRef<{
    key: string;
    asset: NewAssetFlags;
    scanResult: BlockAidScanAssetResult | null;
    isAssetSuspicious: boolean;
    isAssetUnableToScan: boolean;
  } | null>(null);

  const fetchData = useCallback(async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const payload = { flaggedKeys: {} } as ChangeTrustData;

      const isSac = isAssetSac({
        asset: {
          code: asset.code,
          issuer: asset.issuer,
          contract: asset.contract,
        },
        networkDetails,
      });

      if (!asset.contract || isSac) {
        const server = stellarSdkServer(
          networkDetails.networkUrl,
          networkDetails.networkPassphrase,
        );

        const scanKey = [
          asset.code,
          asset.issuer,
          asset.contract ?? "",
          asset.domain ?? "",
          networkDetails.networkPassphrase,
          networkDetails.networkUrl,
          blockaidOverrideState ?? "",
        ].join("|");

        let scan = scanCacheRef.current;
        if (!scan || scan.key !== scanKey) {
          const resp = await checkForSuspiciousAsset({
            code: asset.code,
            issuer: asset.issuer,
            domain: asset.domain || "",
            server,
            networkDetails,
          });
          const scannedAsset = await scanAsset(
            `${asset.code}-${asset.issuer}`,
            networkDetails,
          );
          const isAssetUnableToScan = shouldTreatAssetAsUnableToScan(
            scannedAsset,
            blockaidOverrideState,
            networkDetails,
          );
          scan = {
            key: scanKey,
            asset: resp,
            scanResult: scannedAsset,
            isAssetUnableToScan,
            // unable-to-scan takes precedence — never mark both at once
            isAssetSuspicious:
              !isAssetUnableToScan &&
              isAssetSuspicious(scannedAsset, blockaidOverrideState),
          };
          scanCacheRef.current = scan;
        }

        payload.asset = scan.asset;
        payload.scanResult = scan.scanResult;
        payload.isAssetUnableToScan = scan.isAssetUnableToScan;
        payload.isAssetSuspicious = scan.isAssetSuspicious;

        // Only the XDR depends on the fee, so it always rebuilds.
        payload.transactionXDR = await getManageAssetXDR({
          publicKey,
          assetCode: asset.code,
          assetIssuer: asset.issuer,
          addTrustline,
          server,
          recommendedFee,
          networkDetails,
        });
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  }, [
    addTrustline,
    asset.code,
    asset.contract,
    asset.domain,
    asset.issuer,
    blockaidOverrideState,
    networkDetails,
    publicKey,
    recommendedFee,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    state,
    fetchData,
  };
}

export { useGetChangeTrustData };
