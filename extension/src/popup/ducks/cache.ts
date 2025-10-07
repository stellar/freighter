import { createSelector, createSlice } from "@reduxjs/toolkit";
import { AccountBalancesInterface } from "@shared/api/types/backend-api";
import { NetworkDetails } from "@shared/constants/stellar";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { HistoryResponse } from "helpers/hooks/useGetHistory";
import { TokenDetailsResponse } from "helpers/hooks/useTokenDetails";

type AssetCode = string;
type PublicKey = string;
type IconUrl = string;
type HomeDomain = string;

interface SaveBalancesPayload {
  publicKey: PublicKey;
  balances: AccountBalancesInterface;
  networkDetails: NetworkDetails;
}

interface SaveHistoryPayload {
  publicKey: PublicKey;
  history: HistoryResponse;
  networkDetails: NetworkDetails;
}

interface ClearBalancesPayload {
  publicKey: PublicKey;
  networkDetails: NetworkDetails;
}

interface SaveIconsPayload {
  icons: Record<AssetCode, IconUrl>;
}

type SaveDomainPayload = Record<PublicKey, HomeDomain>;

type SaveTokenLists = AssetListResponse[];

type SaveTokenDetailsPayload = { contractId: string } & TokenDetailsResponse;

interface InitialState {
  balanceData: {
    [network: string]: Record<
      PublicKey,
      AccountBalancesInterface & { updatedAt: number }
    >;
  };
  icons: Record<AssetCode, IconUrl>;
  homeDomains: Record<PublicKey, HomeDomain>;
  tokenLists: AssetListResponse[];
  tokenDetails: {
    [contractId: string]: TokenDetailsResponse;
  };
  historyData: {
    [network: string]: Record<PublicKey, HistoryResponse>;
  };
}

const initialState: InitialState = {
  balanceData: {},
  icons: {},
  homeDomains: {},
  tokenLists: [],
  tokenDetails: {},
  historyData: {},
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
      state.tokenDetails = {};
      state.historyData = {};
    },
    saveBalancesForAccount(state, action: { payload: SaveBalancesPayload }) {
      state.balanceData = {
        ...state.balanceData,
        [action.payload.networkDetails.network]: {
          ...state.balanceData[action.payload.networkDetails.network],
          [action.payload.publicKey]: {
            ...action.payload.balances,
            updatedAt: Date.now(),
          },
        },
      };
    },
    saveHistoryForAccount(state, action: { payload: SaveHistoryPayload }) {
      state.historyData = {
        ...state.historyData,
        [action.payload.networkDetails.network]: {
          ...state.historyData[action.payload.networkDetails.network],
          [action.payload.publicKey]: action.payload.history,
        },
      };
    },
    clearBalancesForAccount(state, action: { payload: ClearBalancesPayload }) {
      delete state.balanceData[action.payload.networkDetails.network][
        action.payload.publicKey
      ];
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
    saveTokenDetails(state, action: { payload: SaveTokenDetailsPayload }) {
      state.tokenDetails = {
        ...state.tokenDetails,
        [action.payload.contractId]: action.payload,
      };
    },
  },
});

export const balancesSelector = (state: { cache: InitialState }) =>
  state.cache.balanceData;
export const historySelector = (state: { cache: InitialState }) =>
  state.cache.historyData;
export const iconsSelector = (state: { cache: InitialState }) =>
  state.cache.icons;
export const homeDomainsSelector = (state: { cache: InitialState }) =>
  state.cache.homeDomains;
export const tokensListsSelector = (state: { cache: InitialState }) =>
  state.cache.tokenLists;
export const tokenDetailsSelector = (state: { cache: InitialState }) =>
  state.cache.tokenDetails;
export const selectBalancesByPublicKey = (publicKey: string) =>
  createSelector(balancesSelector, (balances) => balances[publicKey]);

export const { reducer } = cacheSlice;
export const {
  clearAll,
  saveBalancesForAccount,
  saveHistoryForAccount,
  saveIconsForBalances,
  saveDomainForIssuer,
  saveTokenLists,
  saveTokenDetails,
  clearBalancesForAccount,
} = cacheSlice.actions;
