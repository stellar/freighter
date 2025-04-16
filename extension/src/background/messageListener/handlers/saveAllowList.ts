import { Store } from "redux";

import { SaveAllowListMessage } from "@shared/api/types/message-request";
import { publicKeySelector } from "background/ducks/session";
import {
  getAllowList,
  removeAllowListDomain,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const saveAllowList = async ({
  request,
  sessionStore,
  localStore,
}: {
  request: SaveAllowListMessage;
  sessionStore: Store;
  localStore: DataStorageAccess;
}) => {
  const { domain, networkName } = request;

  const publicKey = publicKeySelector(sessionStore.getState());

  await removeAllowListDomain({ publicKey, networkName, domain, localStore });

  return {
    allowList: await getAllowList({ localStore }),
  };
};
