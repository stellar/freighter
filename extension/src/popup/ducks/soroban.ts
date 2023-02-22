import BigNumber from "bignumber.js";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  getSorobanTokenBalance as internalGetSorobanTokenBalance,
  loadAccount as internalLoadAccount,
  getTokenIds as internalGetTokenIds,
} from "@shared/api/internal";
import { ErrorMessage, ActionStatus, TokenBalances } from "@shared/api/types";
import { accountIdentifier } from "@shared/api/helpers/soroban";
import { SororbanContext } from "popup/SorobanContext";

export const getTokenBalances = createAsyncThunk<
  TokenBalances,
  { sorobanClient: SororbanContext },
  { rejectValue: ErrorMessage }
>("getTokenBalances", async ({ sorobanClient }, thunkApi) => {
  try {
    const { publicKey } = await internalLoadAccount();
    const tokenIdList = await internalGetTokenIds();

    const params = [accountIdentifier(publicKey)];

    const results = await Promise.all(
      tokenIdList.map(async (tokenId) => {
        /*
          Right now, Soroban transactions only support 1 operation per tx
          so we need a builder per value from the contract,
          once multi-op transactions are supported this can send
          1 tx with an operation for each value.
        */
        const { balance, ...rest } = await internalGetSorobanTokenBalance(
          sorobanClient.server,
          tokenId,
          {
            balance: sorobanClient.newTxBuilder(),
            name: sorobanClient.newTxBuilder(),
            decimals: sorobanClient.newTxBuilder(),
            symbol: sorobanClient.newTxBuilder(),
          },
          params,
        );
        const total = new BigNumber(balance);
        return {
          contractId: tokenId,
          total,
          ...rest,
        };
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
