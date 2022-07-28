import StellarSdk, { Horizon, Server, ServerApi } from "stellar-sdk";
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
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import LedgerApi from "@ledgerhq/hw-app-str";

import { getAssetFromCanonical, getCanonicalFromAsset } from "helpers/stellar";

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
  { signedXDR: string; networkDetails: NetworkDetails },
  {
    rejectValue: ErrorMessage;
  }
>(
  "submitFreighterTransaction",
  async ({ signedXDR, networkDetails }, thunkApi) => {
    try {
      return await internalSubmitFreighterTransaction({
        signedXDR,
        networkDetails,
      });
    } catch (e) {
      return thunkApi.rejectWithValue({
        errorMessage: e.message || e,
        response: e.response?.data,
      });
    }
  },
);

export const signWithLedger = createAsyncThunk<
  string,
  {
    transactionXDR: string;
    networkPassphrase: string;
    publicKey: string;
    bipPath: string;
  },
  { rejectValue: ErrorMessage }
>(
  "signWithLedger",
  async (
    { transactionXDR, networkPassphrase, publicKey, bipPath },
    thunkApi,
  ) => {
    try {
      const tx = StellarSdk.TransactionBuilder.fromXDR(
        transactionXDR,
        networkPassphrase,
      );

      const transport = await TransportWebUSB.create();
      const ledgerApi = new LedgerApi(transport);
      const result = await ledgerApi.signTransaction(
        bipPath,
        tx.signatureBase(),
      );

      const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);
      const decoratedSignature = new StellarSdk.xdr.DecoratedSignature({
        hint: keypair.signatureHint(),
        signature: result.signature,
      });

      tx.signatures.push(decoratedSignature);

      return tx.toXDR();
    } catch (e) {
      return thunkApi.rejectWithValue({ errorMessage: e.message || e });
    }
  },
);

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
  ServerApi.PaymentPathRecord,
  {
    amount: string;
    sourceAsset: string;
    destAsset: string;
    networkDetails: NetworkDetails;
  },
  { rejectValue: ErrorMessage }
>(
  "getBestPath",
  async ({ amount, sourceAsset, destAsset, networkDetails }, thunkApi) => {
    try {
      const server = new Server(networkDetails.networkUrl);
      const builder = server.strictSendPaths(
        getAssetFromCanonical(sourceAsset),
        amount,
        [getAssetFromCanonical(destAsset)],
      );

      const paths = await builder.call();
      return paths.records[0];
    } catch (e) {
      return thunkApi.rejectWithValue({
        errorMessage: e.message || e,
        response: e.response?.data,
      });
    }
  },
);

export enum HwOverlayStatus {
  IDLE = "IDLE",
  IN_PROGRESS = "IN_PROGRESS",
}

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
  path: Array<string>;
  allowedSlippage: string;
}

interface HardwareWalletData {
  status: HwOverlayStatus;
  transactionXDR: string;
  shouldSubmit: boolean;
}

interface InitialState {
  submitStatus: ActionStatus;
  accountBalanceStatus: ActionStatus;
  hardwareWalletData: HardwareWalletData;
  response: Horizon.TransactionResponse | null;
  error: ErrorMessage | undefined;
  transactionData: TransactionData;
  accountBalances: AccountBalancesInterface;
  destinationBalances: AccountBalancesInterface;
  assetIcons: AssetIcons;
}

export const initialState: InitialState = {
  submitStatus: ActionStatus.IDLE,
  accountBalanceStatus: ActionStatus.IDLE,
  response: null,
  error: undefined,
  transactionData: {
    amount: "0",
    asset: "native",
    destination: "",
    federationAddress: "",
    transactionFee: "",
    memo: "",
    destinationAsset: "",
    destinationAmount: "",
    path: [],
    allowedSlippage: "1",
  },
  hardwareWalletData: {
    status: HwOverlayStatus.IDLE,
    transactionXDR: "",
    shouldSubmit: true,
  },
  accountBalances: {
    balances: null,
    isFunded: false,
    subentryCount: 0,
  },
  destinationBalances: {
    balances: null,
    isFunded: false,
    subentryCount: 0,
  },
  assetIcons: {},
};

const transactionSubmissionSlice = createSlice({
  name: "transactionSubmission",
  initialState,
  reducers: {
    resetSubmission: () => initialState,
    resetDestinationAmount: (state) => {
      state.transactionData.destinationAmount =
        initialState.transactionData.destinationAmount;
    },
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
    saveAllowedSlippage: (state, action) => {
      state.transactionData.allowedSlippage = action.payload;
    },
    startHwConnect: (state) => {
      state.hardwareWalletData.status = HwOverlayStatus.IN_PROGRESS;
      state.hardwareWalletData.transactionXDR = "";
    },
    startHwSign: (state, action) => {
      state.hardwareWalletData.status = HwOverlayStatus.IN_PROGRESS;
      state.hardwareWalletData.transactionXDR = action.payload.transactionXDR;
      state.hardwareWalletData.shouldSubmit = action.payload.shouldSubmit;
    },
    closeHwOverlay: (state) => {
      state.hardwareWalletData.status = HwOverlayStatus.IDLE;
      state.hardwareWalletData.transactionXDR = "";
      state.hardwareWalletData.shouldSubmit = true;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(submitFreighterTransaction.pending, (state) => {
      state.submitStatus = ActionStatus.PENDING;
    });
    builder.addCase(signFreighterTransaction.pending, (state) => {
      state.submitStatus = ActionStatus.PENDING;
    });
    builder.addCase(submitFreighterTransaction.rejected, (state, action) => {
      state.submitStatus = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(signFreighterTransaction.rejected, (state, action) => {
      state.submitStatus = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(getBestPath.rejected, (state) => {
      state.transactionData.path = initialState.transactionData.path;
      state.transactionData.destinationAmount =
        initialState.transactionData.destinationAmount;
    });
    builder.addCase(submitFreighterTransaction.fulfilled, (state, action) => {
      state.submitStatus = ActionStatus.SUCCESS;
      state.response = action.payload;
    });
    builder.addCase(getAccountBalances.pending, (state) => {
      state.accountBalanceStatus = ActionStatus.PENDING;
    });
    builder.addCase(getAccountBalances.fulfilled, (state, action) => {
      state.accountBalances = action.payload;
      state.accountBalanceStatus = ActionStatus.SUCCESS;
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
      if (!action.payload) {
        state.transactionData.path = [];
        state.transactionData.destinationAmount = "";
        return;
      }

      // store in canonical form for easier use
      const path: Array<string> = [];
      action.payload.path.forEach((p) =>
        path.push(getCanonicalFromAsset(p.asset_code, p.asset_issuer)),
      );

      state.transactionData.path = path;
      state.transactionData.destinationAmount =
        action.payload.destination_amount;
    });
  },
});

export const {
  resetSubmission,
  resetDestinationAmount,
  saveDestination,
  saveFederationAddress,
  saveAmount,
  saveAsset,
  saveTransactionFee,
  saveMemo,
  saveDestinationAsset,
  saveAllowedSlippage,
  startHwConnect,
  startHwSign,
  closeHwOverlay,
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
