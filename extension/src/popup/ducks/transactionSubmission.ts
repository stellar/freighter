import {
  Horizon,
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { captureException } from "@sentry/browser";

import {
  signFreighterTransaction as internalSignFreighterTransaction,
  signFreighterSorobanTransaction as internalSignFreighterSorobanTransaction,
  addRecentAddress as internalAddRecentAddress,
  loadRecentAddresses as internalLoadRecentAddresses,
  getAccountIndexerBalances as internalgetAccountIndexerBalances,
  getAccountBalancesStandalone as internalGetAccountBalancesStandalone,
  getTokenPrices as internalGetTokenPrices,
  getAssetIcons as getAssetIconsService,
  getAssetDomains as getAssetDomainsService,
  getMemoRequiredAccounts as internalGetMemoRequiredAccounts,
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
  AccountType,
  ActionStatus,
  MemoRequiredAccount,
  BalanceToMigrate,
  SoroswapToken,
  ApiTokenPrices,
} from "@shared/api/types";

import { NETWORKS, NetworkDetails } from "@shared/constants/stellar";
import { ConfigurableWalletType } from "@shared/constants/hardwareWallet";
import { isCustomNetwork } from "@shared/helpers/stellar";

import {
  getCanonicalFromAsset,
  isMainnet as isMainnetHelper,
} from "helpers/stellar";
import { METRICS_DATA } from "constants/localStorageTypes";
import { MetricsData, emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { INDEXER_URL } from "@shared/constants/mercury";
import { horizonGetBestPath } from "popup/helpers/horizonGetBestPath";
import {
  soroswapGetBestPath,
  getSoroswapTokens as getSoroswapTokensService,
} from "popup/helpers/sorobanSwap";
import { hardwareSign, hardwareSignAuth } from "popup/helpers/hardwareConnect";
import { publicKeySelector } from "popup/ducks/accountServices";
import { AppState } from "popup/App";

export const signFreighterTransaction = createAsyncThunk<
  { signedTransaction: string },
  { transactionXDR: string; network: string },
  { rejectValue: ErrorMessage; state: AppState }
>(
  "signFreighterTransaction",
  async ({ transactionXDR, network }, { getState, rejectWithValue }) => {
    const activePublicKey = publicKeySelector(getState());

    try {
      return await internalSignFreighterTransaction({
        transactionXDR,
        network,
        activePublicKey,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return rejectWithValue({ errorMessage: message });
    }
  }
);

export const signFreighterSorobanTransaction = createAsyncThunk<
  { signedTransaction: string },
  { transactionXDR: string; network: string },
  { rejectValue: ErrorMessage; state: AppState }
>(
  "signFreighterSorobanTransaction",
  async ({ transactionXDR, network }, { getState, rejectWithValue }) => {
    const activePublicKey = publicKeySelector(getState());

    try {
      return await internalSignFreighterSorobanTransaction({
        transactionXDR,
        network,
        activePublicKey,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return rejectWithValue({ errorMessage: message });
    }
  }
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
    state: AppState;
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signed_xdr: signedXDR,

            network_url: networkDetails.networkUrl,

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
  }
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
    state: AppState;
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signed_xdr: signedXDR,

            network_url: networkDetails.networkUrl,

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
  }
);

export const signWithHardwareWallet = createAsyncThunk<
  string | Buffer,
  {
    transactionXDR: string;
    networkPassphrase: string;
    publicKey: string;
    bipPath: string;
    walletType: ConfigurableWalletType;
    isHashSigningEnabled: boolean;
    isSignSorobanAuthorization?: boolean;
  },
  { rejectValue: ErrorMessage }
>(
  "signWithHardwareWallet",
  async (
    {
      transactionXDR,
      networkPassphrase,
      publicKey,
      bipPath,
      walletType,
      isHashSigningEnabled,
      isSignSorobanAuthorization,
    },
    thunkApi
  ) => {
    if (isSignSorobanAuthorization) {
      try {
        const auth = Buffer.from(transactionXDR, "base64");

        const signature = await hardwareSignAuth[walletType]({
          bipPath,
          auth,
          isHashSigningEnabled,
        });

        return signature;
      } catch (e) {
        const message = e instanceof Error ? e.message : JSON.stringify(e);
        return thunkApi.rejectWithValue({ errorMessage: message });
      }
    }

    try {
      const tx = TransactionBuilder.fromXDR(transactionXDR, networkPassphrase);

      const signature = await hardwareSign[walletType]({
        bipPath,
        tx,
        isHashSigningEnabled,
      });

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
  }
);

export const addRecentAddress = createAsyncThunk<
  { recentAddresses: string[] },
  { publicKey: string },
  { rejectValue: ErrorMessage; state: AppState }
>("addRecentAddress", async ({ publicKey }, { getState, rejectWithValue }) => {
  const activePublicKey = publicKeySelector(getState());

  try {
    return await internalAddRecentAddress({ activePublicKey, publicKey });
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return rejectWithValue({ errorMessage: message });
  }
});

export const loadRecentAddresses = createAsyncThunk<
  { recentAddresses: string[] },
  undefined,
  { rejectValue: ErrorMessage; state: AppState }
>("loadRecentAddresses", async (_, { getState, rejectWithValue }) => {
  const activePublicKey = publicKeySelector(getState());

  try {
    return await internalLoadRecentAddresses({ activePublicKey });
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return rejectWithValue({ errorMessage: message });
  }
});

const storeBalanceMetricData = (publicKey: string, accountFunded: boolean) => {
  const metricsData: MetricsData = JSON.parse(
    localStorage.getItem(METRICS_DATA) || "{}"
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
  { rejectValue: ErrorMessage; state: AppState }
>(
  "removeTokenId",
  async ({ contractId, network }, { getState, rejectWithValue }) => {
    const activePublicKey = publicKeySelector(getState());

    try {
      await internalRemoveTokenId({ activePublicKey, contractId, network });
    } catch (e) {
      console.error(e);
      rejectWithValue({ errorMessage: e as string });
    }
  }
);

export const getAccountBalances = createAsyncThunk<
  {
    balances: AccountBalancesInterface;
    tokenPrices: ApiTokenPrices;
  },
  {
    publicKey: string;
    networkDetails: NetworkDetails;
    shouldGetTokenPrices?: boolean;
  },
  { rejectValue: ErrorMessage; state: AppState }
>(
  "getAccountBalances",
  async (
    { publicKey, networkDetails, shouldGetTokenPrices = false },
    { getState, rejectWithValue }
  ) => {
    const activePublicKey = publicKeySelector(getState());
    try {
      let balances;
      let tokenPrices = {};
      const isMainnet = isMainnetHelper(networkDetails);

      if (isCustomNetwork(networkDetails)) {
        balances = await internalGetAccountBalancesStandalone({
          activePublicKey,
          publicKey,
          networkDetails,
          isMainnet,
        });
      } else {
        balances = await internalgetAccountIndexerBalances({
          activePublicKey,
          publicKey,
          networkDetails,
        });
        const assetIds = Object.keys(balances.balances || {});
        if (assetIds.length && shouldGetTokenPrices) {
          try {
            tokenPrices = await Promise.race<ApiTokenPrices>([
              internalGetTokenPrices(assetIds),
              new Promise<ApiTokenPrices>((resolve) =>
                setTimeout(() => resolve({} as ApiTokenPrices), 3000)
              ),
            ]);
          } catch (error) {
            const _err = JSON.stringify(error);
            captureException(`Failed to fetch token prices - ${_err}`);
          }
        }
      }

      storeBalanceMetricData(publicKey, balances.isFunded || false);
      return {
        balances,
        tokenPrices,
      };
    } catch (e) {
      return rejectWithValue({ errorMessage: e as string });
    }
  }
);

export const getTokenPrices = createAsyncThunk<
  ApiTokenPrices,
  {
    networkDetails: NetworkDetails;
    balances: Balances;
  },
  { rejectValue: ErrorMessage }
>("getTokenPrices", async ({ networkDetails, balances }, thunkApi) => {
  try {
    if (isCustomNetwork(networkDetails)) {
      return {};
    }
    const assetIds = Object.keys(balances || {});
    if (!assetIds.length) {
      return {};
    }
    return await internalGetTokenPrices(assetIds);
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
  { rejectValue: ErrorMessage; state: AppState }
>(
  "getDestinationBalances",
  async ({ publicKey, networkDetails }, { getState, rejectWithValue }) => {
    const activePublicKey = publicKeySelector(getState());

    try {
      if (isCustomNetwork(networkDetails)) {
        return await internalGetAccountBalancesStandalone({
          activePublicKey,
          publicKey,
          networkDetails,
          isMainnet: isMainnetHelper(networkDetails),
        });
      }
      return await internalgetAccountIndexerBalances({
        activePublicKey,
        publicKey,
        networkDetails,
      });
    } catch (e) {
      return rejectWithValue({ errorMessage: e as string });
    }
  }
);

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
  }) => getAssetIconsService({ balances, networkDetails })
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
  }) => getAssetDomainsService({ balances, networkDetails })
);

export const getSoroswapTokens = createAsyncThunk<
  SoroswapToken[],
  undefined,
  { rejectValue: ErrorMessage }
>("getSoroswapTokens", async (_, thunkApi) => {
  let tokenData = { assets: [] as SoroswapToken[] };

  try {
    tokenData = await getSoroswapTokensService();
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return thunkApi.rejectWithValue({ errorMessage: message });
  }

  return tokenData.assets;
});

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
  }
);

export const getBestSoroswapPath = createAsyncThunk<
  {
    amountIn?: string;
    amountOutMin?: string;
    amountInDecimals: number;
    amountOutDecimals: number;
    path: string[];
  } | null,
  {
    amount: string;
    sourceContract: string;
    destContract: string;
    networkDetails: NetworkDetails;
    publicKey: string;
  },
  { rejectValue: ErrorMessage }
>(
  "getBestSoroswapPath",
  async (
    { amount, sourceContract, destContract, networkDetails, publicKey },
    thunkApi
  ) => {
    try {
      return await soroswapGetBestPath({
        amount,
        sourceContract,
        destContract,
        networkDetails,
        publicKey,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return thunkApi.rejectWithValue({
        errorMessage: message,
      });
    }
  }
);

export const getMemoRequiredAccounts = createAsyncThunk<
  MemoRequiredAccount[],
  undefined,
  { rejectValue: ErrorMessage; state: AppState }
>("getBlockedAccounts", async (_, { getState, rejectWithValue }) => {
  const activePublicKey = publicKeySelector(getState());

  try {
    const resp = await internalGetMemoRequiredAccounts({ activePublicKey });
    return resp.memoRequiredAccounts || [];
  } catch (e) {
    return rejectWithValue({ errorMessage: e as string });
  }
});

export enum ShowOverlayStatus {
  IDLE = "IDLE",
  IN_PROGRESS = "IN_PROGRESS",
}

interface TransactionData {
  amount: string;
  asset: string;
  decimals?: number;
  destination: string;
  federationAddress: string;
  transactionFee: string;
  transactionTimeout: number;
  memo?: string;
  destinationAsset: string;
  destinationDecimals?: number;
  destinationAmount: string;
  destinationIcon: string;
  path: string[];
  allowedSlippage: string;
  isToken: boolean;
  isMergeSelected: boolean;
  balancesToMigrate: BalanceToMigrate[];
  isSoroswap: boolean;
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
  soroswapTokens: SoroswapToken[];
  assetSelect: {
    type: AssetSelectType;
    isSource: boolean;
  };
  memoRequiredAccounts: MemoRequiredAccount[];
  tokenPrices: ApiTokenPrices;
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
    transactionTimeout: 180,
    memo: "",
    destinationAsset: "",
    destinationAmount: "",
    destinationIcon: "",
    path: [],
    allowedSlippage: "1",
    isToken: false,
    isMergeSelected: false,
    balancesToMigrate: [] as BalanceToMigrate[],
    isSoroswap: false,
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
    balances: null,
    isFunded: false,
    subentryCount: 0,
  },
  destinationBalances: {
    balances: null,
    isFunded: true,
    subentryCount: 0,
  },
  assetIcons: {},
  assetDomains: {},
  soroswapTokens: [],
  assetSelect: {
    type: AssetSelectType.MANAGE,
    isSource: true,
  },
  memoRequiredAccounts: [],
  tokenPrices: {},
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
    resetSubmitStatus: (state) => {
      state.submitStatus = initialState.submitStatus;
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
    saveTransactionTimeout: (state, action) => {
      state.transactionData.transactionTimeout = action.payload;
    },
    saveMemo: (state, action) => {
      state.transactionData.memo = action.payload;
    },
    saveDestinationAsset: (state, action) => {
      state.transactionData.destinationAsset = action.payload;
    },
    saveDestinationIcon: (state, action) => {
      state.transactionData.destinationIcon = action.payload;
    },
    saveIsSoroswap: (state, action) => {
      state.transactionData.isSoroswap = action.payload;
    },
    saveAllowedSlippage: (state, action) => {
      state.transactionData.allowedSlippage = action.payload;
    },
    saveIsToken: (state, action) => {
      state.transactionData.isToken = action.payload;
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
      }
    );
    builder.addCase(
      submitFreighterSorobanTransaction.fulfilled,
      (state, action) => {
        state.submitStatus = ActionStatus.SUCCESS;
        state.response = action.payload;
      }
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
      }
    );
    builder.addCase(getBestPath.rejected, (state) => {
      state.transactionData.path = initialState.transactionData.path;
      state.transactionData.destinationAmount =
        initialState.transactionData.destinationAmount;
    });
    builder.addCase(getBestSoroswapPath.rejected, (state) => {
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
      state.accountBalances = action.payload.balances;
      state.accountBalanceStatus = ActionStatus.SUCCESS;
      const { shouldGetTokenPrices } = action.meta.arg;
      if (shouldGetTokenPrices) {
        state.tokenPrices = action.payload.tokenPrices;
      }
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
    builder.addCase(getSoroswapTokens.fulfilled, (state, action) => {
      const soroswapTokens = action.payload || {};

      return {
        ...state,
        soroswapTokens,
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
    builder.addCase(getBestSoroswapPath.fulfilled, (state, action) => {
      if (!action.payload) {
        state.transactionData.path = [];
        state.transactionData.destinationAmount = "";
        return;
      }

      state.transactionData.path = action.payload.path;
      state.transactionData.destinationAmount =
        action.payload.amountOutMin || "";
      state.transactionData.decimals = action.payload.amountInDecimals;
      state.transactionData.destinationDecimals =
        action.payload.amountOutDecimals;
    });
    builder.addCase(getMemoRequiredAccounts.fulfilled, (state, action) => {
      state.memoRequiredAccounts = action.payload;
    });
    builder.addCase(getTokenPrices.rejected, (state, action) => {
      state.error = action.payload;
      state.tokenPrices = initialState.tokenPrices;
    });
    builder.addCase(getTokenPrices.fulfilled, (state, action) => {
      state.tokenPrices = action.payload;
    });
  },
});

export const {
  resetSubmission,
  resetAccountBalanceStatus,
  resetDestinationAmount,
  resetSubmitStatus,
  saveDestination,
  saveFederationAddress,
  saveAmount,
  saveAsset,
  saveTransactionFee,
  saveTransactionTimeout,
  saveMemo,
  saveDestinationAsset,
  saveDestinationIcon,
  saveIsSoroswap,
  saveAllowedSlippage,
  saveIsToken,
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
}) => ({
  accountBalanceStatus: state.accountBalanceStatus,
});
