import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";

import { Account, ErrorMessage } from "@shared/api/types";
import {
  getIsHardwareWalletActive,
  subscribeAccount as internalSubscribeAccount,
} from "background/helpers/account";

export const logIn = createAsyncThunk<
  UiData,
  UiData,
  { rejectValue: ErrorMessage }
>("logIn", async ({ publicKey, mnemonicPhrase, allAccounts }, thunkApi) => {
  try {
    await internalSubscribeAccount(publicKey);
    return {
      publicKey,
      mnemonicPhrase,
      allAccounts,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return thunkApi.rejectWithValue({ errorMessage: message });
  }
});

export const setActivePublicKey = createAsyncThunk<
  UiData,
  UiData,
  { rejectValue: ErrorMessage }
>("setActivePublicKey", async ({ publicKey }, thunkApi) => {
  try {
    await internalSubscribeAccount(publicKey);
    return {
      publicKey,
      privateKey: "",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    return thunkApi.rejectWithValue({ errorMessage: message });
  }
});

const initialState = {
  publicKey: "",
  privateKey: "",
  mnemonicPhrase: "",
  allAccounts: [] as Account[],
  migratedMnemonicPhrase: "",
};

interface UiData {
  publicKey: string;
  mnemonicPhrase?: string;
  allAccounts?: Account[];
  migratedMnemonicPhrase?: string;
}

interface AppData {
  privateKey?: string;
  password?: string;
}

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    reset: () => initialState,
    logOut: () => initialState,
    setActivePrivateKey: (state, action: { payload: AppData }) => {
      const { privateKey = "" } = action.payload;

      return {
        ...state,
        privateKey,
      };
    },
    setMigratedMnemonicPhrase: (
      state,
      action: { payload: { migratedMnemonicPhrase: string } },
    ) => {
      const { migratedMnemonicPhrase = "" } = action.payload;

      return {
        ...state,
        migratedMnemonicPhrase,
      };
    },
    timeoutAccountAccess: (state) => ({ ...state, privateKey: "" }),
    updateAllAccountsAccountName: (
      state,
      action: { payload: { updatedAccountName: string } },
    ) => {
      const { updatedAccountName = "" } = action.payload;

      const newAllAccounts = state.allAccounts.map((account) => {
        if (state.publicKey === account.publicKey) {
          // this is the current active public key, let's edit it
          return {
            ...account,
            name: updatedAccountName,
          };
        }

        return account;
      });

      return {
        ...state,
        allAccounts: newAllAccounts,
      };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logIn.fulfilled, (state, action) => {
      state.publicKey = action.payload.publicKey;
      state.mnemonicPhrase = action.payload.mnemonicPhrase || "";
      state.allAccounts = action.payload.allAccounts || [];
    });
    builder.addCase(setActivePublicKey.fulfilled, (state, action) => {
      state.publicKey = action.payload.publicKey;
      state.privateKey = "";
    });
  },
});

export const sessionSelector = (state: { session: UiData & AppData }) =>
  state.session;

export const {
  actions: {
    reset,
    logOut,
    setActivePrivateKey,
    timeoutAccountAccess,
    updateAllAccountsAccountName,
    setMigratedMnemonicPhrase,
  },
} = sessionSlice;

export const publicKeySelector = createSelector(
  sessionSelector,
  (session) => session.publicKey,
);
export const mnemonicPhraseSelector = createSelector(
  sessionSelector,
  (session) => session.mnemonicPhrase,
);
export const migratedMnemonicPhraseSelector = createSelector(
  sessionSelector,
  (session) => session.migratedMnemonicPhrase,
);
export const allAccountsSelector = createSelector(
  sessionSelector,
  (session) => session.allAccounts || [],
);
export const hasPrivateKeySelector = createSelector(
  sessionSelector,
  async (session) => {
    const isHardwareWalletActive = await getIsHardwareWalletActive();
    return isHardwareWalletActive || !!session?.privateKey?.length;
  },
);
export const privateKeySelector = createSelector(
  sessionSelector,
  (session) => session.privateKey || "",
);
export const passwordSelector = createSelector(
  sessionSelector,
  (session) => session.password,
);
