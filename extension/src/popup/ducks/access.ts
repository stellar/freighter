import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  rejectAccess as internalRejectAccess,
  grantAccess as internalGrantAccess,
  signTransaction as internalSignTransaction,
  signBlob as internalSignBlob,
  signAuthEntry as internalSignAuthEntry,
} from "@shared/api/internal";

export const grantAccess = createAsyncThunk("grantAccess", internalGrantAccess);

export const rejectAccess = createAsyncThunk(
  "rejectAccess",
  internalRejectAccess,
);

export const signTransaction = createAsyncThunk(
  "signTransaction",
  internalSignTransaction,
);

export const signBlob = createAsyncThunk("signBlob", internalSignBlob);
export const signEntry = createAsyncThunk("signEntry", internalSignAuthEntry);

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
