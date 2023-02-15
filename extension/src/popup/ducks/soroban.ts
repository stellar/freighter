import * as SorobanClient from "soroban-client";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { getSorobanTokenBalances as internalGetSorobanTokenBalances } from "@shared/api/internal";
import { ErrorMessage, RequestStatus } from "@shared/api/types";

type TokenBalances = any;

export const getTokenBalances = createAsyncThunk<
  TokenBalances,
  {
    server: SorobanClient.Server;
    contractId: string;
    txBuilder: SorobanClient.TransactionBuilder;
    params: SorobanClient.xdr.ScVal[];
  },
  { rejectValue: ErrorMessage }
>(
  "getTokenBalances",
  async ({ server, contractId, txBuilder, params }, thunkApi) => {
    try {
      const _server = server as any; // ??
      const res = await internalGetSorobanTokenBalances(
        _server,
        contractId,
        txBuilder,
        params,
      );
      console.log(res);
      return res;
    } catch (e) {
      console.log(e);
      return thunkApi.rejectWithValue({ errorMessage: e as string });
    }
  },
);

const initialState = {
  getTokenBalancesStatus: RequestStatus.IDLE,
  tokenBalances: [],
};

const sorobanSlice = createSlice({
  name: "soroban",
  initialState,
  reducers: {
    reset: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(getTokenBalances.pending, (state) => {
      state.getTokenBalancesStatus = RequestStatus.PENDING;
    });
    builder.addCase(getTokenBalances.rejected, (state) => {
      state.getTokenBalancesStatus = RequestStatus.ERROR;
    });
    builder.addCase(getTokenBalances.fulfilled, (state, action) => {
      state.tokenBalances = action.payload;
      state.getTokenBalancesStatus = RequestStatus.SUCCESS;
    });
  },
});

export const { reset } = sorobanSlice.actions;

export const { reducer } = sorobanSlice;

export const sorobanSelector = (state: { soroban: typeof initialState }) =>
  state.soroban;
