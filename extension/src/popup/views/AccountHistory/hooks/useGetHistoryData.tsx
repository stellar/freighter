import { useReducer } from "react";
import { Horizon } from "stellar-sdk";

import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { HistoryResponse, useGetHistory } from "helpers/hooks/useGetHistory";
import { HistoryItemOperation } from "popup/components/accountHistory/HistoryItem";
import {
  getIsCreateClaimableBalanceSpam,
  getIsDustPayment,
  getIsPayment,
  getIsSwap,
} from "popup/helpers/account";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { isMainnet } from "helpers/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { HorizonOperation } from "@shared/api/types";

export type HistorySection = {
  monthYear: string; // in format {month}:{year}
  operations: HistoryItemOperation[];
};

const createHistorySections = (
  publicKey: string,
  operations: HorizonOperation[],
  isHideDustEnabled: boolean,
) =>
  operations.reduce(
    (sections: HistorySection[], operation: HorizonOperation) => {
      const isPayment = getIsPayment(operation.type);
      const isSwap = getIsSwap(operation);
      const isCreateExternalAccount =
        operation.type ===
          Horizon.HorizonApi.OperationResponseType.createAccount &&
        operation.account !== publicKey;
      const isDustPayment = getIsDustPayment(publicKey, operation);

      const parsedOperation = {
        ...operation,
        isPayment,
        isSwap,
        isCreateExternalAccount,
      };

      if (isDustPayment && isHideDustEnabled) {
        return sections;
      }

      if (getIsCreateClaimableBalanceSpam(operation)) {
        return sections;
      }

      const date = new Date(operation.created_at);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthYear = `${month}:${year}`;

      const lastSection = sections.length > 0 && sections[sections.length - 1];

      // if we have no sections yet, let's create the first one
      if (!lastSection) {
        return [{ monthYear, operations: [parsedOperation] }];
      }

      // if element belongs to this section let's add it right away
      if (lastSection.monthYear === monthYear) {
        lastSection.operations.push(parsedOperation);
        return sections;
      }

      // otherwise let's add a new section at the bottom of the array
      return [...sections, { monthYear, operations: [parsedOperation] }];
    },
    [] as HistorySection[],
  );

interface ResolvedData {
  type: AppDataType.RESOLVED;
  balances: AccountBalances;
  history: HistorySection[];
  publicKey: string;
  applicationState: APPLICATION_STATE;
}

type HistoryData = ResolvedData | NeedsReRoute;

function useGetHistoryData(
  balanceOptions: {
    showHidden: boolean;
    includeIcons: boolean;
  },
  historyOptions: {
    isHideDustEnabled: boolean;
  },
) {
  const [state, dispatch] = useReducer(
    reducer<HistoryData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(balanceOptions);
  const { fetchData: fetchHistory } = useGetHistory();

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData();
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
        balances: balancesResult,
        applicationState: appData.account.applicationState,
        history: createHistorySections(
          publicKey,
          history,
          historyOptions.isHideDustEnabled,
        ),
      } as ResolvedData;
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

export { useGetHistoryData };
