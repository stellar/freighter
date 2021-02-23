import { createSelector, createSlice } from "@reduxjs/toolkit";

import { Account } from "@shared/api/types";

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
    logIn: (state, action: { payload: UiData }) => {
      const {
        publicKey,
        mnemonicPhrase = "",
        allAccounts = [],
      } = action.payload;

      return {
        ...state,
        publicKey,
        mnemonicPhrase,
        allAccounts,
      };
    },
    logOut: () => initialState,
    grantAccountAccess: (state, action: { payload: AppData }) => {
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
});

export const sessionSelector = (state: { session: UiData & AppData }) =>
  state.session;

export const {
  actions: {
    logIn,
    logOut,
    grantAccountAccess,
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
  (session) => !!session.privateKey.length,
);
export const privateKeySelector = createSelector(
  sessionSelector,
  (session) => session.privateKey,
);
