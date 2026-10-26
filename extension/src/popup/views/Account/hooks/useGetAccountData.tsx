import { useEffect, useReducer, useState } from "react";
import { captureException } from "@sentry/browser";

import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import {
  FetchCollectiblesResult,
  useGetCollectibles,
} from "helpers/hooks/useGetCollectibles";
import { isMainnet } from "helpers/stellar";
import { AllowList, ApiTokenPrices } from "@shared/api/types";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { useDispatch } from "react-redux";
import { AppDispatch } from "popup/App";
import { makeAccountActive } from "popup/ducks/accountServices";
import { changeNetwork, saveBackendSettingsAction } from "popup/ducks/settings";
import { useGetTokenPrices } from "helpers/hooks/useGetTokenPrices";
import { loadBackendSettings } from "@shared/api/internal";
import { Collectibles } from "@shared/api/types/types";
import { isCustomNetwork } from "@shared/helpers/stellar";

interface ResolvedAccountData {
  allowList: AllowList;
  type: AppDataType.RESOLVED;
  balances: AccountBalances;
  tokenPrices?: ApiTokenPrices | null;
  networkDetails: NetworkDetails;
  publicKey: string;
  applicationState: APPLICATION_STATE;
  isScanAppended: boolean;
  collectibles: Collectibles;
  /**
   * False until the collectibles request resolves. `collections` is an empty list
   * both before it lands and when the account genuinely owns none, so anything
   * that has to tell those apart -- Home decides where the Collectibles tab's Add
   * action goes from it -- needs this rather than the list length.
   */
  hasLoadedCollectibles: boolean;
  /** The collectibles request failed, so an empty `collections` is unknown. */
  hasCollectiblesError: boolean;
}

type AccountData = NeedsReRoute | ResolvedAccountData;

