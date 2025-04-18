import { AddRecentAddressMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { RECENT_ADDRESSES } from "constants/localStorageTypes";

export const addRecentAddress = async ({
  request,
  localStore,
}: {
  request: AddRecentAddressMessage;
  localStore: DataStorageAccess;
}) => {
  const { publicKey } = request;
  const storedData = (await localStore.getItem(RECENT_ADDRESSES)) || [];
  const recentAddresses = storedData;
  if (recentAddresses.indexOf(publicKey) === -1) {
    recentAddresses.push(publicKey);
  }
  await localStore.setItem(RECENT_ADDRESSES, recentAddresses);

  return { recentAddresses };
};
