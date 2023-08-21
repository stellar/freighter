import { Address } from "soroban-client";
import BigNumber from "bignumber.js";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  getSorobanTokenBalance as internalGetSorobanTokenBalance,
  loadAccount as internalLoadAccount,
  getTokenIds as internalGetTokenIds,
} from "@shared/api/internal";
import { ErrorMessage, ActionStatus, TokenBalances } from "@shared/api/types";
import { SorobanContextInterface } from "popup/SorobanContext";

export const getTokenBalances = createAsyncThunk<
  TokenBalances,
  { sorobanClient: SorobanContextInterface },
  { rejectValue: ErrorMessage }
>("getTokenBalances", async ({ sorobanClient }, thunkApi) => {
  try {
    const { publicKey } = await internalLoadAccount();
    const tokenIdList = await internalGetTokenIds();

    const params = [new Address(publicKey).toScVal()];
    const results = [] as TokenBalances;

    for (let i = 0; i < tokenIdList.length; i += 1) {
      const tokenId = tokenIdList[i];
      /*
        Right now, Soroban transactions only support 1 operation per tx
        so we need a builder per value from the contract,
        once/if multi-op transactions are supported this can send
        1 tx with an operation for each value.
      */

      try {
        /* eslint-disable no-await-in-loop */
        const { balance, ...rest } = await internalGetSorobanTokenBalance(
          sorobanClient.server,
          tokenId,
          {
            balance: await sorobanClient.newTxBuilder(),
            name: await sorobanClient.newTxBuilder(),
            decimals: await sorobanClient.newTxBuilder(),
            symbol: await sorobanClient.newTxBuilder(),
          },
          params,
        );
        /* eslint-enable no-await-in-loop */

        const total = new BigNumber(balance);

        results.push({
          contractId: tokenId,
          total,
          ...rest,
        });
      } catch (e) {
        console.error(`Token "${tokenId}" missing data on RPC server`);
      }
    }

    return results;
  } catch (e) {
    console.error(e);
    return thunkApi.rejectWithValue({ errorMessage: e as string });
  }
});

export const initialState = {
  getTokenBalancesStatus: ActionStatus.IDLE,
  tokenBalances: [] as TokenBalances,
};

const sorobanSlice = createSlice({
  name: "soroban",
  initialState,
  reducers: {
    resetSorobanTokensStatus: (state) => {
      state.getTokenBalancesStatus = initialState.getTokenBalancesStatus;
    },
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

export const { resetSorobanTokensStatus } = sorobanSlice.actions;

export const { reducer } = sorobanSlice;

export const sorobanSelector = (state: { soroban: typeof initialState }) =>
  state.soroban;
