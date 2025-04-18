import { Store } from "redux";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  APPLICATION_ID,
  KEY_ID,
  TOKEN_ID_LIST,
} from "constants/localStorageTypes";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";
import { getBipPath } from "background/helpers/account";

export const loadAccount = async ({
  localStore,
  sessionStore,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  /*
  The 3.0.0 migration mistakenly sets keyId as a number in older versions.
  For some users, Chrome went right from version ~2.9.x to 3.0.0, which caused them to miss the below fix to the migration.
  This will fix this issue at load.

  keyId being of type number causes issues downstream:
  - we need to be able to use String.indexOf to determine if the keyId belongs to a hardware wallet
  - @stellar/walet-sdk expects a string when dealing unlocking a keystore by keyId
  - in other places in code where we save keyId, we do so as a string
  Let's solve the issue at its source
*/
  const keyId = (await localStore.getItem(KEY_ID)) as string | number;
  if (typeof keyId === "number") {
    await localStore.setItem(KEY_ID, keyId.toString());
  }

  const currentState = sessionStore.getState();
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    hasPrivateKey: await hasPrivateKeySelector(currentState),
    publicKey: publicKeySelector(currentState),
    applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
    allAccounts: allAccountsSelector(currentState),
    bipPath: await getBipPath({ localStore }),
    tokenIdList: (await localStore.getItem(TOKEN_ID_LIST)) || {},
  };
};
