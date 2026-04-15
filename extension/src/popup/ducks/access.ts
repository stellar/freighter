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

export const grantAccess = createAsyncThunk(
  "grantAccess",
  ({ url, uuid }: { url: string; uuid: string }) =>
    internalGrantAccess({ url, uuid }),
);

export const rejectAccess = createAsyncThunk(
  "rejectAccess",
  ({ uuid }: { uuid: string }) => internalRejectAccess({ uuid }),
);

export const signTransaction = createAsyncThunk(
  "signTransaction",
  ({ uuid }: { uuid: string }, { getState }) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalSignTransaction({ activePublicKey, uuid });
  },
);

export const signBlob = createAsyncThunk(
  "signBlob",
  (
    { apiVersion, uuid }: { apiVersion?: string; uuid: string },
    { getState },
  ) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalSignBlob({ apiVersion, activePublicKey, uuid });
  },
);
export const signEntry = createAsyncThunk(
  "signEntry",
  ({ uuid }: { uuid: string }, { getState }) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalSignAuthEntry({ activePublicKey, uuid });
  },
);

export const addToken = createAsyncThunk(
  "addToken",
  ({ uuid }: { uuid: string }, { getState }) => {
    const activePublicKey = publicKeySelector(getState() as AppState);
    return internalAddToken({ activePublicKey, uuid });
  },
);

export const rejectToken = createAsyncThunk(
  "rejectToken",
  ({ uuid }: { uuid: string }) => internalRejectAccess({ uuid }),
);

export const rejectTransaction = createAsyncThunk(
  "rejectTransaction",
  ({ uuid }: { uuid: string }) => internalRejectAccess({ uuid }),
);

export const rejectBlob = createAsyncThunk(
  "rejectBlob",
  ({ uuid }: { uuid: string }) => internalRejectAccess({ uuid }),
);
export const rejectAuthEntry = createAsyncThunk(
  "rejectAuthEntry",
  ({ uuid }: { uuid: string }) => internalRejectAccess({ uuid }),
);
