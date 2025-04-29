import { useEffect, useReducer, useState } from "react";

import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { HistoryResponse, useGetHistory } from "helpers/hooks/useGetHistory";
import { AssetOperations, sortOperationsByAsset } from "popup/helpers/account";
import { getCanonicalFromAsset, isMainnet } from "helpers/stellar";
import { getTokenPrices as internalGetTokenPrices } from "@shared/api/internal";
import { ApiTokenPrices } from "@shared/api/types";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

const getTokenPrices = async ({
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
  type: AppDataType.RESOLVED;
  balances: AccountBalances;
  operationsByAsset: AssetOperations;
  tokenPrices?: ApiTokenPrices;
  networkDetails: NetworkDetails;
  publicKey: string;
  applicationState: APPLICATION_STATE;
}

type AccountData = NeedsReRoute | ResolvedAccountData;

function useGetAccountData(options: {
  showHidden: boolean;
  includeIcons: boolean;
}) {
  const [_isMainnet, setIsMainnet] = useState(false);
  const [state, dispatch] = useReducer(
    reducer<AccountData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(options);
  const { fetchData: fetchHistory } = useGetHistory();

  const fetchData = async (useAppDataCache = true) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
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
      const isMainnetNetwork = isMainnet(networkDetails);
      const balancesResult = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
      );
      const history = await fetchHistory(publicKey, networkDetails);

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      if (isError<HistoryResponse>(history)) {
        throw new Error(history.message);
      }

      const payload = {
        type: AppDataType.RESOLVED,
        publicKey,
        applicationState: appData.account.applicationState,
        balances: balancesResult,
        networkDetails,
        operationsByAsset: sortOperationsByAsset({
          balances: balancesResult.balances,
          operations: history,
          networkDetails: networkDetails,
          publicKey,
        }),
      } as ResolvedAccountData;

      if (isMainnetNetwork) {
        payload.tokenPrices = await getTokenPrices({
          balances: balancesResult.balances,
        });
        setIsMainnet(isMainnetNetwork);
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  useEffect(() => {
    if (!state.data || state.data.type === "re-route" || !_isMainnet) {
      return;
    }
    const resolvedData = state.data;

    const interval = setInterval(async () => {
      const tokenPrices = await getTokenPrices({
        balances: resolvedData.balances.balances,
      });
      const payload = {
        ...state.data,
        tokenPrices,
      } as AccountData;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
    }, 30000);
    return () => clearInterval(interval);
  }, [_isMainnet, state.data]);

  return {
    state,
    fetchData,
  };
}

export { useGetAccountData, RequestState };
