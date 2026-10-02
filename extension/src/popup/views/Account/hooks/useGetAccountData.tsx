import { useEffect, useReducer, useRef } from "react";
import { captureException } from "@sentry/browser";

import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useGetCollectibles } from "helpers/hooks/useGetCollectibles";
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
}

type AccountData = NeedsReRoute | ResolvedAccountData;

function useGetAccountData(options: {
  showHidden: boolean;
  includeIcons: boolean;
}) {
  const reduxDispatch = useDispatch<AppDispatch>();
  const [state, dispatch] = useReducer(
    reducer<AccountData, unknown>,
    initialState,
  );
  /**
   * Which account/network scope the in-flight requests belong to. Every
   * dispatch here follows an await and spreads a snapshot captured before it,
   * so one that lands after a wallet switch would restore the previous
   * account wholesale -- its publicKey and networkDetails included, not just
   * the field it went to fetch.
   *
   * Only `fetchData` bumps it; it is the only path that changes the active
   * account or network. The refreshes and the pollers capture and compare
   * without bumping, or the two 30s pollers -- both set up on the same
   * `state.data` change, so they tick together -- would cancel each other out
   * and drop a refresh every interval. Same idiom as `useHiddenCollectibles`.
   */
  const requestIdRef = useRef(0);
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
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;

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
        if (isCurrent()) {
          dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        }
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
      const collectiblesRequest = isCustomNetwork(networkDetails)
        ? Promise.resolve({ collections: [] } as Collectibles)
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
      } as ResolvedAccountData;

      if (isMainnetNetwork) {
        try {
          const fetchedTokenPrices = await fetchTokenPrices({
            publicKey,
            // Price everything the account holds, not just what is visible.
            // The cached price map is keyed by account and network alone, with
            // no record of which assets it covers, so a map built from the
            // filtered list is served as complete for the next 3 minutes. Redux
            // does not persist, so a popup opened while an asset is hidden
            // caches a map without it, and unhiding -- which only writes the
            // visibility mirror -- brings the row back with no price. Hidden
            // assets stay out of the totals because getTotalUsd is gated on the
            // filtered `balances` below, not on this map.
            balances:
              balancesResult.unfilteredBalances ?? balancesResult.balances,
            networkDetails,
            useCache: true,
          });
          payload.tokenPrices = fetchedTokenPrices.tokenPrices;
        } catch (e) {
          payload.tokenPrices = null;
        }
      }

      if (isCurrent()) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      }

      payload.collectibles = await collectiblesRequest;
      payload.hasLoadedCollectibles = true;
      // Dispatched, not just assigned: the reducer holds this very object, so
      // mutating it changes what a later render reads but schedules no render of
      // its own. Without this the Collectibles tab kept waiting on a result that
      // had already arrived until some unrelated dispatch happened to land.
      if (isCurrent()) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: { ...payload } });
      }

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
          if (isCurrent()) {
            dispatch({ type: "FETCH_DATA_SUCCESS", payload: scannedPayload });
          }
        } catch (e) {
          captureException(`Error fetching scanned balances on Account - ${e}`);
        }
      }

      const backendSettings = await loadBackendSettings();
      reduxDispatch(saveBackendSettingsAction(backendSettings));
      return payload;
    } catch (error) {
      // Only the live fetch may raise the error view. A superseded one failing
      // would blank the account that has since loaded.
      if (isCurrent()) {
        dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      }
      captureException(`Error loading account data on Account - ${error}`);
      return error;
    }
  };

  const refreshAppData = async () => {
    const requestId = requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;

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
      if (isCurrent()) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      }
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
    const requestId = requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;

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

      if (isCurrent()) {
        dispatch({
          type: "FETCH_DATA_SUCCESS",
          payload: {
            ...resolvedData,
            balances: balancesResult,
            isScanAppended: true,
          } as ResolvedAccountData,
        });
      }
    } catch (error) {
      // Deliberately not FETCH_DATA_ERROR: a background refresh that fails has
      // to leave the good data on screen rather than swap it for the error
      // view.
      captureException(`Error refreshing balances on Account - ${error}`);
    }
  };

  /** Same contract as `refreshBalances`, for the collectibles grid. */
  const refreshCollectibles = async () => {
    if (!state.data || state.data.type === AppDataType.REROUTE) {
      return;
    }
    const resolvedData = state.data;

    if (isCustomNetwork(resolvedData.networkDetails)) {
      return;
    }

    const requestId = requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;

    try {
      // Cache-first, and the remove handler corrects the cache before calling
      // this, so the common case costs no round trip.
      const collectibles = await fetchCollectibles({
        publicKey: resolvedData.publicKey,
        networkDetails: resolvedData.networkDetails,
      });

      if (isCurrent()) {
        dispatch({
          type: "FETCH_DATA_SUCCESS",
          payload: {
            ...resolvedData,
            collectibles,
            hasLoadedCollectibles: true,
          } as ResolvedAccountData,
        });
      }
    } catch (error) {
      captureException(`Error refreshing collectibles on Account - ${error}`);
    }
  };

  useEffect(() => {
    if (
      !state.data ||
      state.data.type === AppDataType.REROUTE ||
      // Same gate as `fetchData`, read off the resolved network rather than a
      // cached flag, so switching away from mainnet actually stops the poll.
      !isMainnet(state.data.networkDetails)
    ) {
      return;
    }
    const resolvedData = state.data;

    const interval = setInterval(async () => {
      // Captured per tick rather than per effect: clearInterval stops the next
      // tick but cannot recall a request this one already has in flight.
      const requestId = requestIdRef.current;
      const isCurrent = () => requestId === requestIdRef.current;

      try {
        const fetchedTokenPrices = await fetchTokenPrices({
          publicKey: resolvedData.publicKey,
          // Unfiltered for the same reason as the initial fetch above --
          // moreso here, since `useCache: false` means a filtered list would
          // overwrite a complete map with a gapped one every 30 seconds.
          balances:
            resolvedData.balances.unfilteredBalances ??
            resolvedData.balances.balances,
          networkDetails: resolvedData.networkDetails,
          useCache: false,
        });
        const payload = {
          ...state.data,
          tokenPrices: fetchedTokenPrices.tokenPrices,
        } as AccountData;
        if (isCurrent()) {
          dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        }
      } catch (error) {
        captureException(`Error refreshing token prices on Account - ${error}`);
      }
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data]);

  useEffect(() => {
    // refresh balances every 30 seconds

    if (!state.data || state.data.type === AppDataType.REROUTE) {
      return;
    }
    const resolvedData = state.data;

    const interval = setInterval(async () => {
      const requestId = requestIdRef.current;
      const isCurrent = () => requestId === requestIdRef.current;

      try {
        const publicKey = resolvedData.publicKey;
        const networkDetails = resolvedData.networkDetails;
        const balancesResult = await fetchBalances(
          publicKey,
          isMainnet(networkDetails),
          networkDetails,
          false,
        );

        const payload = {
          ...state.data,
          balances: balancesResult,
          isScanAppended: true,
        } as AccountData;
        if (isCurrent()) {
          dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        }
      } catch (error) {
        captureException(`Error refreshing balances on Account - ${error}`);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [state.data, fetchBalances]);

  return {
    state,
    fetchData,
    refreshAppData,
    refreshBalances,
    refreshCollectibles,
  };
}

export { useGetAccountData, RequestState };
