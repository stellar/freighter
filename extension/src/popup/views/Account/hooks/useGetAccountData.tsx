import { useEffect, useReducer, useRef, useState } from "react";
import { captureException } from "@sentry/browser";

import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import {
  FetchCollectiblesResult,
  useGetCollectibles,
} from "helpers/hooks/useGetCollectibles";
import { useGetPositions } from "helpers/hooks/useGetPositions";
import { isMainnet } from "helpers/stellar";
import { AllowList, ApiTokenPrices } from "@shared/api/types";
import { getBlendEarnOptions, getBlendPools } from "@shared/api/helpers/blend";
import {
  AccountPositions,
  BlendCatalogPool,
  BlendEarnAssetOption,
} from "@shared/api/types/blend";
import { isEarnSupportedNetwork } from "@shared/constants/blend";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { useDispatch, useSelector, useStore } from "react-redux";
import { AppDispatch, AppState } from "popup/App";
import {
  positionsEnabledSelector,
  waitForRemoteConfig,
} from "popup/ducks/remoteConfig";
import { makeAccountActive } from "popup/ducks/accountServices";
import { awaitedDepositSelector, saveAwaitedDeposit } from "popup/ducks/earn";
import {
  AWAITED_DEPOSIT_POLL_MS,
  hasDepositLanded,
} from "popup/components/earn/helpers/awaitedDeposit";
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
  positions: AccountPositions | null;
  /**
   * False until the positions request settles. `positions` is empty both before
   * it lands and when the account genuinely holds none, so anything that has to
   * tell those apart -- the Positions tab decides between a spinner and its
   * empty state from it -- needs this rather than the list length.
   */
  hasLoadedPositions: boolean;
  /**
   * The positions request rejected. Distinct from an empty result: the tab
   * renders an error rather than claiming the account holds nothing.
   */
  hasPositionsError: boolean;
  /**
   * Earn catalog, fetched only once positions land empty -- it exists purely to
   * price the empty state's "you could earn up to" projection. Null otherwise.
   *
   * Fetched here rather than by the empty-state component because MultiPaneSlider
   * unmounts inactive panes, so a component-owned fetch would re-request on
   * every tab switch.
   */
  earnOptions: BlendEarnAssetOption[] | null;
  /**
   * The full pool catalog, fetched alongside positions -- it backs the
   * pool-details sheet a Positions row opens, so unlike `earnOptions` it is
   * needed precisely when the account already holds positions, not only when
   * it doesn't.
   */
  pools: BlendCatalogPool[];
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
  const { fetchData: fetchPositions } = useGetPositions({ useCache: true });
  const store = useStore<AppState>();
  const awaitedDeposit = useSelector(awaitedDepositSelector);
  // The effect below outlives several renders; it reads the data it merges
  // into from here, so its own dependencies need not include it.
  const latestDataRef = useRef(state.data);
  latestDataRef.current = state.data;

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

      // Same treatment as collectibles: started before the balances await and
      // deliberately not awaited yet, so the Positions tab's spinner is as short
      // as it can be. It needs only the key and network, both already known.
      // `useCache` mirrors the balances call just below: an account/network
      // switch (`shouldForceBalancesRefresh`) must not serve the previous
      // account's cached positions.
      const positionsRequest = fetchPositions({
        publicKey,
        networkDetails,
        useCache: !shouldForceBalancesRefresh,
      });
      // Marks the promise handled without changing what `await positionsRequest`
      // throws below: it is first awaited several `await`s later (inside its own
      // try/catch), and a rejection landing in that gap would otherwise fire
      // Sentry's `unhandledrejection` handler on top of the deliberate
      // `captureException` call there.
      positionsRequest.catch(() => {});

      // Same treatment as positions: started before the balances await so its
      // round trip overlaps balances/collectibles/positions instead of adding
      // to the critical path in front of the Blockaid rescan below. Only
      // fetched where Earn exists at all; landed once positions has resolved,
      // alongside the pools dispatch below.
      //
      // The catalog and the earn options below back only the Positions tab, so
      // both also wait on `positions_enabled`: with it off, Home makes none of
      // the tab's requests. Resolved once the flags settle, without holding up
      // the requests started above.
      const isPositionsEnabledRequest = isEarnSupportedNetwork(networkDetails)
        ? waitForRemoteConfig(store).then(() =>
            positionsEnabledSelector(store.getState()),
          )
        : Promise.resolve(false);
      const poolsRequest = isPositionsEnabledRequest.then((isEnabled) =>
        isEnabled ? getBlendPools({ networkDetails }) : null,
      );
      poolsRequest.catch(() => {});

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
        positions: null,
        hasLoadedPositions: false,
        hasPositionsError: false,
        earnOptions: null,
        pools: [],
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

      try {
        payload.positions = await positionsRequest;
      } catch (error) {
        // Non-fatal for the rest of Home: balances and collectibles are already
        // on screen. Only the Positions tab changes what it renders.
        payload.hasPositionsError = true;
        captureException(`Error fetching positions on Account - ${error}`);
      }
      payload.hasLoadedPositions = true;
      // Dispatched rather than only assigned, for the reason spelled out on the
      // collectibles dispatch above: the reducer holds this very object.
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: { ...payload } });

      // Landed here (not yet awaited when it was started, above) and, for
      // earnOptions, only ever STARTED once we know it applies -- neither sits
      // in front of the Blockaid rescan below.
      let earnOptionsRequest: Promise<BlendEarnAssetOption[]> | null = null;
      if (await isPositionsEnabledRequest) {
        // Unlike earnOptions below, fetched regardless of whether the account
        // has positions -- it backs the pool-details sheet a Positions row
        // opens, so it is needed precisely when positions exist, not only
        // when they don't. By the time this await runs, poolsRequest has had
        // the whole balances/collectibles/positions round trip to resolve, so
        // this rarely waits at all.
        try {
          const pools = await poolsRequest;
          if (pools) {
            payload.pools = pools;
            dispatch({ type: "FETCH_DATA_SUCCESS", payload: { ...payload } });
          }
        } catch (error) {
          captureException(`Error fetching pools on Account - ${error}`);
        }

        // Only the empty state needs the catalog, and only to price its
        // projection. Skipped entirely for an account that already has positions.
        if (
          !payload.hasPositionsError &&
          !payload.positions?.positions.length
        ) {
          earnOptionsRequest = getBlendEarnOptions({ networkDetails });
          earnOptionsRequest.catch(() => {});
        }
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

          // Mutated onto `payload` itself -- the same pattern every other
          // section above uses -- rather than a throwaway `scannedPayload`
          // local. The reducer fully replaces state per dispatch
          // (helpers/request.ts: `data: action.payload`), so a throwaway local
          // here is only safe as long as nothing dispatches from `payload`
          // again afterward. The earnOptions landing below can now run after
          // this block, and a `{ ...payload }` there would otherwise silently
          // revert these two fields right after the scan lands.
          payload.balances = balancesResult as AccountBalances;
          payload.isScanAppended = true;
          dispatch({ type: "FETCH_DATA_SUCCESS", payload: { ...payload } });
        } catch (e) {
          captureException(`Error fetching scanned balances on Account - ${e}`);
        }
      }

      if (earnOptionsRequest) {
        try {
          payload.earnOptions = await earnOptionsRequest;
          dispatch({ type: "FETCH_DATA_SUCCESS", payload: { ...payload } });
        } catch (error) {
          // The card degrades to hidden; nothing else depends on this.
          captureException(`Error fetching earn options on Account - ${error}`);
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

  // Once Home has loaded this account's positions, follow a deposit until
  // Positions show it. Positions trail the ledger by a few seconds (see
  // AwaitedDeposit), so the read at load, from the cache or from the network,
  // can still be missing it. Re-read every few seconds, putting each read on
  // screen, until the deposit shows or the wait expires; the 30s poll carries
  // on from there. Always reads at least once, even after the wait expired:
  // that read is what replaces the pre-deposit copy Home loaded from the cache.
  const loadedAccount =
    state.data?.type === AppDataType.RESOLVED && state.data.hasLoadedPositions
      ? `${state.data.networkDetails.network}:${state.data.publicKey}`
      : null;

  useEffect(() => {
    if (
      !awaitedDeposit ||
      loadedAccount !== `${awaitedDeposit.network}:${awaitedDeposit.publicKey}`
    ) {
      return undefined;
    }

    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      const data = latestDataRef.current;
      if (!data || data.type !== AppDataType.RESOLVED) {
        return;
      }
      try {
        const positions = await fetchPositions({
          publicKey: data.publicKey,
          networkDetails: data.networkDetails,
          useCache: false,
        });
        const latest = latestDataRef.current;
        if (
          isCancelled ||
          latest?.type !== AppDataType.RESOLVED ||
          latest.publicKey !== awaitedDeposit.publicKey ||
          latest.networkDetails.network !== awaitedDeposit.network
        ) {
          return;
        }
        dispatch({
          type: "FETCH_DATA_SUCCESS",
          payload: { ...latest, positions, hasPositionsError: false },
        });
        if (hasDepositLanded(positions, awaitedDeposit)) {
          reduxDispatch(saveAwaitedDeposit(null));
          return;
        }
      } catch {
        // `fetchPositions` has reported it; the next read may well succeed.
        if (isCancelled) {
          return;
        }
      }
      if (Date.now() >= awaitedDeposit.expiresAt) {
        reduxDispatch(saveAwaitedDeposit(null));
        return;
      }
      timer = setTimeout(check, AWAITED_DEPOSIT_POLL_MS);
    };

    check();
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [awaitedDeposit, loadedAccount, fetchPositions, reduxDispatch]);

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

        let refreshedPositions = resolvedData.positions;
        let refreshedPositionsError = false;
        try {
          // Unlike the initial load, this must hit the network every tick —
          // the whole point of the interval is a fresh read.
          refreshedPositions = await fetchPositions({
            publicKey,
            networkDetails,
            useCache: false,
          });
        } catch (error) {
          refreshedPositionsError = true;
          captureException(`Error refreshing positions on Account - ${error}`);
        }

        const payload = {
          ...state.data,
          balances: balancesResult,
          isScanAppended: true,
          positions: refreshedPositions,
          // Only surfaced when there is no prior data left to keep showing --
          // otherwise a single flaky tick would flip the Positions tab from
          // rows to an error banner and back every 30s even though the last
          // good read is still sitting right here in `refreshedPositions`.
          // Initial-load failures are untouched: `fetchData` above sets this
          // unconditionally, since there is nothing prior to fall back to.
          hasPositionsError: refreshedPositionsError && !resolvedData.positions,
        } as AccountData;
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      } catch (error) {
        captureException(`Error refreshing balances on Account - ${error}`);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [_isMainnet, state.data, fetchBalances, fetchPositions]);

  return {
    state,
    fetchData,
    refreshAppData,
    refreshBalances,
  };
}

export { useGetAccountData, RequestState };
