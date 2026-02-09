import { useEffect, useReducer } from "react";

import { initialState, reducer } from "helpers/request";
import { checkForSuspiciousAsset } from "popup/helpers/checkForSuspiciousAsset";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  scanAsset,
  useIsAssetSuspicious,
  shouldTreatAssetAsUnableToScan,
} from "popup/helpers/blockaid";
import { getBlockaidOverrideState } from "@shared/api/internal";
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
  const isAssetSuspiciousCheck = useIsAssetSuspicious();

  const fetchData = async () => {
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
        const resp = await checkForSuspiciousAsset({
          code: asset.code,
          issuer: asset.issuer,
          domain: asset.domain || "",
          server,
          networkDetails,
        });
        payload.asset = resp;

        const scannedAsset = await scanAsset(
          `${asset.code}-${asset.issuer}`,
          networkDetails,
        );
        payload.scanResult = scannedAsset;

        const transactionXDR = await getManageAssetXDR({
          publicKey,
          assetCode: asset.code,
          assetIssuer: asset.issuer,
          addTrustline,
          server,
          recommendedFee,
          networkDetails,
        });
        payload.transactionXDR = transactionXDR;
        // Check suspicious and unable to scan separately
        payload.isAssetSuspicious = isAssetSuspiciousCheck(scannedAsset);
        // Get override state directly to ensure it's checked
        const blockaidOverrideState = await getBlockaidOverrideState();
        payload.isAssetUnableToScan = shouldTreatAssetAsUnableToScan(
          scannedAsset,
          blockaidOverrideState,
        );
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    fetchData,
  };
}

export { useGetChangeTrustData };
