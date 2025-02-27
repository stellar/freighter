import { useReducer } from "react";
import { Horizon } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { initialState, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useGetHistory } from "helpers/hooks/useGetHistory";
import { HistoryItemOperation } from "popup/components/accountHistory/HistoryItem";
import {
  getIsDustPayment,
  getIsPayment,
  getIsSwap,
} from "popup/helpers/account";

export type HistorySection = {
  monthYear: string; // in format {month}:{year}
  operations: HistoryItemOperation[];
};

interface HistoryData {
  balances: AccountBalances;
  history: HistorySection[];
}

const createHistorySections = (
  publicKey: string,
  operations: Horizon.ServerApi.OperationRecord[],
  isHideDustEnabled: boolean,
) =>
  operations.reduce(
    (
      sections: HistorySection[],
      operation: Horizon.ServerApi.OperationRecord,
    ) => {
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

function useGetHistoryData(
  publicKey: string,
  networkDetails: NetworkDetails,
  balanceOptions: {
    isMainnet: boolean;
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
  const { fetchData: fetchBalances } = useGetBalances(
    publicKey,
    networkDetails,
    balanceOptions,
  );
  const { fetchData: fetchHistory } = useGetHistory(publicKey, networkDetails);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const balancesResult = await fetchBalances();
      const history = await fetchHistory();

      // TODO: make type narrow functions
      if (!("balances" in balancesResult)) {
        throw new Error(balancesResult.message);
      }

      const payload = {
        balances: balancesResult,
        history: createHistorySections(
          publicKey,
          history,
          historyOptions.isHideDustEnabled,
        ),
      };
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
