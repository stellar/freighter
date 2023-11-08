import { Address } from "stellar-sdk";
import BigNumber from "bignumber.js";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  getSorobanTokenBalance as internalGetSorobanTokenBalance,
  loadAccount as internalLoadAccount,
  getTokenIds as internalGetTokenIds,
  removeTokenId as internalRemoveTokenId,
} from "@shared/api/internal";
import { ErrorMessage, ActionStatus, TokenBalances } from "@shared/api/types";
import {
  SorobanContextInterface,
  hasSorobanClient,
} from "popup/SorobanContext";
import { NETWORKS } from "@shared/constants/stellar";

export const getTokenBalances = createAsyncThunk<
  { tokenBalances: TokenBalances; tokensWithNoBalance: string[] },
  { sorobanClient: SorobanContextInterface; network: NETWORKS },
  { rejectValue: ErrorMessage }
>("getTokenBalances", async ({ sorobanClient, network }, thunkApi) => {
  if (!sorobanClient.server || !sorobanClient.newTxBuilder) {
    throw new Error("soroban rpc not supported");
  }

  try {
    const { publicKey } = await internalLoadAccount();
    const tokenIdList = await internalGetTokenIds(network);

    const params = [new Address(publicKey).toScVal()];
    const results = [] as TokenBalances;
    const tokensWithNoBalance = [];

    for (let i = 0; i < tokenIdList.length; i += 1) {
      const tokenId = tokenIdList[i];
      /*
        Right now, Soroban transactions only support 1 operation per tx
        so we need a builder per value from the contract,
        once/if multi-op transactions are supported this can send
        1 tx with an operation for each value.
      */

      try {
        if (!hasSorobanClient(sorobanClient)) {
          throw new Error("Soroban RPC is not supprted for this network");
        }

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
        tokensWithNoBalance.push(tokenId);
      }
    }

    return { tokenBalances: results, tokensWithNoBalance };
  } catch (e) {
    console.error(e);
    return thunkApi.rejectWithValue({ errorMessage: e as string });
  }
});

export const removeTokenId = createAsyncThunk<
  void,
  {
    contractId: string;
    network: NETWORKS;
    sorobanClient: SorobanContextInterface;
  },
  { rejectValue: ErrorMessage }
>("removeTokenId", async ({ contractId, network, sorobanClient }, thunkApi) => {
  try {
    await internalRemoveTokenId({ contractId, network });
  } catch (e) {
    console.error(e);
    thunkApi.rejectWithValue({ errorMessage: e as string });
  }

  thunkApi.dispatch(getTokenBalances({ sorobanClient, network }));
});

export const initialState = {
  getTokenBalancesStatus: ActionStatus.IDLE,
  tokenBalances: [] as TokenBalances,
  tokensWithNoBalance: [] as string[],
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
      state.tokenBalances = action.payload.tokenBalances;
      state.tokensWithNoBalance = action.payload.tokensWithNoBalance;
      state.getTokenBalancesStatus = ActionStatus.SUCCESS;
    });
    builder.addCase(removeTokenId.pending, (state) => {
      state.getTokenBalancesStatus = ActionStatus.PENDING;
    });
  },
});

export const { resetSorobanTokensStatus } = sorobanSlice.actions;

export const { reducer } = sorobanSlice;

export const sorobanSelector = (state: { soroban: typeof initialState }) =>
  state.soroban;
