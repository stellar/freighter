import { Store } from "redux";

import { SaveAllowListMessage } from "@shared/api/types/message-request";
import { publicKeySelector } from "background/ducks/session";
import {
  getAllowList,
  removeAllowListDomain,
} from "background/helpers/account";

export const saveAllowList = async ({
  request,
  sessionStore,
}: {
  request: SaveAllowListMessage;
  sessionStore: Store;
}) => {
  const { domain, networkName } = request;

  const publicKey = publicKeySelector(sessionStore.getState());

  await removeAllowListDomain({ publicKey, networkName, domain });

  return {
    allowList: await getAllowList(),
  };
};
