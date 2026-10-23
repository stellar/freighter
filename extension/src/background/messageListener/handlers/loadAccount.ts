import { Store } from "redux";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { APPLICATION_ID, TOKEN_ID_LIST } from "constants/localStorageTypes";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";
import { getBipPath, getActiveAccountId } from "background/helpers/account";
import { getLinkConflicts } from "background/helpers/link-status";

export const loadAccount = async ({
  localStore,
  sessionStore,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const currentState = sessionStore.getState();
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    hasPrivateKey: await hasPrivateKeySelector(currentState),
    publicKey: publicKeySelector(currentState),
    activeAccountId: await getActiveAccountId({ localStore }),
    applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
    allAccounts: allAccountsSelector(currentState),
    bipPath: await getBipPath({ localStore }),
    tokenIdList: (await localStore.getItem(TOKEN_ID_LIST)) || {},
    linkConflicts: await getLinkConflicts({ localStore }),
  };
};
