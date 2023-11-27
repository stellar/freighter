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
    return thunkApi.rejectWithValue({ errorMessage: e.message || e });
  }
});

const initialState = {
  publicKey: "",
  privateKey: "",
  mnemonicPhrase: "",
  allAccounts: [] as Array<Account>,
};

interface UiData {
  publicKey: string;
  mnemonicPhrase?: string;
  allAccounts?: Array<Account>;
}

interface AppData {
  privateKey: string;
}

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    reset: () => initialState,
    logOut: () => initialState,
    setActivePrivateKey: (state, action: { payload: AppData }) => {
      const { privateKey } = action.payload;

      return {
        ...state,
        privateKey,
      };
    },
    setActivePublicKey: (state, action: { payload: UiData }) => {
      const { publicKey } = action.payload;

      return {
        ...state,
        publicKey,
        privateKey: "",
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
  },
});

export const sessionSelector = (state: { session: UiData & AppData }) =>
  state.session;

export const {
  actions: {
    reset,
    logOut,
    setActivePrivateKey,
    setActivePublicKey,
    timeoutAccountAccess,
    updateAllAccountsAccountName,
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
export const allAccountsSelector = createSelector(
  sessionSelector,
  (session) => session.allAccounts || [],
);
export const hasPrivateKeySelector = createSelector(
  sessionSelector,
  async (session) => {
    const isHardwareWalletActive = await getIsHardwareWalletActive();
    return isHardwareWalletActive || !!session.privateKey.length;
  },
);
export const privateKeySelector = createSelector(
  sessionSelector,
  (session) => session.privateKey,
);
