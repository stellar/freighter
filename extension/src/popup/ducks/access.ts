import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  rejectAccess as internalRejectAccess,
  grantAccess as internalGrantAccess,
  signTransaction as internalSignTransaction,
} from "@lyra/api/internal";

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
