import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import * as Sentry from "@sentry/browser";
import { Networks } from "soroban-client";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  addAccount as addAccountService,
  importAccount as importAccountService,
  importHardwareWallet as importHardwareWalletService,
  makeAccountActive as makeAccountActiveService,
  updateAccountName as updateAccountNameService,
  confirmMnemonicPhrase as confirmMnemonicPhraseService,
  createAccount as createAccountService,
  fundAccount as fundAccountService,
  recoverAccount as recoverAccountService,
  loadAccount as loadAccountService,
  confirmPassword as confirmPasswordService,
  signOut as signOutService,
  addTokenId as addTokenIdService,
} from "@shared/api/internal";
import { Account, AccountType, ErrorMessage } from "@shared/api/types";
import { WalletType } from "@shared/constants/hardwareWallet";

import { AppState } from "popup/App";
import { METRICS_DATA } from "constants/localStorageTypes";
import { MetricsData } from "helpers/metrics";

export const createAccount = createAsyncThunk<
  { allAccounts: Array<Account>; publicKey: string },
  string,
  { rejectValue: ErrorMessage }
>("auth/createAccount", async (password, thunkApi) => {
  let res = { allAccounts: [] as Array<Account>, publicKey: "" };

  try {
    res = await createAccountService(password);
  } catch (e) {
    console.error("Failed when creating an account: ", e.message);
    return thunkApi.rejectWithValue({
      errorMessage: e.message,
    });
  }
  return res;
});

export const fundAccount = createAsyncThunk(
  "auth/fundAccount",
  async (publicKey: string) => {
    try {
      await fundAccountService(publicKey);
    } catch (e) {
      console.error("Failed when funding an account: ", e.message);
    }
  },
);

export const addAccount = createAsyncThunk<
  { publicKey: string; allAccounts: Array<Account>; hasPrivateKey: boolean },
  string,
  { rejectValue: ErrorMessage }
>("auth/addAccount", async (password, thunkApi) => {
  let res = {
    publicKey: "",
    allAccounts: [] as Array<Account>,
    hasPrivateKey: false,
  };

  try {
    res = await addAccountService(password);
  } catch (e) {
    console.error("Failed when creating an account: ", e.message);
    return thunkApi.rejectWithValue({
      errorMessage: e.message,
    });
  }
  return res;
});

export const importAccount = createAsyncThunk<
  { publicKey: string; allAccounts: Array<Account>; hasPrivateKey: boolean },
  { password: string; privateKey: string },
  { rejectValue: ErrorMessage }
>("auth/importAccount", async ({ password, privateKey }, thunkApi) => {
  let res = {
    publicKey: "",
    allAccounts: [] as Array<Account>,
    hasPrivateKey: false,
  };

  try {
    res = await importAccountService(password, privateKey);
  } catch (e) {
    console.error("Failed when importing an account: ", e);
    return thunkApi.rejectWithValue({
      errorMessage: e.message,
    });
  }
  return res;
});

export const importHardwareWallet = createAsyncThunk<
  {
    publicKey: string;
    allAccounts: Array<Account>;
    hasPrivateKey: boolean;
    bipPath: string;
  },
  { publicKey: string; hardwareWalletType: WalletType; bipPath: string },
  { rejectValue: ErrorMessage }
>(
  "auth/importHardwareWallet",
  async ({ publicKey, hardwareWalletType, bipPath }, thunkApi) => {
    let res = {
      publicKey: "",
      allAccounts: [] as Array<Account>,
      hasPrivateKey: false,
      bipPath: "",
    };
    try {
      res = await importHardwareWalletService(
        publicKey,
        hardwareWalletType,
        bipPath,
      );
    } catch (e) {
      console.error("Failed when importing hardware wallet: ", e);
      return thunkApi.rejectWithValue({ errorMessage: e.message });
    }
    return res;
  },
);

export const makeAccountActive = createAsyncThunk<
  { publicKey: string; hasPrivateKey: boolean; bipPath: string },
  string,
  { rejectValue: ErrorMessage; state: AppState }
>("auth/makeAccountActive", async (publicKey: string, thunkApi) => {
  try {
    const res = await makeAccountActiveService(publicKey);
    const { allAccounts } = authSelector(thunkApi.getState());
    storeAccountMetricsData(publicKey, allAccounts);
    return res;
  } catch (e) {
    return thunkApi.rejectWithValue({ errorMessage: e });
  }
});

