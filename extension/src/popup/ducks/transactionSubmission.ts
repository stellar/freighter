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

// returns the full record so can save the best path and its rate
export const getBestPath = createAsyncThunk<
  // ALEC TODO - any, it's the strictsend endpoint record?
  any,
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
      // ALEC TODO - best way to handle no path found in here
      if (paths.records.length === 0) return "";

      return paths.records[0];
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
  destinationAmount: string;
  // ALEC TODO - any
  path: Array<any>;
  allowedSlippage: string;
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
    destinationAmount: "",
    path: [],
    allowedSlippage: "1",
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
    // ALEC TODO - remove
    // saveConversionRate: (state, action) => {
    //   state.transactionData.conversionRate = action.payload;
    // },
    saveAllowedSlippage: (state, action) => {
      state.transactionData.allowedSlippage = action.payload;
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
    builder.addCase(getBestPath.fulfilled, (state, action) => {
      // ALEC TODO - remove
      console.log("action in getBestPath.fulfilled:");
      console.log({ action });

      // store in canonical form for easier use
      const path = [];
      for (let i = 0; i < action.payload.path.length; i += 1) {
        const p = action.payload.path[i];
        // ALEC TODO - remove
        console.log({ p });
        path.push(
          p.asset_code === "native"
            ? "native"
            : `${p.asset_code}:${p.asset_issuer}`,
        );
      }
      state.transactionData.path = path;
      state.transactionData.destinationAmount =
        action.payload.destination_amount;
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
  // ALEC TODO - remove
  // saveConversionRate,
  saveAllowedSlippage,
} = transactionSubmissionSlice.actions;
export const { reducer } = transactionSubmissionSlice;

export const transactionSubmissionSelector = (state: {
  transactionSubmission: InitialState;
}) => state.transactionSubmission;

export const transactionDataSelector = (state: {
  transactionSubmission: InitialState;
}) => state.transactionSubmission.transactionData;

export const isPathPaymentSelector = (state: {
  transactionSubmission: InitialState;
}) => state.transactionSubmission.transactionData.destinationAsset !== "";
