import { createSelector, createSlice } from "@reduxjs/toolkit";
import { AccountBalancesInterface } from "@shared/api/types/backend-api";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";

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

type SaveTokenLists = AssetListResponse[];

interface InitialState {
  balanceData: Record<PublicKey, AccountBalancesInterface>;
  icons: Record<AssetCode, IconUrl>;
  homeDomains: Record<PublicKey, HomeDomain>;
  tokenLists: AssetListResponse[];
}

const initialState: InitialState = {
  balanceData: {},
  icons: {},
  homeDomains: {},
  tokenLists: [],
};

const cacheSlice = createSlice({
  name: "balances",
  initialState,
  reducers: {
    clearAll(state) {
      state.balanceData = {};
      state.icons = {};
      state.homeDomains = {};
      state.tokenLists = [];
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
    saveTokenLists(state, action: { payload: SaveTokenLists }) {
      state.tokenLists = action.payload;
    },
  },
});

export const balancesSelector = (state: { cache: InitialState }) =>
  state.cache.balanceData;
export const iconsSelector = (state: { cache: InitialState }) =>
  state.cache.icons;
export const homeDomainsSelector = (state: { cache: InitialState }) =>
  state.cache.homeDomains;
export const tokensListsSelector = (state: { cache: InitialState }) =>
  state.cache.tokenLists;
export const selectBalancesByPublicKey = (publicKey: string) =>
  createSelector(balancesSelector, (balances) => balances[publicKey]);

export const { reducer } = cacheSlice;
export const {
  clearAll,
  saveBalancesForAccount,
  saveIconsForBalances,
  saveDomainForIssuer,
  saveTokenLists,
} = cacheSlice.actions;
