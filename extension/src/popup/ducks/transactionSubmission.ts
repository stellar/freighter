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

interface TransactionData {
  amount: string;
  asset: string;
  destination: string;
  transactionFee: string;
  memo: string;
}

interface InitialState {
  status: string;
  response: Horizon.TransactionResponse | null;
  error: ErrorMessage | undefined;
  transactionData: TransactionData;
}

const initialState: InitialState = {
  status: ActionStatus.IDLE,
  response: null,
  error: undefined,
  transactionData: {
    amount: "",
    asset: "native",
    destination: "",
    // TODO - use lumens instead of stroops
    transactionFee: "100",
    memo: "",
  },
};

const transactionSubmissionSlice = createSlice({
  name: "transactionSubmission",
  initialState,
  reducers: {
    saveDestination: (state, action) => {
      state.transactionData.destination = action.payload;
    },
    // TODO - add for each field
  },
  extraReducers: (builder) => {
    builder.addCase(submitFreighterTransaction.pending, (state) => {
      state.status = ActionStatus.PENDING;
    });
    builder.addCase(submitFreighterTransaction.fulfilled, (state, action) => {
      state.status = ActionStatus.SUCCESS;
      state.response = action.payload;
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

export const { saveDestination } = transactionSubmissionSlice.actions;
export const { reducer } = transactionSubmissionSlice;

export const transactionSubmissionSelector = (state: {
  transactionSubmission: InitialState;
}) => state.transactionSubmission;

export const transactionDataSelector = (state: {
  transactionSubmission: InitialState;
}) => state.transactionSubmission.transactionData;