export const updateAccountName = createAsyncThunk(
  "auth/updateAccountName",
  (accountName: string) => updateAccountNameService(accountName),
);

export const recoverAccount = createAsyncThunk<
  {
    allAccounts: Array<Account>;
    hasPrivateKey: boolean;
    publicKey: string;
    error: string;
  },
  {
    password: string;
    mnemonicPhrase: string;
  },
  { rejectValue: ErrorMessage }
>("auth/recoverAccount", async ({ password, mnemonicPhrase }, thunkApi) => {
  let res = {
    allAccounts: [] as Array<Account>,
    publicKey: "",
    hasPrivateKey: false,
    error: "",
  };

  try {
    res = await recoverAccountService(password, mnemonicPhrase);
  } catch (e) {
    console.error("Failed when recovering an account: ", e.message);
    return thunkApi.rejectWithValue({
      errorMessage: e.message,
    });
  }

  if (!res.publicKey || res.error) {
    return thunkApi.rejectWithValue({
      errorMessage: res.error || "The phrase you entered is incorrect",
    });
  }

  return res;
});

export const confirmMnemonicPhrase = createAsyncThunk<
  { applicationState: APPLICATION_STATE; isCorrectPhrase: boolean },
  string,
  { rejectValue: ErrorMessage & { applicationState: APPLICATION_STATE } }
>(
  "auth/confirmMnemonicPhrase",

  async (phrase: string, thunkApi) => {
    let res = {
      isCorrectPhrase: false,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_FAILED,
    };
    try {
      res = await confirmMnemonicPhraseService(phrase);
    } catch (e) {
      console.error("Failed when confirming Mnemonic Phrase: ", e.message);
      return thunkApi.rejectWithValue({
        applicationState: res.applicationState,
        errorMessage: e.message,
      });
    }

    if (res.isCorrectPhrase) {
      res = {
        isCorrectPhrase: true,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      };
    } else {
      return thunkApi.rejectWithValue({
        applicationState: res.applicationState,
        errorMessage: "The secret phrase you entered is incorrect.",
      });
    }

    return res;
  },
);

export const confirmPassword = createAsyncThunk<
  {
    publicKey: string;
    hasPrivateKey: boolean;
    applicationState: APPLICATION_STATE;
    allAccounts: Array<Account>;
    bipPath: string;
  },
  string,
  { rejectValue: ErrorMessage }
>("auth/confirmPassword", async (phrase: string, thunkApi) => {
  let res = {
    publicKey: "",
    hasPrivateKey: false,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: [] as Array<Account>,
    bipPath: "",
  };
  try {
    res = await confirmPasswordService(phrase);
  } catch (e) {
    console.error("Failed when confirming a password: ", e.message);
    return thunkApi.rejectWithValue({
      errorMessage: e.message,
    });
  }
  if (!res.publicKey) {
    return thunkApi.rejectWithValue({
      errorMessage: "Incorrect Password",
    });
  }

  return res;
});

const storeAccountMetricsData = (
  publicKey: string,
  allAccounts: Array<Account>,
) => {
  const metricsData: MetricsData = JSON.parse(
    localStorage.getItem(METRICS_DATA) || "{}",
  );

  let accountType = AccountType.FREIGHTER;
  allAccounts.forEach((acc: Account) => {
    if (acc.hardwareWalletType) {
      metricsData.hwExists = true;
    } else if (acc.imported) {
      metricsData.importedExists = true;
    }

    if (acc.publicKey === publicKey) {
      if (acc.hardwareWalletType) {
        accountType = AccountType.HW;
      } else if (acc.imported) {
        accountType = AccountType.IMPORTED;
      } else {
        accountType = AccountType.FREIGHTER;
      }
    }
  });
  metricsData.accountType = accountType;
  localStorage.setItem(METRICS_DATA, JSON.stringify(metricsData));
};

export const loadAccount = createAsyncThunk(
  "auth/loadAccount",
  async (_arg, thunkApi) => {
    let res;
    let error;
    try {
      res = await loadAccountService();
      storeAccountMetricsData(res.publicKey, res.allAccounts);
      return res;
    } catch (e) {
      console.error(e);
      error = e;
      Sentry.captureException(`Error loading account: ${error}`);
    }

    if (!res) {
      return thunkApi.rejectWithValue({ errorMessage: error });
    }

    return res;
  },
);

