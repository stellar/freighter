import { useEffect, useReducer, useState } from "react";
import { captureException } from "@sentry/browser";

import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { getCanonicalFromAsset, isMainnet } from "helpers/stellar";
import { getTokenPrices as internalGetTokenPrices } from "@shared/api/internal";
import { AllowList, ApiTokenPrices } from "@shared/api/types";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "popup/App";
import { makeAccountActive } from "popup/ducks/accountServices";
import { changeNetwork } from "popup/ducks/settings";
import { balancesSelector } from "popup/ducks/cache";

export const getTokenPrices = async ({
  balances,
}: {
  balances: AccountBalances["balances"];
}) => {
  const assetIds = balances
    .filter((balance) => "token" in balance)
    .map((balance) =>
      getCanonicalFromAsset(
        balance.token.code,
        "issuer" in balance.token ? balance.token.issuer.key : undefined,
      ),
    );
  if (!assetIds.length) {
    return {};
  }
  const tokenPrices = await internalGetTokenPrices(assetIds);
  return tokenPrices;
};

interface ResolvedAccountData {
  allowList: AllowList;
  type: AppDataType.RESOLVED;
  balances: AccountBalances;
  tokenPrices?: ApiTokenPrices | null;
  networkDetails: NetworkDetails;
  publicKey: string;
  applicationState: APPLICATION_STATE;
  isScanAppended: boolean;
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
  const cachedBalances = useSelector(balancesSelector);

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

      const appData = await fetchAppData(useAppDataCache);
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

      const balancesResult = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
        !shouldForceBalancesRefresh,
        true,
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
      } as ResolvedAccountData;

      if (isMainnetNetwork) {
        try {
          payload.tokenPrices = await getTokenPrices({
            balances: balancesResult.balances,
          });
          setIsMainnet(isMainnetNetwork);
        } catch (e) {
          payload.tokenPrices = null;
        }
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });

      if (isMainnetNetwork) {
        try {
          const balancesResult = await fetchBalances(
            publicKey,
            isMainnetNetwork,
            networkDetails,
            false,
            false,
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

  useEffect(() => {
    if (!state.data || state.data.type === AppDataType.REROUTE || !_isMainnet) {
      return;
    }
    const resolvedData = state.data;

    const interval = setInterval(async () => {
      try {
        const tokenPrices = await getTokenPrices({
          balances: resolvedData.balances.balances,
        });
        const payload = {
          ...state.data,
          tokenPrices,
        } as AccountData;
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      } catch (error) {
        captureException(`Error refreshing token prices on Account - ${error}`);
      }
    }, 30000);
    return () => clearInterval(interval);
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

  useEffect(() => {
    // if it's been 2 minutes since the last balance update, force update
    if (!state.data || state.data.type === AppDataType.REROUTE) {
      return;
    }
    const resolvedData = state.data;

    const publicKey = resolvedData.publicKey;
    const networkDetails = resolvedData.networkDetails;

    const refreshBalances = async () => {
      try {
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
        captureException(
          `Error refreshing cache balances on Account - ${error}`,
        );
      }
    };

    if (
      cachedBalances[networkDetails.network]?.[publicKey]?.updatedAt &&
      cachedBalances[networkDetails.network]?.[publicKey]?.updatedAt <
        Date.now() - 120000
    ) {
      // force update
      refreshBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data, cachedBalances]);

  return {
    state,
    fetchData,
    refreshAppData,
  };
}

export { useGetAccountData, RequestState };
