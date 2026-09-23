import { createSlice } from "@reduxjs/toolkit";

import { AssetKey, AssetVisibility } from "@shared/api/types";

type NetworkName = string;
type PublicKey = string;

/** Visibility for one account on one network. */
export type HiddenAssetsMap = Record<AssetKey, AssetVisibility>;

interface InitialState {
  /**
   * Mirrors the background store's `[network][publicKey]` shape, so switching
   * account or network needs no invalidation -- it is simply a different key.
   *
   * This is a mirror of durable background state. Nothing else writes
   * HIDDEN_ASSETS, so the mirror cannot go stale; if that ever stops being
   * true, this slice has to be invalidated on the other writer.
   */
  hiddenAssets: Record<NetworkName, Record<PublicKey, HiddenAssetsMap>>;
}

const initialState: InitialState = {
  hiddenAssets: {},
};

interface SaveHiddenAssetsPayload {
  publicKey: PublicKey;
  networkName: NetworkName;
  hiddenAssets: HiddenAssetsMap;
}

const hiddenAssetsSlice = createSlice({
  name: "hiddenAssets",
  initialState,
  reducers: {
    saveHiddenAssets(state, { payload }: { payload: SaveHiddenAssetsPayload }) {
      const { publicKey, networkName, hiddenAssets } = payload;
      state.hiddenAssets[networkName] = {
        ...state.hiddenAssets[networkName],
        [publicKey]: hiddenAssets,
      };
    },
    clearHiddenAssets(state) {
      state.hiddenAssets = {};
    },
  },
});

export const { saveHiddenAssets, clearHiddenAssets } =
  hiddenAssetsSlice.actions;
export const { reducer } = hiddenAssetsSlice;

export const hiddenAssetsSelector = (state: { hiddenAssets: InitialState }) =>
  state.hiddenAssets.hiddenAssets;

/**
 * Returns `undefined` when this account/network has never been loaded, which
 * callers must distinguish from `{}` ("loaded, nothing hidden") -- otherwise a
 * cold popup renders unfiltered balances.
 */
export const selectHiddenAssetsFor = (
  state: { hiddenAssets: InitialState },
  networkName: NetworkName,
  publicKey: PublicKey,
): HiddenAssetsMap | undefined =>
  state.hiddenAssets.hiddenAssets[networkName]?.[publicKey];
