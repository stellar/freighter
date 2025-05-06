import { createSelector, createSlice } from "@reduxjs/toolkit";
import { AccountBalancesInterface } from "@shared/api/types/backend-api";

interface SaveBalancesPayload {
  publicKey: string;
  balances: AccountBalancesInterface;
}

interface SaveIconsPayload {
  icons: Record<string, string>;
}

interface InitialState {
  balanceData: Record<string, AccountBalancesInterface>;
  icons: Record<string, string>;
}

const initialState: InitialState = {
  balanceData: {},
  icons: {},
};

const balancesSlice = createSlice({
  name: "balances",
  initialState,
  reducers: {
    clearAll(state) {
      state.balanceData = {};
      state.icons = {};
    },
    saveBalancesForAccount(state, action: { payload: SaveBalancesPayload }) {
      state.balanceData = {
        ...state.balanceData,
        [action.payload.publicKey]: action.payload.balances,
      };
    },
    saveIconsForBalances(state, action: { payload: SaveIconsPayload }) {
      state.icons = {
        ...state.icons,
        ...action.payload.icons,
      };
    },
  },
});

export const balancesSelector = (state: { balances: InitialState }) =>
  state.balances.balanceData;
export const iconsSelector = (state: { balances: InitialState }) =>
  state.balances.icons;
export const selectBalancesByPublicKey = (publicKey: string) =>
  createSelector(balancesSelector, (balances) => balances[publicKey]);

export const { reducer } = balancesSlice;
export const { clearAll, saveBalancesForAccount, saveIconsForBalances } =
  balancesSlice.actions;
