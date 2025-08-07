import { useReducer } from "react";
import { useDispatch } from "react-redux";

import { initialState, reducer } from "helpers/request";
import { AppDispatch } from "popup/App";
import {
  signFreighterTransaction,
  submitFreighterTransaction,
} from "popup/ducks/transactionSubmission";
import { NetworkDetails } from "@shared/constants/stellar";

export interface ChangeTrustData {
  status: "success" | "error";
  txHash?: string;
  error?: string;
}

function useGetChangeTrust() {
  const [state, dispatch] = useReducer(
    reducer<ChangeTrustData, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();

  const fetchData = async ({
    publicKey,
    xdr,
    networkDetails,
  }: {
    publicKey: string;
    xdr: string;
    networkDetails: NetworkDetails;
  }) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const payload = {} as ChangeTrustData;

      const res = await reduxDispatch(
        signFreighterTransaction({
          transactionXDR: xdr,
          network: networkDetails.networkPassphrase,
        }),
      );

      if (signFreighterTransaction.rejected.match(res)) {
        throw new Error("failed to sign transaction");
      }

      if (signFreighterTransaction.fulfilled.match(res)) {
        const submitResp = await reduxDispatch(
          submitFreighterTransaction({
            publicKey,
            signedXDR: res.payload.signedTransaction,
            networkDetails,
          }),
        );

        if (submitFreighterTransaction.rejected.match(submitResp)) {
          throw new Error("failed to submit transaction");
        }

        if (submitFreighterTransaction.fulfilled.match(submitResp)) {
          payload.status = "success";
          payload.txHash = submitResp.payload.hash;
        }
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      dispatch({
        type: "FETCH_DATA_ERROR",
        payload: { status: "error", error: errorMessage },
      });

      return { status: "error", error: errorMessage } as ChangeTrustData;
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetChangeTrust };
