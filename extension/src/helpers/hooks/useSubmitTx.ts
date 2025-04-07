import { useReducer } from "react";
import { HorizonApi } from "stellar-sdk/lib/horizon";

import { submitFreighterTransaction } from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
// eslint-disable-next-line import/no-unresolved
import { initialState, reducer } from "helpers/request";

export type SubmitTxResponse = HorizonApi.SubmitTransactionResponse;

function useSubmitTx(networkDetails: NetworkDetails) {
  const [state, dispatch] = useReducer(
    reducer<SubmitTxResponse, unknown>,
    initialState,
  );

  const submitTx = async (
    signedXDR: string,
  ): Promise<SubmitTxResponse | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const data = await submitFreighterTransaction({
        signedXDR,
        networkDetails,
      });
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: data });
      // if (!isSwap) {
      //   await dispatch(
      //     addRecentAddress({ publicKey: federationAddress || destination }),
      //   );
      // }
      return data;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error("Failed to fetch history", { cause: error });
    }
  };

  return {
    state,
    submitTx,
  };
}

export { useSubmitTx };
