import { createSlice } from "@reduxjs/toolkit";

import { AssetVisibility, CollectibleKey } from "@shared/api/types";

type NetworkName = string;
type PublicKey = string;

/** Visibility for one account on one network. */
export type HiddenCollectiblesMap = Record<CollectibleKey, AssetVisibility>;

interface InitialState {
  /**
   * Mirrors the background store's `[network][publicKey]` shape, so switching
   * account or network needs no invalidation -- it is simply a different key.
   *
   * This is a mirror of durable background state, and the collectibles grid
   * filters against it, so EVERY caller of `changeCollectibleVisibility` must
   * dispatch `saveHiddenCollectibles` with the map it gets back. A write that
   * only reaches the background leaves the mirror stale, and the collectible
   * stays wrongly hidden (or shown) until the popup is reloaded.
   *
   * Current writer: CollectibleDetail (hide/show).
   */
  hiddenCollectibles: Record<
    NetworkName,
    Record<PublicKey, HiddenCollectiblesMap>
  >;
}

const initialState: InitialState = {
  hiddenCollectibles: {},
};

interface SaveHiddenCollectiblesPayload {
  publicKey: PublicKey;
  networkName: NetworkName;
  hiddenCollectibles: HiddenCollectiblesMap;
}

const hiddenCollectiblesSlice = createSlice({
  name: "hiddenCollectibles",
  initialState,
  reducers: {
    saveHiddenCollectibles(
      state,
      { payload }: { payload: SaveHiddenCollectiblesPayload },
    ) {
      const { publicKey, networkName, hiddenCollectibles } = payload;
      state.hiddenCollectibles[networkName] = {
        ...state.hiddenCollectibles[networkName],
        [publicKey]: hiddenCollectibles,
      };
    },
    clearHiddenCollectibles(state) {
      state.hiddenCollectibles = {};
    },
  },
});

export const { saveHiddenCollectibles, clearHiddenCollectibles } =
  hiddenCollectiblesSlice.actions;
export const { reducer } = hiddenCollectiblesSlice;

export const hiddenCollectiblesSelector = (state: {
  hiddenCollectibles: InitialState;
}) => state.hiddenCollectibles.hiddenCollectibles;

/**
 * Returns `undefined` when this account/network has never been loaded, which
 * callers must distinguish from `{}` ("loaded, nothing hidden") -- otherwise a
 * cold popup renders an unfiltered grid.
 */
export const selectHiddenCollectiblesFor = (
  state: { hiddenCollectibles: InitialState },
  networkName: NetworkName,
  publicKey: PublicKey,
): HiddenCollectiblesMap | undefined =>
  state.hiddenCollectibles.hiddenCollectibles[networkName]?.[publicKey];
