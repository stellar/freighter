import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
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
    publicKey: string;
    memo: string;
    params: {
      publicKey: string;
      destination: string;
      amount: number;
    };
    networkUrl: string;
    networkPassphrase: string;
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
      body: JSON.stringify({
        address: args.address,
        pub_key: args.publicKey,
        memo: args.memo,
        params: args.params,
        network_url: args.networkUrl,
        network_passphrase: args.networkPassphrase,
      }),
    };
    const res = await fetch(`${INDEXER_URL}/simulate-token-transfer`, options);
    const response = await res.json();

    if (!res.ok) {
      return thunkApi.rejectWithValue({
        errorMessage: response.message,
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
  error: ErrorMessage | undefined;
  simulation: {
    preparedTransaction: string | null;
    simulationTransaction: SorobanRpc.Api.SimulateTransactionSuccessResponse | null;
  };
  simStatus: ActionStatus;
}

export const initialState: InitialState = {
  error: undefined,
  simulation: {
    preparedTransaction: null,
    simulationTransaction: null,
  },
  simStatus: ActionStatus.IDLE,
};

const tokenPaymentsSimulationSlice = createSlice({
  name: "tokenPaymentSimulation",
  initialState,
  reducers: {
    resetSimulation: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(simulateTokenPayment.pending, (state) => {
      state.simStatus = ActionStatus.PENDING;
    });
    builder.addCase(simulateTokenPayment.rejected, (state, action) => {
      state.simStatus = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(simulateTokenPayment.fulfilled, (state, action) => {
      state.simStatus = ActionStatus.SUCCESS;
      state.simulation = action.payload;
    });
  },
});

export const { resetSimulation } = tokenPaymentsSimulationSlice.actions;
export const { reducer } = tokenPaymentsSimulationSlice;

export const tokenSimulationSelector = (state: {
  tokenPaymentSimulation: InitialState;
}) => state.tokenPaymentSimulation;

export const tokenSimulationStatusSelector = (state: {
  tokenPaymentSimulation: InitialState;
}) => state.tokenPaymentSimulation.simStatus;

export const tokenSimulationErrorSelector = (state: {
  tokenPaymentSimulation: InitialState;
}) => state.tokenPaymentSimulation.error;
