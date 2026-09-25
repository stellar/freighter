import { ChangeAssetVisibilityMessage } from "@shared/api/types/message-request";
import { getNetworkDetails } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getHiddenAssetsStore } from "../helpers/get-hidden-assets";
import { HIDDEN_ASSETS } from "constants/localStorageTypes";

export const changeAssetVisibility = async ({
  request,
  localStore,
}: {
  request: ChangeAssetVisibilityMessage;
  localStore: DataStorageAccess;
}) => {
  const { assetVisibility, activePublicKey } = request;
  const { networkName } = await getNetworkDetails({ localStore });

  const store = await getHiddenAssetsStore({ localStore });
  const byNetwork = store[networkName] || {};
  const hiddenAssets = {
    ...byNetwork[activePublicKey],
    [assetVisibility.assetKey]: assetVisibility.visibility,
  };

  await localStore.setItem(HIDDEN_ASSETS, {
    ...store,
    [networkName]: {
      ...byNetwork,
      [activePublicKey]: hiddenAssets,
    },
  });

  // Return only this account's leaf, so a caller cannot accidentally treat the
  // whole store as a visibility map.
  return { hiddenAssets };
};
