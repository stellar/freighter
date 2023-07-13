import BigNumber from "bignumber.js";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  getSorobanTokenBalance as internalGetSorobanTokenBalance,
  loadAccount as internalLoadAccount,
  getTokenIds as internalGetTokenIds,
} from "@shared/api/internal";
import { ErrorMessage, ActionStatus, TokenBalances } from "@shared/api/types";
import { accountIdentifier } from "@shared/api/helpers/soroban";
import { SorobanContextInterface } from "popup/SorobanContext";

export const getTokenBalances = createAsyncThunk<
  TokenBalances,
  { sorobanClient: SorobanContextInterface },
  { rejectValue: ErrorMessage }
>("getTokenBalances", async ({ sorobanClient }, thunkApi) => {
  try {
    const { publicKey } = await internalLoadAccount();
    const tokenIdList = await internalGetTokenIds();

    const params = [accountIdentifier(publicKey)];
    const results = [] as TokenBalances;

    for (let i = 0; i < tokenIdList.length; i += 1) {
      const tokenId = tokenIdList[i];
      /*
        Right now, Soroban transactions only support 1 operation per tx
        so we need a builder per value from the contract,
        once multi-op transactions are supported this can send
        1 tx with an operation for each value.
      */
      try {
        // eslint-disable-next-line no-await-in-loop
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

        const total = new BigNumber(balance) as any; // ?? why can't the BigNumber type work here

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

const initialState = {
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
