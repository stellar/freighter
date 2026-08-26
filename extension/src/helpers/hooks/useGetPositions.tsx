import { useCallback, useMemo, useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import { getBlendPositions } from "@shared/api/helpers/blend";
import { AccountPositions } from "@shared/api/types/blend";
import { isEarnSupportedNetwork } from "@shared/constants/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import { State } from "constants/request";
import { initialState, isCacheValid, reducer } from "helpers/request";
import { AppDispatch } from "popup/App";
import { positionsSelector, savePositions } from "popup/ducks/cache";

export interface FetchPositionsParams {
  publicKey: string;
  networkDetails: NetworkDetails;
}

/** What an account with nothing supplied looks like, and the short-circuit
 *  result on networks where Earn is unavailable. */
export const EMPTY_POSITIONS = (address: string): AccountPositions => ({
  address,
  totalValueUsd: null,
  netApy: null,
  positions: [],
  backstop: [],
});

/**
 * The account's Blend positions, cached per network and public key.
 *
 * Modelled on `useGetCollectibles`: a local request reducer for the caller's
 * loading/error state, with the resolved payload mirrored into the `cache`
 * slice so other screens can read it without a second round trip.
 *
 * Unlike collectibles, a rejection is NOT swallowed. The Positions tab draws a
 * real error state, and returning an empty result on failure would tell the
 * account it holds nothing when the truth is unknown.
 */
function useGetPositions({ useCache = true }: { useCache?: boolean } = {}) {
  const [state, dispatch] = useReducer(
    reducer<AccountPositions, Error>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();
  const cached = useSelector(positionsSelector);

  const fetchData = useCallback(
    async ({
      publicKey,
      networkDetails,
    }: FetchPositionsParams): Promise<AccountPositions> => {
      dispatch({ type: "FETCH_DATA_START" });

      // Earn only exists where we have an allowlisted pool, and the backend
      // 400s on any network outside PUBLIC/TESTNET. Resolve locally rather
      // than spending a request to be told so.
      if (!isEarnSupportedNetwork(networkDetails)) {
        const empty = EMPTY_POSITIONS(publicKey);
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: empty });
        return empty;
      }

      const entry = cached[networkDetails.network]?.[publicKey];
      if (useCache && entry && isCacheValid(entry)) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: entry });
        return entry;
      }

      try {
        const positions = await getBlendPositions({
          publicKey,
          networkDetails,
        });
        reduxDispatch(savePositions({ publicKey, networkDetails, positions }));
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: positions });
        return positions;
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        captureException(`Error fetching Blend positions - ${errorObj}`);
        dispatch({ type: "FETCH_DATA_ERROR", payload: errorObj });
        throw errorObj;
      }
    },
    [useCache, cached, reduxDispatch],
  );

  return useMemo(() => ({ state, fetchData }), [state, fetchData]);
}

export { useGetPositions };
export type UseGetPositionsReturn = {
  state: State<AccountPositions, Error>;
  fetchData: (params: FetchPositionsParams) => Promise<AccountPositions>;
};
