import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { initialState, reducer } from "helpers/request";
import { horizonGetBestPath } from "popup/helpers/horizonGetBestPath";
import { soroswapGetBestPath } from "popup/helpers/sorobanSwap";
import { getCanonicalFromAsset } from "helpers/stellar";

type Rate =
  | Awaited<ReturnType<typeof horizonGetBestPath>>
  | Awaited<ReturnType<typeof soroswapGetBestPath>>;

interface BestRate {
  path: Rate;
}

export interface PathUpdate {
  amountIn?: string | undefined;
  amountInDecimals?: number | undefined;
  amountOutMin?: string | undefined;
  amountOutDecimals?: number | undefined;
  path: string[] | undefined;
  destinationAmount: string;
}

function useGetBestRate(onPathResolved: (path: PathUpdate) => void) {
  const [state, dispatch] = useReducer(
    reducer<BestRate, unknown>,
    initialState,
  );

  const getBestPath = async ({
    amount,
    sourceAsset,
    destAsset,
    networkDetails,
  }: {
    amount: string;
    sourceAsset: string;
    destAsset: string;
    networkDetails: NetworkDetails;
  }) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const pathResponse = await horizonGetBestPath({
        amount,
        sourceAsset,
        destAsset,
        networkDetails,
      });

      const payload = {
        path: pathResponse,
      };
      const canonicalPath = [] as string[];
      pathResponse.path.forEach((p) => {
        if (!p.asset_code && !p.asset_issuer) {
          canonicalPath.push(p.asset_type);
        } else {
          canonicalPath.push(
            getCanonicalFromAsset(p.asset_code, p.asset_issuer),
          );
        }
      });
      const pathUpdate = {
        path: canonicalPath,
        destinationAmount: pathResponse.destination_amount,
      };
      onPathResolved(pathUpdate);
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  const getBestSoroswapPath = async ({
    amount,
    sourceContract,
    destContract,
    publicKey,
    networkDetails,
  }: {
    amount: string;
    sourceContract: string;
    destContract: string;
    publicKey: string;
    networkDetails: NetworkDetails;
  }) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const pathResponse = await soroswapGetBestPath({
        amount,
        sourceContract,
        destContract,
        publicKey,
        networkDetails,
      });

      const payload = {
        path: pathResponse,
      };
      const pathUpdate = {
        path: pathResponse?.path,
        destinationAmount: (pathResponse && pathResponse.amountOutMin) || "",
        ...pathResponse,
      };
      onPathResolved(pathUpdate);
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  return {
    state,
    getBestPath,
    getBestSoroswapPath,
  };
}

export { useGetBestRate };
