import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  rejectAccess as internalRejectAccess,
  grantAccess as internalGrantAccess,
  signTransaction as internalSignTransaction,
  signTransactionXDR as internalSignTransactionXDR,
} from "@shared/api/internal";

import { ErrorMessage } from "@shared/api/types";

export const grantAccess = createAsyncThunk("grantAccess", internalGrantAccess);

export const rejectAccess = createAsyncThunk(
  "rejectAccess",
  internalRejectAccess,
);

export const signTransaction = createAsyncThunk(
  "signTransaction",
  internalSignTransaction,
);

// Basically an alias for metrics purposes
export const rejectTransaction = createAsyncThunk(
  "rejectTransaction",
  internalRejectAccess,
);

export const signTransactionXDR = createAsyncThunk<
  { signedTransaction: string },
  { transactionXDR: string; network: string },
  { rejectValue: ErrorMessage }
>("signTransactionXDR", async ({ transactionXDR, network }, thunkApi) => {
  try {
    const res = await internalSignTransactionXDR({ transactionXDR, network });
    return res;
  } catch (e) {
    console.error("Failed to submit transaction", e.message);
    return thunkApi.rejectWithValue({
      errorMessage: e.message,
    });
  }
});
