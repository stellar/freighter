import { createAsyncThunk } from "@reduxjs/toolkit";
import { ActionStatus, ErrorMessage } from "@shared/api/types";
import { INDEXER_URL } from "@shared/constants/mercury";
import { SorobanRpc } from "stellar-sdk";

export const simulateTokenPayment = createAsyncThunk<
  {
    preparedTransaction: string;
    simulationTransaction: SorobanRpc.Api.SimulateTransactionSuccessResponse;
  },
  {
    address: string;
    pub_key: string;
    memo: string;
    params: {
      publicKey: string;
      destination: string;
      amount: number;
    };
    network_url: string;
    network_passphrase: string;
  },
  {
    rejectValue: ErrorMessage;
  }
>("simulateTokenPayment", async (args, thunkApi) => {
  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    };
    const res = await fetch(`${INDEXER_URL}/simulate-token-transfer`, options);
    const response = await res.json();

    if (!res.ok) {
      return thunkApi.rejectWithValue({
        errorMessage: response,
      });
    }
    return response;
  } catch (e) {
    return thunkApi.rejectWithValue({
      errorMessage: e.message || e,
      response: e.response?.data,
    });
  }
});

interface InitialState {
  preparedTransaction: string | null;
  simulationTransaction: SorobanRpc.Api.SimulateTransactionSuccessResponse | null;
  simStatus: ActionStatus;
}

export const initialState: InitialState = {
  preparedTransaction: null,
  simulationTransaction: null,
  simStatus: ActionStatus.IDLE,
};
