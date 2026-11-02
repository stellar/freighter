import { Store } from "redux";

import { MakeAccountActiveMessage } from "@shared/api/types/message-request";
import { activatePublicKey } from "../helpers/activate-public-key";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  buildHasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";
import { getActiveAccountId, getBipPath } from "background/helpers/account";

export const makeAccountActive = async ({
  request,
  sessionStore,
  localStore,
}: {
  request: MakeAccountActiveMessage;
  sessionStore: Store;
  localStore: DataStorageAccess;
}) => {
  const { id, publicKey } = request;
  await activatePublicKey({ id, publicKey, sessionStore, localStore });
  const currentState = sessionStore.getState();
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    publicKey: publicKeySelector(currentState),
    activeAccountId: await getActiveAccountId({ localStore }),
    hasPrivateKey: await hasPrivateKeySelector(currentState),
    bipPath: await getBipPath({ localStore }),
  };
};
