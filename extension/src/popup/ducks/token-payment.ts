import { SorobanRpc } from "stellar-sdk";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ActionStatus, ErrorMessage } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

import { buildAndSimulateSoroswapTx } from "popup/helpers/sorobanSwap";

export const simulateSwap = createAsyncThunk<
  {
    preparedTransaction: string;
    simulationTransaction: SorobanRpc.Api.SimulateTransactionSuccessResponse;
  },
  {
    networkDetails: NetworkDetails;
    publicKey: string;
    amountIn: string;
    amountInDecimals: number;
    amountOut: string;
    amountOutDecimals: number;
    memo?: string;
    transactionFee: string;
    path: string[];
  },
  {
    rejectValue: ErrorMessage;
  }
>(
  "simulateSwap",
  async (
    {
      networkDetails,
      publicKey,
      amountIn,
      amountInDecimals,
      amountOut,
      amountOutDecimals,
      memo,
      transactionFee,
      path,
    },
    thunkApi,
  ) => {
    try {
      const sim = await buildAndSimulateSoroswapTx({
        networkDetails,
        publicKey,
        amountIn,
        amountInDecimals,
        amountOut,
        amountOutDecimals,
        memo,
        transactionFee,
        path,
      });

      return sim;
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return thunkApi.rejectWithValue({
        errorMessage: message,
      });
    }
  },
);

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
    builder.addCase(simulateSwap.pending, (state) => {
      state.simStatus = ActionStatus.PENDING;
    });
    builder.addCase(simulateSwap.rejected, (state, action) => {
      state.simStatus = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(simulateSwap.fulfilled, (state, action) => {
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