function useGetAccountData(options: {
  showHidden: boolean;
  includeIcons: boolean;
}) {
  const reduxDispatch = useDispatch<AppDispatch>();
  const [_isMainnet, setIsMainnet] = useState(false);
  const [state, dispatch] = useReducer(
    reducer<AccountData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(options);
  const { fetchData: fetchTokenPrices } = useGetTokenPrices();
  const { fetchData: fetchCollectibles } = useGetCollectibles({
    useCache: true,
  });

  const fetchData = async ({
    useAppDataCache = true,
    updatedAppData,
    shouldForceBalancesRefresh,
  }: {
    useAppDataCache: boolean;
    updatedAppData?: {
      publicKey?: string;
      network?: NetworkDetails;
    };
    shouldForceBalancesRefresh?: boolean;
  }) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      if (updatedAppData && updatedAppData.publicKey) {
        await reduxDispatch(makeAccountActive(updatedAppData.publicKey));
      }

      if (updatedAppData && updatedAppData.network) {
        await reduxDispatch(changeNetwork(updatedAppData.network));
      }

      const appData = await fetchAppData(useAppDataCache, false);
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;
      const allowList = appData.settings.allowList;
      const isMainnetNetwork = isMainnet(networkDetails);

      // Started here rather than after the first dispatch, and deliberately not
      // awaited yet: until it resolves the Collectibles tab cannot say where its
      // Add action belongs, so running it alongside the balances fetch keeps that
      // gap short. It needs only the key and network, both already known.
      const collectiblesRequest: Promise<FetchCollectiblesResult> =
        isCustomNetwork(networkDetails)
          ? Promise.resolve({ collections: [] })
          : fetchCollectibles({ publicKey, networkDetails });

      // let's fetch *just* the balances (without Blockaid scan results) to quickly be able to show the user their balances
      const balancesResult = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
        !shouldForceBalancesRefresh,
        true, // skip the Blockaid scan,
      );

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      const payload = {
        type: AppDataType.RESOLVED,
        allowList,
        publicKey,
        applicationState: appData.account.applicationState,
        balances: balancesResult,
        networkDetails,
        isScanAppended: false,
        collectibles: { collections: [] },
        hasLoadedCollectibles: false,
        hasCollectiblesError: false,
      } as ResolvedAccountData;

      if (isMainnetNetwork) {
        try {
          const fetchedTokenPrices = await fetchTokenPrices({
            publicKey,
            balances: balancesResult.balances,
            networkDetails,
            useCache: true,
          });
          payload.tokenPrices = fetchedTokenPrices.tokenPrices;
          setIsMainnet(isMainnetNetwork);
        } catch (e) {
          payload.tokenPrices = null;
        }
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });

      const { error: collectiblesError, ...collectibles } =
        await collectiblesRequest;
      payload.collectibles = collectibles;
      payload.hasLoadedCollectibles = true;
      payload.hasCollectiblesError = !!collectiblesError;
      // Dispatched, not just assigned: the reducer holds this very object, so
      // mutating it changes what a later render reads but schedules no render of
      // its own. Without this the Collectibles tab kept waiting on a result that
      // had already arrived until some unrelated dispatch happened to land.
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: { ...payload } });

      if (isMainnetNetwork) {
        // now that the UI has renderered, on Mainnet, let's make an additional call to fetch the balances with the Blockaid scan results included
        try {
          const balancesResult = await fetchBalances(
            publicKey,
            isMainnetNetwork,
            networkDetails,
            false,
            false, // don't skip the Blockaid scan,
          );

          const scannedPayload = {
            ...payload,
            balances: balancesResult,
            isScanAppended: true,
          } as ResolvedAccountData;
          dispatch({ type: "FETCH_DATA_SUCCESS", payload: scannedPayload });
        } catch (e) {
          captureException(`Error fetching scanned balances on Account - ${e}`);
        }
      }

      const backendSettings = await loadBackendSettings();
      reduxDispatch(saveBackendSettingsAction(backendSettings));
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      captureException(`Error loading account data on Account - ${error}`);
      return error;
    }
  };

  const refreshAppData = async () => {
    try {
      const appData = await fetchAppData(false);
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;
      const allowList = appData.settings.allowList;
      const applicationState = appData.account.applicationState;

      const payload = {
        ...state.data,
        allowList,
        publicKey,
        networkDetails,
        applicationState,
      } as ResolvedAccountData;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      captureException(`Error loading refresh app data on Account - ${error}`);
      return error;
    }
  };

  /**
   * Re-fetch balances *without* blanking the screen.
   *
   * `fetchData` opens with FETCH_DATA_START, which the shared reducer resolves
   * to `{ state: LOADING, data: null }`, and Account early-returns a
   * full-screen <Loading /> on LOADING. That is right for a cold load and wrong
   * for a refresh set off by dismissing a sheet: Home was replaced by a spinner
   * and the sheet lost its exit animation. Merge into the resolved data and
   * dispatch only on success, as the 30s polling effects below do.
   */
  const refreshBalances = async () => {
    if (!state.data || state.data.type === AppDataType.REROUTE) {
      return;
    }
    const resolvedData = state.data;

    try {
      const balancesResult = await fetchBalances(
        resolvedData.publicKey,
        // Derived per call from the network in hand. A flag cached across
        // fetches goes stale the moment the user switches away from mainnet,
        // and `fetchBalances` sends a mainnet `true` straight into the
        // Blockaid bulk scan.
        isMainnet(resolvedData.networkDetails),
        resolvedData.networkDetails,
        false,
      );

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      dispatch({
        type: "FETCH_DATA_SUCCESS",
        payload: {
          ...resolvedData,
          balances: balancesResult,
          isScanAppended: true,
        } as ResolvedAccountData,
      });
    } catch (error) {
      // Deliberately not FETCH_DATA_ERROR: a background refresh that fails has
      // to leave the good data on screen rather than swap it for the error
      // view.
      captureException(`Error refreshing balances on Account - ${error}`);
    }
  };

  useEffect(() => {
    if (!state.data || state.data.type === AppDataType.REROUTE || !_isMainnet) {
      return;
    }
    const resolvedData = state.data;

    const interval = setInterval(async () => {
      try {
        const fetchedTokenPrices = await fetchTokenPrices({
          publicKey: resolvedData.publicKey,
          balances: resolvedData.balances.balances,
          networkDetails: resolvedData.networkDetails,
          useCache: false,
        });
        const payload = {
          ...state.data,
          tokenPrices: fetchedTokenPrices.tokenPrices,
        } as AccountData;
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      } catch (error) {
        captureException(`Error refreshing token prices on Account - ${error}`);
      }
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_isMainnet, state.data]);

  useEffect(() => {
    // refresh balances every 30 seconds

    if (!state.data || state.data.type === AppDataType.REROUTE) {
      return;
    }
    const resolvedData = state.data;

    const interval = setInterval(async () => {
      try {
        const publicKey = resolvedData.publicKey;
        const networkDetails = resolvedData.networkDetails;
        const balancesResult = await fetchBalances(
          publicKey,
          _isMainnet,
          networkDetails,
          false,
        );

        const payload = {
          ...state.data,
          balances: balancesResult,
          isScanAppended: true,
        } as AccountData;
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      } catch (error) {
        captureException(`Error refreshing balances on Account - ${error}`);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [_isMainnet, state.data, fetchBalances]);

  return {
    state,
    fetchData,
    refreshAppData,
    refreshBalances,
  };
}

export { useGetAccountData, RequestState };
