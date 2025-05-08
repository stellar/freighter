import { createSelector, createSlice } from "@reduxjs/toolkit";
import { AccountBalancesInterface } from "@shared/api/types/backend-api";

type AssetCode = string;
type PublicKey = string;
type IconUrl = string;
type HomeDomain = string;

interface SaveBalancesPayload {
  publicKey: PublicKey;
  balances: AccountBalancesInterface;
}

interface SaveIconsPayload {
  icons: Record<AssetCode, IconUrl>;
}

type SaveDomainPayload = Record<PublicKey, HomeDomain>;

interface InitialState {
  balanceData: Record<PublicKey, AccountBalancesInterface>;
  icons: Record<AssetCode, IconUrl>;
  homeDomains: Record<PublicKey, HomeDomain>;
}

const initialState: InitialState = {
  balanceData: {},
  icons: {},
  homeDomains: {},
};

const balancesSlice = createSlice({
  name: "balances",
  initialState,
  reducers: {
    clearAll(state) {
      state.balanceData = {};
      state.icons = {};
      state.homeDomains = {};
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
    saveDomainForIssuer(state, action: { payload: SaveDomainPayload }) {
      state.homeDomains = {
        ...state.homeDomains,
        ...action.payload,
      };
    },
  },
});

export const balancesSelector = (state: { balances: InitialState }) =>
  state.balances.balanceData;
export const iconsSelector = (state: { balances: InitialState }) =>
  state.balances.icons;
export const homeDomainsSelector = (state: { balances: InitialState }) =>
  state.balances.homeDomains;
export const selectBalancesByPublicKey = (publicKey: string) =>
  createSelector(balancesSelector, (balances) => balances[publicKey]);

export const { reducer } = balancesSlice;
export const {
  clearAll,
  saveBalancesForAccount,
  saveIconsForBalances,
  saveDomainForIssuer,
} = balancesSlice.actions;
