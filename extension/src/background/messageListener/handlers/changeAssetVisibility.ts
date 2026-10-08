import { ChangeAssetVisibilityMessage } from "@shared/api/types/message-request";
import { getNetworkDetails } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { resolveHiddenAssetsStore } from "../helpers/get-hidden-assets";
import { HIDDEN_ASSETS } from "constants/localStorageTypes";

export const changeAssetVisibility = async ({
  request,
  localStore,
}: {
  request: ChangeAssetVisibilityMessage;
  localStore: DataStorageAccess;
}) => {
  const { assetVisibility, activePublicKey } = request;

  // `issuer` is the legacy alias for `assetKey`, carrying the identical
  // canonical value. The outgoing API sends both so a worker predating the
  // rename still finds one it understands; accept both here for the mirror
  // case, where a page predating the rename reaches this worker.
  //
  // Bail rather than key off `undefined`: with no identifier the write below
  // would land under the literal string "undefined" and still report success,
  // so Hide/Unhide would silently do nothing while the UI said it worked.
  const assetKey = assetVisibility?.assetKey ?? assetVisibility?.issuer;

  if (!assetKey) {
    return { error: "Missing asset identifier" };
  }

  const { networkName } = await getNetworkDetails({ localStore });

  // Resolved, not read: storage may still hold the pre-5.46.0 flat map, and
  // spreading an empty store over it would erase every earlier hide.
  const store = await resolveHiddenAssetsStore({
    localStore,
    publicKey: activePublicKey,
  });
  const byNetwork = store[networkName] || {};
  const hiddenAssets = {
    ...byNetwork[activePublicKey],
    [assetKey]: assetVisibility.visibility,
  };

  await localStore.setItem(HIDDEN_ASSETS, {
    ...store,
    [networkName]: {
      ...byNetwork,
      [activePublicKey]: hiddenAssets,
    },
  });

  // Return only this account's leaf, so a caller cannot accidentally treat the
  // whole store as a visibility map. `networkName` rides along because the
  // request does not carry one: the popup mirrors this leaf under a network
  // key, and a switch that commits while this write is in flight would
  // otherwise leave it filing the map under the network it *was* on.
  return { hiddenAssets, networkName };
};
