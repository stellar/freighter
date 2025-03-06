import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { BlockAidScanTxResult } from "@shared/api/types";

import { initialState, reducer } from "helpers/request";
import {
  AccountBalances,
  isGetBalancesError,
  useGetBalances,
} from "helpers/hooks/useGetBalances";
import { useScanTx } from "popup/helpers/blockaid";

interface SignTxData {
  scanResult: BlockAidScanTxResult | null;
  balances: AccountBalances;
}

function useGetSignTxData(
  publicKey: string,
  networkDetails: NetworkDetails,
  scanOptions: {
    xdr: string;
    url: string;
  },
  balanceOptions: {
    isMainnet: boolean;
    showHidden: boolean;
    includeIcons: boolean;
  },
) {
  const [state, dispatch] = useReducer(
    reducer<SignTxData, unknown>,
    initialState,
  );
  const { fetchData: fetchBalances } = useGetBalances(
    publicKey,
    networkDetails,
    balanceOptions,
  );
  const { scanTx } = useScanTx();

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const balancesResult = await fetchBalances();
      const scanResult = await scanTx(
        scanOptions.xdr,
        scanOptions.url,
        networkDetails,
      );

      if (isGetBalancesError(balancesResult)) {
        throw new Error(balancesResult.message);
      }
      const payload = { balances: balancesResult, scanResult };
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

export { useGetSignTxData };
