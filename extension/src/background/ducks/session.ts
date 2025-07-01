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
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const logIn = createAsyncThunk<
  UiData,
  UiData & { localStore: DataStorageAccess },
  { rejectValue: ErrorMessage }
>("logIn", async ({ publicKey, allAccounts, localStore }, thunkApi) => {
  try {
    await internalSubscribeAccount({ publicKey, localStore });
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
  UiData & { localStore: DataStorageAccess },
  { rejectValue: ErrorMessage }
>("setActivePublicKey", async ({ publicKey, localStore }, thunkApi) => {
  try {
    await internalSubscribeAccount({ publicKey, localStore });
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
    updateAccountName: (
      state,
      action: { payload: { publicKey: string; updatedAccountName: string } },
    ) => {
      const { updatedAccountName, publicKey } = action.payload;
      if (!state.allAccounts) {
        return state;
      }

      const newAllAccounts = state.allAccounts.map((account) => {
        if (publicKey === account.publicKey) {
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
    setMigratedMnemonicPhrase,
    updateAccountName,
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

export const buildHasPrivateKeySelector = (localStore: DataStorageAccess) =>
  createSelector(sessionSelector, async (session) => {
    const isHardwareWalletActive = await getIsHardwareWalletActive({
      localStore,
    });
    return isHardwareWalletActive || !!session?.hashKey?.key;
  });

export const hashKeySelector = createSelector(
  sessionSelector,
  (session) => session.hashKey,
);
