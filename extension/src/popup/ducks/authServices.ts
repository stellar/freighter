import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  addAccount as addAccountService,
  importAccount as importAccountService,
  makeAccountActive as makeAccountActiveService,
  confirmMnemonicPhrase as confirmMnemonicPhraseService,
  createAccount as createAccountService,
  recoverAccount as recoverAccountService,
  loadAccount as loadAccountService,
  confirmPassword as confirmPasswordService,
  signOut as signOutService,
} from "@shared/api/internal";

interface ErrorMessage {
  errorMessage: string;
}

export const createAccount = createAsyncThunk<
  { allAccounts: Array<string>; publicKey: string },
  string,
  { rejectValue: ErrorMessage }
>("auth/createAccount", async (password, thunkApi) => {
  let res = { allAccounts: [] as Array<string>, publicKey: "" };

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

export const addAccount = createAsyncThunk<
  { publicKey: string; allAccounts: Array<string> },
  string,
  { rejectValue: ErrorMessage }
>("auth/addAccount", async (password, thunkApi) => {
  let res = { publicKey: "", allAccounts: [] as Array<string> };

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
  { publicKey: string; allAccounts: Array<string> },
  { password: string; privateKey: string },
  { rejectValue: ErrorMessage }
>("auth/importAccount", async ({ password, privateKey }, thunkApi) => {
  let res = { publicKey: "", allAccounts: [] as Array<string> };

  try {
    res = await importAccountService(password, privateKey);
  } catch (e) {
    console.log(8);
    console.error("Failed when importing an account: ", e);
    return thunkApi.rejectWithValue({
      errorMessage: e,
    });
  }
  return res;
});

export const makeAccountActive = createAsyncThunk(
  "auth/makeAccountActive",
  (publicKey: string) => makeAccountActiveService(publicKey),
);

export const recoverAccount = createAsyncThunk<
  { allAccounts: Array<string>; publicKey: string },
  {
    password: string;
    mnemonicPhrase: string;
  },
  { rejectValue: ErrorMessage }
>("auth/recoverAccount", async ({ password, mnemonicPhrase }, thunkApi) => {
  let res = { allAccounts: [] as Array<string>, publicKey: "" };

  try {
    res = await recoverAccountService(password, mnemonicPhrase);
  } catch (e) {
    console.error("Failed when recovering an account: ", e.message);
    return thunkApi.rejectWithValue({
      errorMessage: e.message,
    });
  }

  if (!res.publicKey) {
    return thunkApi.rejectWithValue({
      errorMessage: "The phrase you entered is incorrect",
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
        errorMessage:
          "The secret phrase you entered is invalid, please check the phrase you have noted and try again.",
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
    allAccounts: Array<string>;
  },
  string,
  { rejectValue: ErrorMessage }
>("auth/confirmPassword", async (phrase: string, thunkApi) => {
  let res = {
    publicKey: "",
    hasPrivateKey: false,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: [""],
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

export const loadAccount = createAsyncThunk("auth/loadAccount", () =>
  loadAccountService(),
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

interface InitialState {
  allAccounts: Array<string>;
  applicationState: APPLICATION_STATE;
  hasPrivateKey: boolean;
  publicKey: string;
  error: string;
}

const initialState: InitialState = {
  allAccounts: [],
  applicationState: APPLICATION_STATE.APPLICATION_LOADING,
  publicKey: "",
  error: "",
  hasPrivateKey: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearApiError(state) {
      state.error = "";
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
      const { publicKey, allAccounts } = action.payload || {
        publicKey: "",
        allAccounts: [],
      };

      return {
        ...state,
        publicKey,
        allAccounts,
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
      const { publicKey, allAccounts } = action.payload || {
        publicKey: "",
        allAccounts: [],
      };

      return {
        ...state,
        publicKey,
        allAccounts,
      };
    });
    builder.addCase(importAccount.rejected, (state, action) => {
      const { errorMessage } = action.payload || { errorMessage: "" };
      console.log(9);

      return {
        ...state,
        error: errorMessage,
      };
    });
    builder.addCase(makeAccountActive.fulfilled, (state, action) => {
      const { publicKey, hasPrivateKey } = action.payload || {
        publicKey: "",
        hasPrivateKey: false,
      };

      return {
        ...state,
        publicKey,
        hasPrivateKey,
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
    builder.addCase(recoverAccount.fulfilled, (state, action) => {
      const { publicKey, allAccounts } = action.payload || {
        publicKey: "",
        allAccounts: [],
      };

      return {
        ...state,
        error: "",
        allAccounts,
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
      } = action.payload || {
        hasPrivateKey: false,
        publicKey: "",
        applicationState: APPLICATION_STATE.APPLICATION_STARTED,
        allAccounts: [],
      };
      return {
        ...state,
        hasPrivateKey,
        applicationState:
          applicationState || APPLICATION_STATE.APPLICATION_STARTED,
        publicKey,
        allAccounts,
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
      } = action.payload || {
        publicKey: "",
        hasPrivateKey: false,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        allAccounts: [""],
      };
      return {
        ...state,
        hasPrivateKey,
        applicationState:
          applicationState || APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        publicKey,
        allAccounts,
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

export const { clearApiError } = authSlice.actions;

export { reducer };
