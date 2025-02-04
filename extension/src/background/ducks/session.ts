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
>("logIn", async ({ publicKey, allAccounts }, thunkApi) => {
  try {
    await internalSubscribeAccount(publicKey);
    return {
      publicKey,
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

export type InitialState = UiData & AppData;

export interface SessionState {
  session: InitialState;
}

const initialState: InitialState = {
  publicKey: "",
  hashKey: {
    iv: "",
    key: "",
  },
  allAccounts: [] as Account[],
  migratedMnemonicPhrase: "",
};

interface UiData {
  publicKey: string;
  allAccounts?: Account[];
  migratedMnemonicPhrase?: string;
}

interface AppData {
  privateKey?: string;
  hashKey?: { key: string; iv: string };
  password?: string;
}

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    reset: () => initialState,
    logOut: () => initialState,
    setActiveHashKey: (state, action: { payload: AppData }) => {
      const {
        hashKey = {
          iv: "",
          key: "",
        },
      } = action.payload;

      return {
        ...state,
        hashKey,
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
    timeoutAccountAccess: (state) => ({
      ...state,
      hashKey: {
        iv: "",
        key: "",
      },
      password: "",
    }),
    updateAllAccountsAccountName: (
      state,
      action: { payload: { updatedAccountName: string } },
    ) => {
      const { updatedAccountName = "" } = action.payload;

      if (!state.allAccounts) {
        return state;
      }

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
    setActiveHashKey,
    timeoutAccountAccess,
    updateAllAccountsAccountName,
    setMigratedMnemonicPhrase,
  },
} = sessionSlice;

export const publicKeySelector = createSelector(
  sessionSelector,
  (session) => session.publicKey,
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
    return isHardwareWalletActive || !!session?.hashKey?.key;
  },
);
export const hashKeySelector = createSelector(
  sessionSelector,
  (session) => session.hashKey,
);
