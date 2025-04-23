import { useReducer } from "react";

import { BlockAidScanTxResult } from "@shared/api/types";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useScanTx } from "popup/helpers/blockaid";
import { useGetAppData } from "helpers/hooks/useGetAppData";
import { isMainnet } from "helpers/stellar";

interface SignTxData {
  scanResult: BlockAidScanTxResult | null;
  balances: AccountBalances;
}

function useGetSignTxData(
  scanOptions: {
    xdr: string;
    url: string;
  },
  balanceOptions: {
    showHidden: boolean;
    includeIcons: boolean;
  },
) {
  const [state, dispatch] = useReducer(
    reducer<SignTxData, unknown>,
    initialState,
  );

  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(balanceOptions);
  const { scanTx } = useScanTx();

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData();
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;
      const isMainnetNetwork = isMainnet(networkDetails);
      const balancesResult = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
      );
      const scanResult = await scanTx(
        scanOptions.xdr,
        scanOptions.url,
        networkDetails,
      );

      if (isError<AccountBalances>(balancesResult)) {
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
