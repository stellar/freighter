import {
  Asset,
  Horizon,
  Keypair,
  Server,
  ServerApi,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import { Networks, SorobanRpc } from "soroban-client";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  signFreighterTransaction as internalSignFreighterTransaction,
  signFreighterSorobanTransaction as internalSignFreighterSorobanTransaction,
  submitFreighterTransaction as internalSubmitFreighterTransaction,
  submitFreighterSorobanTransaction as internalSubmitFreighterSorobanTransaction,
  addRecentAddress as internalAddRecentAddress,
  loadRecentAddresses as internalLoadRecentAddresses,
  getAccountBalances as internalGetAccountBalances,
  getAssetIcons as getAssetIconsService,
  getAssetDomains as getAssetDomainsService,
  getBlockedDomains as internalGetBlockedDomains,
  getBlockedAccounts as internalGetBlockedAccounts,
} from "@shared/api/internal";

import {
  AccountBalancesInterface,
  AssetIcons,
  AssetDomains,
  Balances,
  ErrorMessage,
  BlockedDomains,
  AccountType,
  ActionStatus,
  BlockedAccount,
} from "@shared/api/types";

import { NetworkDetails } from "@shared/constants/stellar";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import LedgerApi from "@ledgerhq/hw-app-str";

import { getAssetFromCanonical, getCanonicalFromAsset } from "helpers/stellar";
import { METRICS_DATA } from "constants/localStorageTypes";
import { MetricsData, emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { SorobanContextInterface } from "popup/SorobanContext";
import { getTokenBalances, resetSorobanTokensStatus } from "./soroban";

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

export const signFreighterSorobanTransaction = createAsyncThunk<
  { signedTransaction: string },
  { transactionXDR: string; network: string },
  { rejectValue: ErrorMessage }
>(
  "signFreighterSorobanTransaction",
  async ({ transactionXDR, network }, thunkApi) => {
    try {
      return await internalSignFreighterSorobanTransaction({
        transactionXDR,
        network,
      });
    } catch (e) {
      return thunkApi.rejectWithValue({ errorMessage: e.message || e });
    }
  },
);

export const submitFreighterTransaction = createAsyncThunk<
  Horizon.TransactionResponse,
  {
    publicKey: string;
    signedXDR: string;
    networkDetails: NetworkDetails;
    refreshBalances?: boolean;
  },
  {
    rejectValue: ErrorMessage;
  }
>(
  "submitFreighterTransaction",
  async (
    { publicKey, signedXDR, networkDetails, refreshBalances = false },
    thunkApi,
  ) => {
    try {
      const txRes = await internalSubmitFreighterTransaction({
        signedXDR,
        networkDetails,
      });

      if (refreshBalances) {
        thunkApi.dispatch(getAccountBalances({ publicKey, networkDetails }));
      }

      return txRes;
    } catch (e) {
      return thunkApi.rejectWithValue({
        errorMessage: e.message || e,
        response: e.response?.data,
      });
    }
  },
);

export const submitFreighterSorobanTransaction = createAsyncThunk<
  SorobanRpc.SendTransactionResponse,
  {
    signedXDR: string;
    networkDetails: NetworkDetails;
    sorobanClient: SorobanContextInterface;
    refreshBalances?: boolean;
  },
  {
    rejectValue: ErrorMessage;
  }
>(
  "submitFreighterSorobanTransaction",
  async (
    { signedXDR, networkDetails, sorobanClient, refreshBalances = false },
    thunkApi,
  ) => {
    try {
      const txRes = await internalSubmitFreighterSorobanTransaction({
        signedXDR,
        networkDetails,
      });

      if (refreshBalances) {
        thunkApi.dispatch(resetSorobanTokensStatus());
        await thunkApi.dispatch(
          getTokenBalances({
            sorobanClient,
            network: networkDetails.network as Networks,
          }),
        );
      }

      return txRes;
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
      const tx = TransactionBuilder.fromXDR(transactionXDR, networkPassphrase);

      const transport = await TransportWebUSB.create();
      const ledgerApi = new LedgerApi(transport);
      const result = await ledgerApi.signTransaction(
        bipPath,
        tx.signatureBase(),
      );

      const keypair = Keypair.fromPublicKey(publicKey);
      const decoratedSignature = new xdr.DecoratedSignature({
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

const storeBalanceMetricData = (publicKey: string, accountFunded: boolean) => {
  const metricsData: MetricsData = JSON.parse(
    localStorage.getItem(METRICS_DATA) || "{}",
  );
  const accountType = metricsData.accountType;

  if (accountFunded && accountType === AccountType.HW) {
    metricsData.hwFunded = true;
  }
  if (accountFunded && accountType === AccountType.IMPORTED) {
    metricsData.importedFunded = true;
  }
  if (accountType === AccountType.FREIGHTER) {
    // check if we found a previously unfunded freighter account for metrics
    const unfundedFreighterAccounts =
      metricsData.unfundedFreighterAccounts || [];
    const idx = unfundedFreighterAccounts.indexOf(publicKey);

    if (accountFunded) {
      metricsData.freighterFunded = true;
      if (idx !== -1) {
        emitMetric(METRIC_NAMES.freighterAccountFunded, { publicKey });
        unfundedFreighterAccounts.splice(idx, 1);
      }
    }
    if (!accountFunded && idx === -1) {
      unfundedFreighterAccounts.push(publicKey);
    }
    metricsData.unfundedFreighterAccounts = unfundedFreighterAccounts;
  }

  localStorage.setItem(METRICS_DATA, JSON.stringify(metricsData));
};

export const getAccountBalances = createAsyncThunk<
  AccountBalancesInterface,
  { publicKey: string; networkDetails: NetworkDetails },
  { rejectValue: ErrorMessage }
>("getAccountBalances", async ({ publicKey, networkDetails }, thunkApi) => {
  try {
    const res = await internalGetAccountBalances({ publicKey, networkDetails });
    storeBalanceMetricData(publicKey, res.isFunded || false);
    return res;
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

export const getAssetDomains = createAsyncThunk<
  AssetDomains,
  { balances: Balances; networkDetails: NetworkDetails },
  { rejectValue: ErrorMessage }
>(
  "auth/getAssetDomains",
  ({
    balances,
    networkDetails,
  }: {
    balances: Balances;
    networkDetails: NetworkDetails;
  }) => getAssetDomainsService({ balances, networkDetails }),
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
        getAssetFromCanonical(sourceAsset) as Asset,
        amount,
        [getAssetFromCanonical(destAsset)] as Asset[],
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

export const getBlockedDomains = createAsyncThunk<
  BlockedDomains,
  undefined,
  { rejectValue: ErrorMessage }
>("getBlockedDomains", async (_, thunkApi) => {
  try {
    const resp = await internalGetBlockedDomains();
    return resp.blockedDomains || [];
  } catch (e) {
    return thunkApi.rejectWithValue({ errorMessage: e });
  }
});

export const getBlockedAccounts = createAsyncThunk<
  BlockedAccount[],
  undefined,
  { rejectValue: ErrorMessage }
>("getBlockedAccounts", async (_, thunkApi) => {
  try {
    const resp = await internalGetBlockedAccounts();
    return resp.blockedAccounts || [];
  } catch (e) {
    return thunkApi.rejectWithValue({ errorMessage: e });
  }
});

export enum ShowOverlayStatus {
  IDLE = "IDLE",
  IN_PROGRESS = "IN_PROGRESS",
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
  isToken: boolean;
}

interface HardwareWalletData {
  status: ShowOverlayStatus;
  transactionXDR: string;
  shouldSubmit: boolean;
}

export enum AssetSelectType {
  MANAGE = "MANAGE",
  REGULAR = "REGULAR",
  PATH_PAY = "PATH_PAY",
  SWAP = "SWAP",
}
interface InitialState {
  submitStatus: ActionStatus;
  accountBalanceStatus: ActionStatus;
  hardwareWalletData: HardwareWalletData;
  response:
    | Horizon.TransactionResponse
    | SorobanRpc.SendTransactionResponse
    | null;
  error: ErrorMessage | undefined;
  transactionData: TransactionData;
  accountBalances: AccountBalancesInterface;
  destinationBalances: AccountBalancesInterface;
  assetIcons: AssetIcons;
  assetDomains: AssetDomains;
  assetSelect: {
    type: AssetSelectType;
    isSource: boolean;
  };
  blockedDomains: {
    domains: BlockedDomains;
  };
  blockedAccounts: BlockedAccount[];
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
    isToken: false,
  },
  hardwareWalletData: {
    status: ShowOverlayStatus.IDLE,
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
  assetDomains: {},
  assetSelect: {
    type: AssetSelectType.MANAGE,
    isSource: true,
  },
  blockedDomains: {
    domains: {},
  },
  blockedAccounts: [],
};

const transactionSubmissionSlice = createSlice({
  name: "transactionSubmission",
  initialState,
  reducers: {
    resetSubmission: () => initialState,
    resetAccountBalanceStatus: (state) => {
      state.accountBalanceStatus = initialState.accountBalanceStatus;
    },
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
    saveIsToken: (state, action) => {
      state.transactionData.isToken = action.payload;
    },
    startHwConnect: (state) => {
      state.hardwareWalletData.status = ShowOverlayStatus.IN_PROGRESS;
      state.hardwareWalletData.transactionXDR = "";
    },
    startHwSign: (state, action) => {
      state.hardwareWalletData.status = ShowOverlayStatus.IN_PROGRESS;
      state.hardwareWalletData.transactionXDR = action.payload.transactionXDR;
      state.hardwareWalletData.shouldSubmit = action.payload.shouldSubmit;
    },
    closeHwOverlay: (state) => {
      state.hardwareWalletData.status = ShowOverlayStatus.IDLE;
      state.hardwareWalletData.transactionXDR = "";
      state.hardwareWalletData.shouldSubmit = true;
    },
    saveAssetSelectType: (state, action) => {
      state.assetSelect.type = action.payload;
    },
    saveAssetSelectSource: (state, action) => {
      state.assetSelect.isSource = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(submitFreighterTransaction.pending, (state) => {
      state.submitStatus = ActionStatus.PENDING;
    });
    builder.addCase(submitFreighterTransaction.rejected, (state, action) => {
      state.submitStatus = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(submitFreighterTransaction.fulfilled, (state, action) => {
      state.submitStatus = ActionStatus.SUCCESS;
      state.response = action.payload;
    });
    builder.addCase(submitFreighterSorobanTransaction.pending, (state) => {
      state.submitStatus = ActionStatus.PENDING;
    });
    builder.addCase(
      submitFreighterSorobanTransaction.rejected,
      (state, action) => {
        state.submitStatus = ActionStatus.ERROR;
        state.error = action.payload;
      },
    );
    builder.addCase(
      submitFreighterSorobanTransaction.fulfilled,
      (state, action) => {
        state.submitStatus = ActionStatus.SUCCESS;
        state.response = action.payload;
      },
    );
    builder.addCase(signFreighterTransaction.pending, (state) => {
      state.submitStatus = ActionStatus.PENDING;
    });
    builder.addCase(signFreighterSorobanTransaction.pending, (state) => {
      state.submitStatus = ActionStatus.PENDING;
    });
    builder.addCase(signFreighterTransaction.rejected, (state, action) => {
      state.submitStatus = ActionStatus.ERROR;
      state.error = action.payload;
    });
    builder.addCase(
      signFreighterSorobanTransaction.rejected,
      (state, action) => {
        state.submitStatus = ActionStatus.ERROR;
        state.error = action.payload;
      },
    );
    builder.addCase(getBestPath.rejected, (state) => {
      state.transactionData.path = initialState.transactionData.path;
      state.transactionData.destinationAmount =
        initialState.transactionData.destinationAmount;
    });
    builder.addCase(getAccountBalances.pending, (state) => {
      state.accountBalanceStatus = ActionStatus.PENDING;
    });
    builder.addCase(getAccountBalances.rejected, (state) => {
      state.accountBalanceStatus = ActionStatus.ERROR;
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
    builder.addCase(getAssetDomains.fulfilled, (state, action) => {
      const assetDomains = action.payload || {};

      return {
        ...state,
        assetDomains,
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
      action.payload.path.forEach((p) => {
        if (!p.asset_code && !p.asset_issuer) {
          path.push(p.asset_type);
        } else {
          path.push(getCanonicalFromAsset(p.asset_code, p.asset_issuer));
        }
      });

      state.transactionData.path = path;
      state.transactionData.destinationAmount =
        action.payload.destination_amount;
    });
    builder.addCase(getBlockedDomains.fulfilled, (state, action) => {
      state.blockedDomains.domains = action.payload;
    });
    builder.addCase(getBlockedAccounts.fulfilled, (state, action) => {
      state.blockedAccounts = action.payload;
    });
  },
});

export const {
  resetSubmission,
  resetAccountBalanceStatus,
  resetDestinationAmount,
  saveDestination,
  saveFederationAddress,
  saveAmount,
  saveAsset,
  saveTransactionFee,
  saveMemo,
  saveDestinationAsset,
  saveAllowedSlippage,
  saveIsToken,
  startHwConnect,
  startHwSign,
  closeHwOverlay,
  saveAssetSelectType,
  saveAssetSelectSource,
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
