import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { APPLICATION_STATE } from "statics";
import { history } from "App";
import {
  confirmMnemonicPhrase as confirmMnemonicPhraseService,
  createAccount as createAccountService,
  recoverAccount as recoverAccountService,
  loadAccount as loadAccountService,
} from "services";

export const createAccount = createAsyncThunk(
  "auth/createAccount",
  async (password: string) => {
    let res;

    try {
      res = await createAccountService(password);
    } catch (e) {
      console.error(e);
    }
    history.push("/mnemonic-phrase");
    return res;
  },
);

export const recoverAccount = createAsyncThunk(
  "auth/recoverAccount",
  async ({
    password,
    mnemonicPhrase,
  }: {
    password: string;
    mnemonicPhrase: string;
  }) => {
    let res;

    try {
      res = await recoverAccountService(password, mnemonicPhrase);
    } catch (e) {
      console.error(e);
    }
    return res;
  },
);

export const confirmMnemonicPhrase = createAsyncThunk(
  "auth/confirmMnemonicPhrase",
  async (phrase: string) => {
    let res = { isCorrectPhrase: false };
    try {
      res = await confirmMnemonicPhraseService(phrase);
    } catch (e) {
      console.error(e);
    }

    if (res.isCorrectPhrase) {
      history.push("/mnemonic-phrase-confirm");
    } else {
      throw new Error("The phrase you entered is incorrect");
    }

    return res;
  },
);

export const loadAccount = createAsyncThunk("auth/getAccount", async () => {
  let res;

  try {
    res = await loadAccountService();
  } catch (e) {
    console.error(e);
  }
  return res;
});
const authSlice = createSlice({
  name: "auth",
  initialState: { applicationState: "", publicKey: "" },
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
        applicationState: APPLICATION_STATE.PASSWORD_CREATED,
        publicKey,
      };
    });

    builder.addCase(confirmMnemonicPhrase.rejected, (state) => {
      return {
        ...state,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_FAILED,
      };
    });
    builder.addCase(confirmMnemonicPhrase.fulfilled, (state) => {
      return {
        ...state,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      };
    });
    builder.addCase(loadAccount.fulfilled, (state, action) => {
      const { publicKey, applicationState } = action.payload || {
        publicKey: "",
        applicationState: "",
      };
      return { ...state, applicationState, publicKey };
    });
  },
});

const { reducer } = authSlice;
const authSelector = (state: { auth: { applicationState: string } }) =>
  state.auth;
export const applicationStateSelector = createSelector(
  authSelector,
  (auth) => auth.applicationState,
);

export { reducer };
