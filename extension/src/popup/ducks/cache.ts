import { createSelector, createSlice } from "@reduxjs/toolkit";
import { AccountBalancesInterface } from "@shared/api/types/backend-api";
import { NetworkDetails } from "@shared/constants/stellar";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { HistoryResponse } from "helpers/hooks/useGetHistory";
import { TokenDetailsResponse } from "helpers/hooks/useTokenDetails";
import { ApiTokenPrices, Collection } from "@shared/api/types";
import { TrendingAsset } from "popup/helpers/trendingAssets";

type AssetCode = string;
type PublicKey = string;
type IconUrl = string | null;
type HomeDomain = string | null;

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

type SaveDomainPayload = {
  homeDomains: Record<PublicKey, HomeDomain>;
  networkDetails: NetworkDetails;
};

type SaveTokenLists = AssetListResponse[];

type SaveTokenDetailsPayload = { contractId: string } & TokenDetailsResponse;

type SaveTokenPricesPayload = {
  publicKey: string;
  tokenPrices: ApiTokenPrices;
};

type SaveCollectionsPayload = {
  publicKey: PublicKey;
  networkDetails: NetworkDetails;
  collections: Collection[];
};

type SavePopularTokensPayload = {
  networkDetails: NetworkDetails;
  tokens: TrendingAsset[];
};

// ~30-min staleness window for the Popular list Redux cache (§2.8).
export const POPULAR_TOKENS_STALE_MS = 30 * 60 * 1000;

interface InitialState {
  balanceData: {
    [network: string]: Record<
      PublicKey,
      AccountBalancesInterface & { updatedAt: number }
    >;
  };
  icons: Record<AssetCode, IconUrl>;
  homeDomains: { [network: string]: Record<PublicKey, HomeDomain> };
  tokenLists: AssetListResponse[];
  tokenDetails: {
    [contractId: string]: TokenDetailsResponse;
  };
  historyData: {
    [network: string]: Record<PublicKey, HistoryResponse>;
  };
  tokenPrices: {
    [publicKey: string]: ApiTokenPrices & { updatedAt: number };
  };
  collections: { [network: string]: Record<PublicKey, Collection[]> };
  popularTokens: {
    [network: string]: { tokens: TrendingAsset[]; updatedAt: number };
  };
}

const initialState: InitialState = {
  balanceData: {},
  icons: {},
  homeDomains: {},
  tokenLists: [],
  tokenDetails: {},
  historyData: {},
  tokenPrices: {},
  collections: {},
  popularTokens: {},
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
      state.tokenPrices = {};
      state.popularTokens = {};
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
      if (state.balanceData[action.payload.networkDetails.network]) {
        delete state.balanceData[action.payload.networkDetails.network][
          action.payload.publicKey
        ];
      }
      delete state.tokenPrices[action.payload.publicKey];
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
        [action.payload.networkDetails.network]: {
          ...state.homeDomains[action.payload.networkDetails.network],
          ...action.payload.homeDomains,
        },
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
    saveTokenPrices(state, action: { payload: SaveTokenPricesPayload }) {
      state.tokenPrices = {
        ...state.tokenPrices,
        [action.payload.publicKey]: {
          ...action.payload.tokenPrices,
          updatedAt: Date.now(),
        } as ApiTokenPrices & { updatedAt: number },
      };
    },
    saveCollections(state, action: { payload: SaveCollectionsPayload }) {
      state.collections = {
        ...state.collections,
        [action.payload.networkDetails.network]: {
          ...(state.collections[action.payload.networkDetails.network] || {}),
          [action.payload.publicKey]: action.payload.collections,
        },
      };
    },
    clearCollectiblesForAccount(
      state,
      action: { payload: ClearBalancesPayload },
    ) {
      if (state.collections[action.payload.networkDetails.network]) {
        delete state.collections[action.payload.networkDetails.network][
          action.payload.publicKey
        ];
      }
    },
    savePopularTokens(state, action: { payload: SavePopularTokensPayload }) {
      state.popularTokens = {
        ...state.popularTokens,
        [action.payload.networkDetails.network]: {
          tokens: action.payload.tokens,
          updatedAt: Date.now(),
        },
      };
    },
  },
  extraReducers: (builder) => {
    // The verified token lists are network-specific but stored as a flat array
    // (not keyed by network like balanceData/popularTokens), so drop them when
    // the network changes to force a refetch for the new network. Otherwise the
    // swap Popular list (trending ∩ verified) — and every other verified-list
    // consumer — keeps showing the previous network's results until the popup
    // (and its in-memory store) is reopened.
    builder.addCase("settings/changeNetwork/fulfilled", (state) => {
      state.tokenLists = [];
    });
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
export const tokenPricesSelector = (state: { cache: InitialState }) =>
  state.cache.tokenPrices;
export const selectBalancesByPublicKey = (publicKey: string) =>
  createSelector(balancesSelector, (balances) => balances[publicKey]);
export const collectionsSelector = (state: { cache: InitialState }) =>
  state.cache.collections;
export const popularTokensSelector = (state: { cache: InitialState }) =>
  state.cache.popularTokens;

export const { reducer } = cacheSlice;
export const {
  clearAll,
  saveBalancesForAccount,
  saveHistoryForAccount,
  saveIconsForBalances,
  saveDomainForIssuer,
  saveTokenLists,
  saveTokenDetails,
  saveTokenPrices,
  saveCollections,
  clearBalancesForAccount,
  clearCollectiblesForAccount,
  savePopularTokens,
} = cacheSlice.actions;
