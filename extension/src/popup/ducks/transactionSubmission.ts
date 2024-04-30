import {
  Horizon,
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  signFreighterTransaction as internalSignFreighterTransaction,
  signFreighterSorobanTransaction as internalSignFreighterSorobanTransaction,
  addRecentAddress as internalAddRecentAddress,
  loadRecentAddresses as internalLoadRecentAddresses,
  getAccountIndexerBalances as internalgetAccountIndexerBalances,
  getAccountBalancesStandalone as internalGetAccountBalancesStandalone,
  getAssetIcons as getAssetIconsService,
  getAssetDomains as getAssetDomainsService,
  getBlockedDomains as internalGetBlockedDomains,
  getBlockedAccounts as internalGetBlockedAccounts,
  removeTokenId as internalRemoveTokenId,
  submitFreighterTransaction as internalSubmitFreighterTransaction,
  submitFreighterSorobanTransaction as internalSubmitFreighterSorobanTransaction,
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
  BalanceToMigrate,
} from "@shared/api/types";

import { NETWORKS, NetworkDetails } from "@shared/constants/stellar";
import { ConfigurableWalletType } from "@shared/constants/hardwareWallet";
import { isCustomNetwork } from "@shared/helpers/stellar";

import { getCanonicalFromAsset } from "helpers/stellar";
import { METRICS_DATA } from "constants/localStorageTypes";
import { MetricsData, emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { INDEXER_URL } from "@shared/constants/mercury";
import { horizonGetBestPath } from "popup/helpers/horizonGetBestPath";
import { hardwareSign } from "popup/helpers/hardwareConnect";

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
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return thunkApi.rejectWithValue({ errorMessage: message });
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
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return thunkApi.rejectWithValue({ errorMessage: message });
    }
  },
);

export const submitFreighterTransaction = createAsyncThunk<
  Horizon.HorizonApi.TransactionResponse,
  {
    publicKey: string;
    signedXDR: string;
    networkDetails: NetworkDetails;
  },
  {
    rejectValue: ErrorMessage;
  }
>(
  "submitFreighterTransaction",
  async ({ publicKey, signedXDR, networkDetails }, thunkApi) => {
    if (isCustomNetwork(networkDetails)) {
      try {
        const txRes = await internalSubmitFreighterTransaction({
          signedXDR,
          networkDetails,
        });

        thunkApi.dispatch(getAccountBalances({ publicKey, networkDetails }));

        return txRes;
      } catch (e) {
        const message = e instanceof Error ? e.message : JSON.stringify(e);
        return thunkApi.rejectWithValue({
          errorMessage: message,
        });
      }
    } else {
      try {
        const options = {
          method: "POST",
          headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            signed_xdr: signedXDR,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            network_url: networkDetails.networkUrl,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            network_passphrase: networkDetails.networkPassphrase,
          }),
        };
        const res = await fetch(`${INDEXER_URL}/submit-tx`, options);
        const response = await res.json();

        if (!res.ok) {
          return thunkApi.rejectWithValue({
            errorMessage: response,
            response,
          });
        }
        return response;
      } catch (e) {
        const message = e instanceof Error ? e.message : JSON.stringify(e);
        return thunkApi.rejectWithValue({
          errorMessage: message,
          response: e as any,
        });
      }
    }
  },
);

export const submitFreighterSorobanTransaction = createAsyncThunk<
  SorobanRpc.Api.SendTransactionResponse,
  {
    publicKey: string;
    signedXDR: string;
    networkDetails: NetworkDetails;
  },
  {
    rejectValue: ErrorMessage;
  }
>(
  "submitFreighterSorobanTransaction",
  async ({ publicKey, signedXDR, networkDetails }, thunkApi) => {
    if (isCustomNetwork(networkDetails)) {
      try {
        const txRes = await internalSubmitFreighterSorobanTransaction({
          signedXDR,
          networkDetails,
        });

        thunkApi.dispatch(getAccountBalances({ publicKey, networkDetails }));

        return txRes;
      } catch (e) {
        const message = e instanceof Error ? e.message : JSON.stringify(e);
        return thunkApi.rejectWithValue({
          errorMessage: message,
        });
      }
    } else {
      try {
        const options = {
          method: "POST",
          headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            signed_xdr: signedXDR,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            network_url: networkDetails.networkUrl,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            network_passphrase: networkDetails.networkPassphrase,
          }),
        };
        const res = await fetch(`${INDEXER_URL}/submit-tx`, options);
        const response = await res.json();

        if (!res.ok) {
          return thunkApi.rejectWithValue({
            errorMessage: response,
            response,
          });
        }
        return response;
      } catch (e) {
        const message = e instanceof Error ? e.message : JSON.stringify(e);
        return thunkApi.rejectWithValue({
          errorMessage: message,
          response: e as any,
        });
      }
    }
  },
);

export const signWithHardwareWallet = createAsyncThunk<
  string,
  {
    transactionXDR: string;
    networkPassphrase: string;
    publicKey: string;
    bipPath: string;
    walletType: ConfigurableWalletType;
  },
  { rejectValue: ErrorMessage }
>(
  "signWithHardwareWallet",
  async (
    { transactionXDR, networkPassphrase, publicKey, bipPath, walletType },
    thunkApi,
  ) => {
    try {
      const tx = TransactionBuilder.fromXDR(transactionXDR, networkPassphrase);

      const signature = await hardwareSign[walletType]({ bipPath, tx });

      const keypair = Keypair.fromPublicKey(publicKey);
      const decoratedSignature = new xdr.DecoratedSignature({
        hint: keypair.signatureHint(),
        signature,
      });

      tx.signatures.push(decoratedSignature);

      return tx.toXDR();
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return thunkApi.rejectWithValue({ errorMessage: message });
    }
  },
);

