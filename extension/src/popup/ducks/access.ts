import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  rejectAccess as internalRejectAccess,
  grantAccess as internalGrantAccess,
  addToken as internalAddToken,
  signTransaction as internalSignTransaction,
  signBlob as internalSignBlob,
  signAuthEntry as internalSignAuthEntry,
} from "@shared/api/internal";
import { publicKeySelector } from "popup/ducks/accountServices";
import { AppState } from "popup/App";

export const grantAccess = createAsyncThunk("grantAccess", internalGrantAccess);

export const rejectAccess = createAsyncThunk(
  "rejectAccess",
  internalRejectAccess,
);

export const signTransaction = createAsyncThunk(
  "signTransaction",
  (_, { getState }) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalSignTransaction({ activePublicKey });
  },
);

export const signBlob = createAsyncThunk("signBlob", (_, { getState }) => {
  const activePublicKey = publicKeySelector(getState() as AppState);
  return internalSignBlob({ activePublicKey });
});
export const signEntry = createAsyncThunk("signEntry", (_, { getState }) => {
  const activePublicKey = publicKeySelector(getState() as AppState);
  return internalSignAuthEntry({ activePublicKey });
});

export const addToken = createAsyncThunk("addToken", (_, { getState }) => {
  const activePublicKey = publicKeySelector(getState() as AppState);
  return internalAddToken({ activePublicKey });
});

export const rejectToken = createAsyncThunk(
  "rejectToken",
  internalRejectAccess,
);

// Basically an alias for metrics purposes
export const rejectTransaction = createAsyncThunk(
  "rejectTransaction",
  internalRejectAccess,
);

// Basically an alias for metrics purposes
export const rejectBlob = createAsyncThunk("rejectBlob", internalRejectAccess);
export const rejectAuthEntry = createAsyncThunk(
  "rejectAuthEntry",
  internalRejectAccess,
);
