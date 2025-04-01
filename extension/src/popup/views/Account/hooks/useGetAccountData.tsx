import { useEffect, useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { HistoryResponse, useGetHistory } from "helpers/hooks/useGetHistory";
import { AssetOperations, sortOperationsByAsset } from "popup/helpers/account";
import { getCanonicalFromAsset } from "helpers/stellar";
import { getTokenPrices as internalGetTokenPrices } from "@shared/api/internal";
import { ApiTokenPrices } from "@shared/api/types";

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

interface AccountData {
  balances: AccountBalances;
  operationsByAsset: AssetOperations;
  tokenPrices?: ApiTokenPrices;
}

function useGetAccountData(
  publicKey: string,
  networkDetails: NetworkDetails,
  options: {
    isMainnet: boolean;
    showHidden: boolean;
    includeIcons: boolean;
  },
) {
  const [state, dispatch] = useReducer(
    reducer<AccountData, unknown>,
    initialState,
  );
  const { fetchData: fetchBalances } = useGetBalances(
    publicKey,
    networkDetails,
    options,
  );
  const { fetchData: fetchHistory } = useGetHistory(publicKey, networkDetails);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const balancesResult = await fetchBalances();
      const history = await fetchHistory();

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      if (isError<HistoryResponse>(history)) {
        throw new Error(history.message);
      }

      const payload = {
        balances: balancesResult,
        operationsByAsset: sortOperationsByAsset({
          balances: balancesResult.balances,
          operations: history,
          networkDetails,
          publicKey,
        }),
      } as AccountData;

      if (options.isMainnet) {
        payload.tokenPrices = await getTokenPrices({
          balances: balancesResult.balances,
        });
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  useEffect(() => {
    if (!options.isMainnet || !state.data?.balances) {
      return;
    }

    const interval = setInterval(async () => {
      const tokenPrices = await getTokenPrices({
        balances: state.data.balances.balances,
      });
      const payload = {
        ...state.data,
        tokenPrices,
      } as AccountData;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
    }, 30000);

    return () => clearInterval(interval);
  }, [options.isMainnet, state.data]);

  return {
    state,
    fetchData,
  };
}

export { useGetAccountData, RequestState };