export const signOut = createAsyncThunk<
  APPLICATION_STATE,
  void,
  { rejectValue: ErrorMessage }
>("auth/signOut", async (_arg, thunkApi) => {
  let res = {
    publicKey: "",
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  };
  try {
    res = await signOutService();
  } catch (e) {
    console.error(e);
  }

  if (res?.publicKey) {
    return thunkApi.rejectWithValue({
      errorMessage: "Unable to sign out",
    });
  }

  return res?.applicationState;
});

export const addTokenId = createAsyncThunk<
  { tokenIdList: string[] },
  { tokenId: string; network: Networks },
  { rejectValue: ErrorMessage }
>("auth/addToken", async ({ tokenId, network }, thunkApi) => {
  let res = {
    tokenIdList: [] as string[],
  };

  try {
    res = await addTokenIdService(tokenId, network);
  } catch (e) {
    console.error("Failed when adding a token: ", e.message);
    return thunkApi.rejectWithValue({
      errorMessage: e.message,
    });
  }
  return res;
});

interface InitialState {
  allAccounts: Array<Account>;
  applicationState: APPLICATION_STATE;
  hasPrivateKey: boolean;
  publicKey: string;
  connectingWalletType: WalletType;
  bipPath: string;
  tokenIdList: string[];
  error: string;
}

