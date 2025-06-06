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
  const { address } = request;
  const storedData = (await localStore.getItem(RECENT_ADDRESSES)) || [];
  const recentAddresses = storedData;
  if (recentAddresses.indexOf(address) === -1) {
    recentAddresses.push(address);
  }
  await localStore.setItem(RECENT_ADDRESSES, recentAddresses);

  return { recentAddresses };
};
