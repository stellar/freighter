import { Horizon } from "stellar-sdk";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  signFreighterTransaction as internalSignFreighterTransaction,
  submitFreighterTransaction as internalSubmitFreighterTransaction,
} from "@shared/api/internal";

import { ErrorMessage } from "@shared/api/types";

export const signFreighterTransaction = createAsyncThunk<
  { signedTransaction: string },
  { transactionXDR: string; network: string },
  { rejectValue: ErrorMessage }
>("signFreighterTransaction", async ({ transactionXDR, network }, thunkApi) => {
  try {
    const res = await internalSignFreighterTransaction({
      transactionXDR,
      network,
    });
    return res;
  } catch (e) {
    return thunkApi.rejectWithValue({
      errorMessage: e,
    });
  }
});

export const submitFreighterTransaction = createAsyncThunk<
  Horizon.TransactionResponse,
  { signedXDR: string; networkUrl: string },
  { rejectValue: ErrorMessage }
>("submitFreighterTransaction", async ({ signedXDR, networkUrl }, thunkApi) => {
  try {
    const res = await internalSubmitFreighterTransaction({
      signedXDR,
      networkUrl,
    });
    return res;
  } catch (e) {
    return thunkApi.rejectWithValue({ errorMessage: e });
  }
});

export enum ActionStatus {
  IDLE = "IDLE",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

interface InitialState {
  status: string;
  data: Horizon.TransactionResponse | null;
  error: ErrorMessage | undefined;
}

const initialState: InitialState = {
  status: ActionStatus.IDLE,
  data: null,
  error: undefined,
};

const transactionSubmissionSlice = createSlice({
  name: "transactionSubmission",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(submitFreighterTransaction.pending, (state) => {
      state.status = ActionStatus.PENDING;
    });
    builder.addCase(submitFreighterTransaction.fulfilled, (state, action) => {
      state.status = ActionStatus.SUCCESS;
      state.data = action.payload;
    });
    builder.addCase(submitFreighterTransaction.rejected, (state, action) => {
      state.status = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(signFreighterTransaction.rejected, (state, action) => {
      state.status = ActionStatus.ERROR;
      state.error = action.payload;
    });
  },
});

export const { reducer } = transactionSubmissionSlice;

export const transactionSubmissionSelector = (state: {
  transactionSubmission: InitialState;
}) => state.transactionSubmission;
