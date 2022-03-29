import { Horizon, Server } from "stellar-sdk";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  signFreighterTransaction as internalSignFreighterTransaction,
  submitFreighterTransaction as internalSubmitFreighterTransaction,
  addRecentAddress as internalAddRecentAddress,
  loadRecentAddresses as internalLoadRecentAddresses,
  getAccountBalances as internalGetAccountBalances,
  getAssetIcons as getAssetIconsService,
} from "@shared/api/internal";

import {
  AccountBalancesInterface,
  AssetIcons,
  Balances,
  ErrorMessage,
} from "@shared/api/types";

import { NetworkDetails } from "@shared/helpers/stellar";

import { getAssetFromCanonical } from "helpers/stellar";

export const signFreighterTransaction = createAsyncThunk<
  { signedTransaction: string },
  { transactionXDR: string; network: string },
  { rejectValue: ErrorMessage }
>("signFreighterTransaction", async ({ transactionXDR, network }, thunkApi) => {
  try {
    return await internalSignFreighterTransaction({
      transactionXDR,
      network,
    });
  } catch (e) {
    return thunkApi.rejectWithValue({ errorMessage: e.message || e });
  }
});

export const submitFreighterTransaction = createAsyncThunk<
  Horizon.TransactionResponse,
  { signedXDR: string; networkUrl: string },
  {
    rejectValue: ErrorMessage;
  }
>("submitFreighterTransaction", async ({ signedXDR, networkUrl }, thunkApi) => {
  try {
    return await internalSubmitFreighterTransaction({
      signedXDR,
      networkUrl,
    });
  } catch (e) {
    return thunkApi.rejectWithValue({
      errorMessage: e.message || e,
      response: e.response?.data,
    });
  }
});

export const addRecentAddress = createAsyncThunk<
  { recentAddresses: Array<string> },
  { publicKey: string },
  { rejectValue: ErrorMessage }
>("addRecentAddress", async ({ publicKey }, thunkApi) => {
  try {
    return await internalAddRecentAddress({ publicKey });
  } catch (e) {
    return thunkApi.rejectWithValue({ errorMessage: e });
  }
});

export const loadRecentAddresses = createAsyncThunk<
  { recentAddresses: Array<string> },
  undefined,
  { rejectValue: ErrorMessage }
>("loadRecentAddresses", async (_: any, thunkApi) => {
  try {
    return await internalLoadRecentAddresses();
  } catch (e) {
    return thunkApi.rejectWithValue({ errorMessage: e });
  }
});

export const getAccountBalances = createAsyncThunk<
  AccountBalancesInterface,
  { publicKey: string; networkDetails: NetworkDetails },
  { rejectValue: ErrorMessage }
>("getAccountBalances", async ({ publicKey, networkDetails }, thunkApi) => {
  try {
    return await internalGetAccountBalances({ publicKey, networkDetails });
  } catch (e) {
    return thunkApi.rejectWithValue({ errorMessage: e });
  }
});

export const getDestinationBalances = createAsyncThunk<
  AccountBalancesInterface,
  { publicKey: string; networkDetails: NetworkDetails },
  { rejectValue: ErrorMessage }
>("getDestinationBalances", async ({ publicKey, networkDetails }, thunkApi) => {
  try {
    return await internalGetAccountBalances({ publicKey, networkDetails });
  } catch (e) {
    return thunkApi.rejectWithValue({ errorMessage: e });
  }
});

export const getAssetIcons = createAsyncThunk<
  AssetIcons,
  { balances: Balances; networkDetails: NetworkDetails },
  { rejectValue: ErrorMessage }
>(
  "auth/getAssetIcons",
  ({
    balances,
    networkDetails,
  }: {
    balances: Balances;
    networkDetails: NetworkDetails;
  }) => getAssetIconsService({ balances, networkDetails }),
);

export const getConversionRate = createAsyncThunk<
  string,
  { sourceAsset: string; destAsset: string; networkDetails: NetworkDetails },
  { rejectValue: ErrorMessage }
