import * as SorobanClient from "soroban-client";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { getSorobanTokenBalance as internalGetSorobanTokenBalance } from "@shared/api/internal";
import { ErrorMessage, ActionStatus } from "@shared/api/types";

type TokenBalances = Record<string, string | number>[];

export const getTokenBalances = createAsyncThunk<
  TokenBalances,
  {
    server: SorobanClient.Server;
    operations: {
      contractId: string;
      params: SorobanClient.xdr.ScVal[];
      txBuilders: {
        // see notes for getSorobanTokenBalance in @shared/api/internals
        balance: SorobanClient.TransactionBuilder;
        name: SorobanClient.TransactionBuilder;
        decimals: SorobanClient.TransactionBuilder;
        symbol: SorobanClient.TransactionBuilder;
      };
    }[];
  },
  { rejectValue: ErrorMessage }
>("getTokenBalances", async ({ server, operations }, thunkApi) => {
  try {
    const results = await Promise.all(
      operations.map(async ({ contractId, params, txBuilders }) => {
        const res = await internalGetSorobanTokenBalance(
          server,
          contractId,
          txBuilders,
          params,
        );
        return res;
      }),
    );

    return results;
  } catch (e) {
    console.log(e);
    return thunkApi.rejectWithValue({ errorMessage: e as string });
  }
});

const initialState = {
  getTokenBalancesStatus: ActionStatus.IDLE,
  tokenBalances: [] as TokenBalances,
};

const sorobanSlice = createSlice({
  name: "soroban",
  initialState,
  reducers: {
    resetSorobanTokens: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(getTokenBalances.pending, (state) => {
      state.getTokenBalancesStatus = ActionStatus.PENDING;
    });
    builder.addCase(getTokenBalances.rejected, (state) => {
      state.getTokenBalancesStatus = ActionStatus.ERROR;
    });
    builder.addCase(getTokenBalances.fulfilled, (state, action) => {
      state.tokenBalances = action.payload;
      state.getTokenBalancesStatus = ActionStatus.SUCCESS;
    });
  },
});

export const { resetSorobanTokens } = sorobanSlice.actions;

export const { reducer } = sorobanSlice;

export const sorobanSelector = (state: { soroban: typeof initialState }) =>
  state.soroban;
