import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { APPLICATION_STATE } from "constants/applicationState";
import { history } from "popup/App";
import {
  confirmMnemonicPhrase as confirmMnemonicPhraseService,
  createAccount as createAccountService,
  recoverAccount as recoverAccountService,
  loadAccount as loadAccountService,
  confirmPassword as confirmPasswordService,
  signOut as signOutService,
} from "api/internal";

interface ErrorMessage {
  errorMessage: string;
}

export const createAccount = createAsyncThunk(
  "auth/createAccount",
  async (password: string) => {
    let res;

    try {
      res = await createAccountService(password);
    } catch (e) {
      console.error(e);
    }

    return res;
  },
);

export const recoverAccount = createAsyncThunk<
  { publicKey: string },
  {
    password: string;
    mnemonicPhrase: string;
  },
  { rejectValue: ErrorMessage }
>("auth/recoverAccount", async ({ password, mnemonicPhrase }, thunkApi) => {
  let res = { publicKey: "" };

  try {
    res = await recoverAccountService(password, mnemonicPhrase);
  } catch (e) {
    console.error(e);
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
      console.error(e);
    }

    if (res.isCorrectPhrase) {
      history.push("/mnemonic-phrase-confirmed");
    } else {
      return thunkApi.rejectWithValue({
        applicationState: res.applicationState,
        errorMessage: "The phrase you entered is incorrect",
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
  },
  string,
  { rejectValue: ErrorMessage }
>("auth/confirmPassword", async (phrase: string, thunkApi) => {
  let res = {
    publicKey: "",
    hasPrivateKey: false,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  };
  try {
    res = await confirmPasswordService(phrase);
  } catch (e) {
    console.error(e);
  }
  if (!res.publicKey) {
    return thunkApi.rejectWithValue({
      errorMessage: "Incorrect Password",
    });
  }

  return res;
});

export const loadAccount = createAsyncThunk("auth/loadAccount", async () => {
  let res;

  try {
    res = await loadAccountService();
  } catch (e) {
    console.error(e);
  }
  return res;
});

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
  applicationState: APPLICATION_STATE;
  hasPrivateKey: boolean;
  publicKey: string;
  error: string;
}

const initialState: InitialState = {
  applicationState: APPLICATION_STATE.APPLICATION_LOADING,
  publicKey: "",
  error: "",
  hasPrivateKey: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(createAccount.fulfilled, (state, action) => {
      const { publicKey } = action.payload || { publicKey: "" };

      return {
        ...state,
        applicationState: APPLICATION_STATE.PASSWORD_CREATED,
        publicKey,
      };
    });

    builder.addCase(recoverAccount.fulfilled, (state, action) => {
      const { publicKey } = action.payload || { publicKey: "" };
      return {
        ...state,
        authError: "",
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
      const { hasPrivateKey, publicKey, applicationState } = action.payload || {
        hasPrivateKey: false,
        publicKey: "",
        applicationState: APPLICATION_STATE.APPLICATION_STARTED,
      };
      return {
        ...state,
        hasPrivateKey,
        applicationState:
          applicationState || APPLICATION_STATE.APPLICATION_STARTED,
        publicKey,
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
      const { publicKey, applicationState, hasPrivateKey } = action.payload || {
        publicKey: "",
        hasPrivateKey: false,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      };
      return {
        ...state,
        hasPrivateKey,
        applicationState:
          applicationState || APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        publicKey,
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
  (auth) => auth.hasPrivateKey,
);
export const applicationStateSelector = createSelector(
  authSelector,
  (auth) => auth.applicationState,
);
export const authErrorSelector = createSelector(
  authSelector,
  (auth) => auth.error,
);
export const publicKeySelector = createSelector(
  authSelector,
  (auth) => auth.publicKey,
);

export { reducer };
