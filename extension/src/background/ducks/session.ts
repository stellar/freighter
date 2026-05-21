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
    key: "",
  },
  allAccounts: [] as Account[],
  migratedMnemonicPhrase: "",
  isHardwareWalletLocked: false,
};

interface UiData {
  publicKey: string;
  allAccounts?: Account[];
  migratedMnemonicPhrase?: string;
}

interface AppData {
  privateKey?: string;
  hashKey?: { key: string };
  password?: string;
  // True once the idle auto-lock alarm fires on a hardware-wallet-active
  // session. Hot-wallet (mnemonic) sessions are gated by `hashKey`
  // instead, which `timeoutAccountAccess` already clears. HW sessions
  // need a dedicated flag because `getIsHardwareWalletActive` is stored
  // in `localStore` and is not cleared by the lock path.
  isHardwareWalletLocked?: boolean;
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
        key: "",
      },
      password: "",
    }),
    // Idle auto-lock for hardware-wallet sessions. `timeoutAccountAccess`
    // clears the hot-wallet `hashKey`, but hardware-wallet "unlocked"
    // state is read off `localStore.isHardwareWalletActive` and is
    // unaffected by that — so without this flag, the idle alarm firing
    // on an HW-only session would be a silent no-op.
    lockHardwareWallet: (state) => ({
      ...state,
      isHardwareWalletLocked: true,
    }),
    unlockHardwareWallet: (state) => ({
      ...state,
      isHardwareWalletLocked: false,
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
    lockHardwareWallet,
    unlockHardwareWallet,
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
    if (isHardwareWalletActive && !session?.isHardwareWalletLocked) {
      return true;
    }
    return !!session?.hashKey?.key;
  });

export const isHardwareWalletLockedSelector = createSelector(
  sessionSelector,
  (session) => !!session?.isHardwareWalletLocked,
);

export const hashKeySelector = createSelector(
  sessionSelector,
  (session) => session.hashKey,
);
