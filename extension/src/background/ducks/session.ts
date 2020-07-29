import { createSelector, createSlice } from "@reduxjs/toolkit";

const initialState = {
  publicKey: "",
  privateKey: "",
  mnemonicPhrase: "",
};

interface UiData {
  publicKey: string;
  mnemonicPhrase?: string;
}

interface AppData {
  privateKey: string;
}

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    logIn: (state, action: { payload: UiData }) => {
      const { publicKey, mnemonicPhrase = "" } = action.payload;

      return {
        ...state,
        publicKey,
        mnemonicPhrase,
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
    timeoutAccountAccess: (state) => ({ ...state, privateKey: "" }),
  },
});

export const sessionSelector = (state: { session: UiData & AppData }) =>
  state.session;

export const {
  actions: { logIn, logOut, grantAccountAccess, timeoutAccountAccess },
} = sessionSlice;

export const publicKeySelector = createSelector(
  sessionSelector,
  (session) => session.publicKey,
);
export const mnemonicPhraseSelector = createSelector(
  sessionSelector,
  (session) => session.mnemonicPhrase,
);
export const hasPrivateKeySelector = createSelector(
  sessionSelector,
  (session) => !!session.privateKey.length,
);
export const privateKeySelector = createSelector(
  sessionSelector,
  (session) => session.privateKey,
);
