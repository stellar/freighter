import { useEffect, useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import { initialState, reducer } from "helpers/request";
import { AppDispatch } from "popup/App";
import {
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { NetworkDetails } from "@shared/constants/stellar";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

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
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const submission = useSelector(transactionSubmissionSelector);
  const {
    transactionSimulation: { preparedTransaction },
  } = submission;

  const submitHwData = async ({
    publicKey,
    networkDetails,
  }: {
    publicKey: string;
    networkDetails: NetworkDetails;
  }) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const payload = {} as ChangeTrustData;
      if (preparedTransaction) {
        const submitResp = await reduxDispatch(
          submitFreighterTransaction({
            publicKey,
            signedXDR: preparedTransaction,
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

  useEffect(() => {
    if (preparedTransaction) {
      submitHwData({ publicKey, networkDetails });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preparedTransaction]);

  return {
    state,
    fetchData,
    submitHwData,
  };
}

export { useGetChangeTrust };