export const addRecentAddress = createAsyncThunk<
  { recentAddresses: string[] },
  { publicKey: string },
  { rejectValue: ErrorMessage }
>("addRecentAddress", async ({ publicKey }, thunkApi) => {
  try {
    return await internalAddRecentAddress({ publicKey });
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return thunkApi.rejectWithValue({ errorMessage: message });
  }
});

export const loadRecentAddresses = createAsyncThunk<
  { recentAddresses: string[] },
  undefined,
  { rejectValue: ErrorMessage }
>("loadRecentAddresses", async (_: any, thunkApi) => {
  try {
    return await internalLoadRecentAddresses();
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return thunkApi.rejectWithValue({ errorMessage: message });
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

export const removeTokenId = createAsyncThunk<
  void,
  {
    contractId: string;
    network: NETWORKS;
  },
  { rejectValue: ErrorMessage }
  // @ts-ignore
>("removeTokenId", async ({ contractId, network }, thunkApi) => {
  try {
    await internalRemoveTokenId({ contractId, network });
  } catch (e) {
    console.error(e);
    thunkApi.rejectWithValue({ errorMessage: e as string });
  }
});

export const getAccountBalances = createAsyncThunk<
  AccountBalancesInterface,
  {
    publicKey: string;
    networkDetails: NetworkDetails;
  },
  { rejectValue: ErrorMessage }
>("getAccountBalances", async ({ publicKey, networkDetails }, thunkApi) => {
  try {
    let balances;

    if (isCustomNetwork(networkDetails)) {
      balances = await internalGetAccountBalancesStandalone({
        publicKey,
        networkDetails,
      });
    } else {
      balances = await internalgetAccountIndexerBalances(
        publicKey,
        networkDetails,
      );
    }

    storeBalanceMetricData(publicKey, balances.isFunded || false);
    return balances;
  } catch (e) {
    return thunkApi.rejectWithValue({ errorMessage: e as string });
  }
});

export const getDestinationBalances = createAsyncThunk<
  AccountBalancesInterface,
  {
    publicKey: string;
    networkDetails: NetworkDetails;
  },
  { rejectValue: ErrorMessage }
>("getDestinationBalances", async ({ publicKey, networkDetails }, thunkApi) => {
  try {
    if (isCustomNetwork(networkDetails)) {
      return await internalGetAccountBalancesStandalone({
        publicKey,
        networkDetails,
      });
    }
    return await internalgetAccountIndexerBalances(publicKey, networkDetails);
  } catch (e) {
    return thunkApi.rejectWithValue({ errorMessage: e as string });
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
  Horizon.ServerApi.PaymentPathRecord,
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
      return await horizonGetBestPath({
        amount,
        sourceAsset,
        destAsset,
        networkDetails,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return thunkApi.rejectWithValue({
        errorMessage: message,
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
    return thunkApi.rejectWithValue({ errorMessage: e as string });
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
    return thunkApi.rejectWithValue({ errorMessage: e as string });
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
  path: string[];
  allowedSlippage: string;
  isMergeSelected: boolean;
  balancesToMigrate: BalanceToMigrate[];
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
  destinationAccountBalanceStatus: ActionStatus;
  hardwareWalletData: HardwareWalletData;
  response:
    | Horizon.HorizonApi.TransactionResponse
    | SorobanRpc.Api.SendTransactionResponse
    | null;
  error: ErrorMessage | undefined;
  transactionData: TransactionData;
  transactionSimulation: {
    response: SorobanRpc.Api.SimulateTransactionSuccessResponse | null;
    preparedTransaction: string | null;
  };
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
  destinationAccountBalanceStatus: ActionStatus.IDLE,
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
    isMergeSelected: false,
    balancesToMigrate: [] as BalanceToMigrate[],
  },
  transactionSimulation: {
    response: null,
    preparedTransaction: null,
  },
  hardwareWalletData: {
    status: ShowOverlayStatus.IDLE,
    transactionXDR: "",
    shouldSubmit: true,
  },
  accountBalances: {
    tokensWithNoBalance: [],
    balances: null,
    isFunded: false,
    subentryCount: 0,
  },
  destinationBalances: {
    tokensWithNoBalance: [],
    balances: null,
    isFunded: true,
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
    saveSimulation: (state, action) => {
      state.transactionSimulation = action.payload;
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
    saveIsMergeSelected: (state, action) => {
      state.transactionData.isMergeSelected = action.payload;
    },
    saveBalancesToMigrate: (state, action) => {
      state.transactionData.balancesToMigrate = action.payload;
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
      state.accountBalances = initialState.accountBalances;
    });
    builder.addCase(getAccountBalances.rejected, (state, action) => {
      state.error = action.payload;
      state.accountBalanceStatus = ActionStatus.ERROR;
    });
    builder.addCase(getAccountBalances.fulfilled, (state, action) => {
      state.accountBalances = action.payload;
      state.accountBalanceStatus = ActionStatus.SUCCESS;
    });
    builder.addCase(getDestinationBalances.fulfilled, (state, action) => {
      state.destinationBalances = action.payload;
      state.destinationAccountBalanceStatus = ActionStatus.SUCCESS;
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
      const path: string[] = [];
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
  saveSimulation,
  startHwConnect,
  startHwSign,
  closeHwOverlay,
  saveAssetSelectType,
  saveAssetSelectSource,
  saveIsMergeSelected,
  saveBalancesToMigrate,
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

export const tokensSelector = (state: {
  accountBalanceStatus: ActionStatus;
  tokensWithNoBalance: string[];
}) => ({
  accountBalanceStatus: state.accountBalanceStatus,
  tokensWithNoBalance: state.tokensWithNoBalance || [],
});
