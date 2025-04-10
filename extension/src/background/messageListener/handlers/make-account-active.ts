import { Store } from "redux";

import { MakeAccountActiveMessage } from "@shared/api/types/message-request";
import { activatePublicKey } from "../helpers/activate-public-key";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  hasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";
import { getBipPath } from "background/helpers/account";

export const makeAccountActive = async ({
  request,
  sessionStore,
  localStore,
}: {
  request: MakeAccountActiveMessage;
  sessionStore: Store;
  localStore: DataStorageAccess;
}) => {
  const { publicKey } = request;
  await activatePublicKey({ publicKey, sessionStore, localStore });
  const currentState = sessionStore.getState();

  return {
    publicKey: publicKeySelector(currentState),
    hasPrivateKey: await hasPrivateKeySelector(currentState),
    bipPath: await getBipPath(),
  };
};