const initialState: InitialState = {
  allAccounts: [],
  applicationState: APPLICATION_STATE.APPLICATION_LOADING,
  hasPrivateKey: false,
  publicKey: "",
  connectingWalletType: WalletType.NONE,
  bipPath: "",
  tokenIdList: [],
  error: "",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearApiError(state) {
      state.error = "";
    },
    setConnectingWalletType(state, action) {
      state.connectingWalletType = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createAccount.fulfilled, (state, action) => {
      const { allAccounts, publicKey } = action.payload || {
        publicKey: "",
        allAccounts: [],
      };

      return {
        ...state,
        allAccounts,
        applicationState: APPLICATION_STATE.PASSWORD_CREATED,
        publicKey,
      };
    });
    builder.addCase(createAccount.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(addAccount.fulfilled, (state, action) => {
      const { publicKey, allAccounts, hasPrivateKey } = action.payload || {
        publicKey: "",
        allAccounts: [],
        hasPrivateKey: false,
      };

      return {
        ...state,
        error: "",
        // to be safe lets clear bipPath here, which is only for hWs
        bipPath: "",
        publicKey,
        allAccounts,
        hasPrivateKey,
      };
    });
    builder.addCase(addAccount.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(importAccount.fulfilled, (state, action) => {
      const { publicKey, allAccounts, hasPrivateKey } = action.payload || {
        publicKey: "",
        allAccounts: [],
        hasPrivateKey: false,
      };

      return {
        ...state,
        error: "",
        // to be safe lets clear bipPath here, which is only for hWs
        bipPath: "",
        publicKey,
        allAccounts,
        hasPrivateKey,
      };
    });
    builder.addCase(importAccount.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(importHardwareWallet.fulfilled, (state, action) => {
      const { publicKey, allAccounts, hasPrivateKey, bipPath } = action.payload;
      return {
        ...state,
        error: "",
        publicKey,
        allAccounts,
        hasPrivateKey,
        bipPath,
      };
    });
    builder.addCase(importHardwareWallet.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(makeAccountActive.fulfilled, (state, action) => {
      const { publicKey, hasPrivateKey, bipPath } = action.payload || {
        publicKey: "",
        hasPrivateKey: false,
        bipPath: "",
      };

      return {
        ...state,
        publicKey,
        hasPrivateKey,
        bipPath,
      };
    });
    builder.addCase(makeAccountActive.rejected, (state, action) => {
      const {
        message = "Freighter was unable to switch to this account",
      } = action.error;

      return {
        ...state,
        error: message,
      };
    });
    builder.addCase(updateAccountName.fulfilled, (state, action) => {
      const { allAccounts } = action.payload || {
        allAccounts: [],
      };

      return {
        ...state,
        allAccounts,
      };
    });
    builder.addCase(updateAccountName.rejected, (state, action) => {
      const {
        message = "Freighter was unable update this account's name",
      } = action.error;

      return {
        ...state,
        error: message,
      };
    });
    builder.addCase(recoverAccount.fulfilled, (state, action) => {
      const { publicKey, allAccounts, hasPrivateKey } = action.payload || {
        publicKey: "",
        allAccounts: [],
        hasPrivateKey: false,
      };

      return {
        ...state,
        error: "",
        allAccounts,
        hasPrivateKey,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        publicKey,
      };
    });
    builder.addCase(recoverAccount.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(confirmMnemonicPhrase.rejected, (state, action) => {
      const { applicationState, errorMessage } = action.payload || {
        errorMessage: "",
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_FAILED,
      };

      return {
        ...state,
        applicationState,
        error: errorMessage,
      };
    });
    builder.addCase(confirmMnemonicPhrase.fulfilled, (state, action) => ({
      ...state,
      applicationState: action.payload.applicationState,
    }));
    builder.addCase(loadAccount.fulfilled, (state, action) => {
      const {
        hasPrivateKey,
        publicKey,
        applicationState,
        allAccounts,
        bipPath,
        tokenIdList,
      } = action.payload || {
        hasPrivateKey: false,
        publicKey: "",
        applicationState: APPLICATION_STATE.APPLICATION_STARTED,
        allAccounts: [],
        bipPath: "",
        tokenIdList: [],
      };
      return {
        ...state,
        hasPrivateKey,
        applicationState:
          applicationState || APPLICATION_STATE.APPLICATION_STARTED,
        publicKey,
        allAccounts,
        bipPath,
        tokenIdList,
      };
    });
    builder.addCase(loadAccount.rejected, (state, action) => {
      const {
        message = "An unknown error occurred when loading your account",
      } = action.error;
      return {
        ...state,
        applicationState: APPLICATION_STATE.APPLICATION_ERROR,
        error: message,
      };
    });
    builder.addCase(confirmPassword.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(confirmPassword.fulfilled, (state, action) => {
      const {
        publicKey,
        applicationState,
        hasPrivateKey,
        allAccounts,
        bipPath,
      } = action.payload || {
        publicKey: "",
        hasPrivateKey: false,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        allAccounts: [""],
        bipPath: "",
      };
      return {
        ...state,
        hasPrivateKey,
        applicationState:
          applicationState || APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        publicKey,
        allAccounts,
        bipPath,
        error: "",
      };
    });
    builder.addCase(signOut.fulfilled, (_state, action) => {
      const applicationState = action.payload || {
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      };
      return {
        ...initialState,
        applicationState:
          applicationState || APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      };
    });
    builder.addCase(addTokenId.fulfilled, (state, action) => {
      const { tokenIdList } = action.payload || {
        tokenIdList: [],
      };

      return {
        ...state,
        error: "",
        tokenIdList,
      };
    });
    builder.addCase(addTokenId.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };

      return {
        ...state,
        error: errorMessage,
      };
    });
  },
});

const { reducer } = authSlice;
const authSelector = (state: { auth: InitialState }) => state.auth;
export const hasPrivateKeySelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.hasPrivateKey,
);
export const allAccountsSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.allAccounts,
);
export const applicationStateSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.applicationState,
);
export const authErrorSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.error,
);
export const publicKeySelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.publicKey,
);
export const bipPathSelector = createSelector(
  authSelector,
  (auth: InitialState) => auth.bipPath,
);

export const accountNameSelector = createSelector(
  publicKeySelector,
  allAccountsSelector,
  (publicKey, allAccounts) => {
    const { name } = allAccounts.find(
      ({ publicKey: accountPublicKey }) => accountPublicKey === publicKey,
    ) || { publicKey: "", name: "" };

    return name;
  },
);

export const hardwareWalletTypeSelector = createSelector(
  publicKeySelector,
  allAccountsSelector,
  (publicKey, allAccounts) => {
    const account = allAccounts.find(
      ({ publicKey: accountPublicKey }) => accountPublicKey === publicKey,
    ) || { hardwareWalletType: WalletType.NONE };
    return account.hardwareWalletType;
  },
);

export const { clearApiError, setConnectingWalletType } = authSlice.actions;

export { reducer };
