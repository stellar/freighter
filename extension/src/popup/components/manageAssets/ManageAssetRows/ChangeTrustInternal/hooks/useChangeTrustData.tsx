import { useEffect, useReducer } from "react";

import { initialState, reducer } from "helpers/request";
import { checkForSuspiciousAsset } from "popup/helpers/checkForSuspiciousAsset";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { NetworkDetails } from "@shared/constants/stellar";
import { isAssetSuspicious, scanAsset } from "popup/helpers/blockaid";
import { BlockAidScanAssetResult } from "@shared/api/types";
import { getManageAssetXDR } from "popup/helpers/getManageAssetXDR";
import { FlaggedKeys } from "types/transactions";

export interface NewAssetFlags {
  isInvalidDomain: boolean;
  isRevocable: boolean;
}

export interface ChangeTrustData {
  asset: NewAssetFlags;
  flaggedKeys: FlaggedKeys;
  scanResult: BlockAidScanAssetResult;
  transactionXDR: string;
  isAssetSuspicious: boolean;
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
    domain: string;
    contract?: string;
  };
  assetImage: string;
  networkDetails: NetworkDetails;
  recommendedFee: string;
  publicKey: string;
  addTrustline: boolean;
}) {
  const [state, dispatch] = useReducer(
    reducer<ChangeTrustData, unknown>,
    initialState,
  );

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const payload = { flaggedKeys: {} } as ChangeTrustData;

      if (!asset.contract) {
        const server = stellarSdkServer(
          networkDetails.networkUrl,
          networkDetails.networkPassphrase,
        );
        const resp = await checkForSuspiciousAsset({
          code: asset.code,
          issuer: asset.issuer,
          domain: asset.domain,
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
        payload.isAssetSuspicious = isAssetSuspicious(scannedAsset);
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