>(
  "getConversionRate",
  async ({ sourceAsset, destAsset, networkDetails }, thunkApi) => {
    try {
      const server = new Server(networkDetails.networkUrl);
      const builder = server.strictSendPaths(
        getAssetFromCanonical(sourceAsset),
        "1",
        [getAssetFromCanonical(destAsset)],
      );

      const paths = await builder.call();
      if (paths.records.length === 0) return "";

      return paths.records[0].destination_amount;
    } catch (e) {
      return thunkApi.rejectWithValue({ errorMessage: e });
    }
  },
);

export enum ActionStatus {
  IDLE = "IDLE",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

interface TransactionData {
  amount: string;
  asset: string;
  destination: string;
  federationAddress: string;
  transactionFee: string;
  memo: string;
  destinationAsset: string;
  conversionRate: string;
}

interface InitialState {
  status: string;
  response: Horizon.TransactionResponse | null;
  error: ErrorMessage | undefined;
  transactionData: TransactionData;
  accountBalances: AccountBalancesInterface;
  destinationBalances: AccountBalancesInterface;
  assetIcons: AssetIcons;
}

const initialState: InitialState = {
  status: ActionStatus.IDLE,
  response: null,
  error: undefined,
  transactionData: {
    amount: "",
    asset: "native",
    destination: "",
    federationAddress: "",
    transactionFee: "0.00001",
    memo: "",
    destinationAsset: "",
    conversionRate: "",
  },
  accountBalances: {
    balances: null,
    isFunded: false,
  },
  destinationBalances: {
    balances: null,
    isFunded: false,
  },
  assetIcons: {},
};

const transactionSubmissionSlice = createSlice({
  name: "transactionSubmission",
  initialState,
  reducers: {
    resetSubmission: () => initialState,
    saveDestination: (state, action) => {
      state.transactionData.destination = action.payload;
    },
    saveFederationAddress: (state, action) => {
      state.transactionData.federationAddress = action.payload;
    },
    saveAmount: (state, action) => {
      state.transactionData.amount = action.payload;
    },
    saveAsset: (state, action) => {
      state.transactionData.asset = action.payload;
    },
    saveTransactionFee: (state, action) => {
      state.transactionData.transactionFee = action.payload;
    },
    saveMemo: (state, action) => {
      state.transactionData.memo = action.payload;
    },
    saveDestinationAsset: (state, action) => {
      state.transactionData.destinationAsset = action.payload;
    },
    saveConversionRate: (state, action) => {
      state.transactionData.conversionRate = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(submitFreighterTransaction.pending, (state) => {
      state.status = ActionStatus.PENDING;
    });
    builder.addCase(signFreighterTransaction.pending, (state) => {
      state.status = ActionStatus.PENDING;
    });
    builder.addCase(submitFreighterTransaction.rejected, (state, action) => {
      state.status = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(signFreighterTransaction.rejected, (state, action) => {
      state.status = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(submitFreighterTransaction.fulfilled, (state, action) => {
      state.status = ActionStatus.SUCCESS;
      state.response = action.payload;
    });
    builder.addCase(getAccountBalances.fulfilled, (state, action) => {
      state.accountBalances = action.payload;
    });
    builder.addCase(getDestinationBalances.fulfilled, (state, action) => {
      state.destinationBalances = action.payload;
    });
    builder.addCase(getAssetIcons.fulfilled, (state, action) => {
      const assetIcons = action.payload || {};

      return {
        ...state,
        assetIcons,
      };
    });
  },
});

export const {
  resetSubmission,
  saveDestination,
  saveFederationAddress,
  saveAmount,
  saveAsset,
  saveTransactionFee,
  saveMemo,
  saveDestinationAsset,
  saveConversionRate,
} = transactionSubmissionSlice.actions;
export const { reducer } = transactionSubmissionSlice;

export const transactionSubmissionSelector = (state: {
  transactionSubmission: InitialState;
}) => state.transactionSubmission;

export const transactionDataSelector = (state: {
  transactionSubmission: InitialState;
}) => state.transactionSubmission.transactionData;
