import { useReducer } from "react";

import { signFreighterTransaction } from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
// eslint-disable-next-line import/no-unresolved
import { initialState, reducer } from "helpers/request";
// import { hardwareSign, hardwareSignAuth } from "popup/helpers/hardwareConnect";

export type SignTxResponse = {
  signedTransaction: string;
};

function useSignTx(activePublicKey: string, networkDetails: NetworkDetails) {
  const [state, dispatch] = useReducer(
    reducer<SignTxResponse, unknown>,
    initialState,
  );

  const signTx = async (
    transactionXDR: string,
  ): Promise<SignTxResponse | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const data = await signFreighterTransaction({
        transactionXDR,
        network: networkDetails.networkPassphrase,
        activePublicKey,
      });
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: data });
      return data;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error("Failed to fetch history", { cause: error });
    }
  };

  return {
    state,
    signTx,
  };
}

export { useSignTx };
