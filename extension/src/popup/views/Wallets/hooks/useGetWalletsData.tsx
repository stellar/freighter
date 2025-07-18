import { useReducer } from "react";

import { Account } from "@shared/api/types";
import { initialState, isError, reducer } from "helpers/request";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { isMainnet } from "helpers/stellar";
import { getAccountBalances } from "@shared/api/internal";
import { sortBalances } from "popup/helpers/account";
import { getTokenPrices } from "popup/views/Account/hooks/useGetAccountData";
import { getTotalUsd } from "popup/helpers/balance";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";

export interface ResolvedData {
  type: AppDataType.RESOLVED;
  publicKey: string;
  allAccounts: Account[];
  accountValue?: {
    [key: string]: string;
  };
  applicationState: APPLICATION_STATE;
}

type GetWalletsData = NeedsReRoute | ResolvedData;

function useGetWalletsData() {
  const [state, dispatch] = useReducer(
    reducer<GetWalletsData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData(false);
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const allAccounts = appData.account.allAccounts;
      const networkDetails = appData.settings.networkDetails;
      const isMainnetNetwork = isMainnet(networkDetails);

      const payload = {
        type: AppDataType.RESOLVED,
        publicKey,
        allAccounts,
        applicationState: appData.account.applicationState,
      } as ResolvedData;

      if (isMainnetNetwork) {
        const prices = await Promise.all(
          allAccounts.map(async (account) => {
            const { balances } = await getAccountBalances(
              account.publicKey,
              networkDetails,
              isMainnetNetwork,
            );
            const sortedBalances = sortBalances(balances);
            const prices = await getTokenPrices({
              balances: sortedBalances,
            });
            const totalPriceUsd = getTotalUsd(prices, sortedBalances);
            return {
              [account.publicKey]: `$${formatAmount(roundUsdValue(totalPriceUsd.toString()))}`,
            };
          }),
        );
        const pricesMap: { [key: string]: string } = prices.reduce(
          (acc, curr) => {
            return { ...acc, ...curr };
          },
          {},
        );
        payload.accountValue = pricesMap;
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetWalletsData };
