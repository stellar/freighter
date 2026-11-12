import { Store } from "redux";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
  reset,
} from "background/ducks/session";
import { getKeyIdList, getActiveAccountId } from "background/helpers/account";
import {
  ACCOUNT_NAME_LIST_ID,
  APPLICATION_ID,
  REBRAND_ANNOUNCEMENT_STATUS_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";
import { REBRAND_ANNOUNCEMENT_STATUS } from "constants/rebrandAnnouncement";
import { clearSession, SessionTimer } from "background/helpers/session";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  clearPinnedSourceId,
  clearSecretSources,
} from "background/helpers/secret-sources";
import { clearDerivationIndices } from "background/helpers/derivation-indices";
import { clearAccountProvenance } from "background/helpers/account-provenance";
import { clearPendingAttribution } from "background/helpers/pre-v2-migration";
import { clearLinkStatus } from "background/helpers/link-status";
import { linkWalletSources } from "background/helpers/link-sources";
import { activatePublicKey } from "./activate-public-key";

/*
  Wipes the wallet's accounts and sources ahead of a recovery while keeping
  app settings. Both recovery handlers call it after validating their input
  (and after removePreviousAccount when overwriting), and the secret-key
  handler calls it again to roll back a failed store.
*/
export const clearWalletForRecovery = async ({
  localStore,
  sessionStore,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  // resets accounts list
  sessionStore.dispatch(reset());

  // Every keystore goes, listed or not. A store that failed after `storeKey`
  // but before the list write leaves a keystore only this sweep can find.
  const keystoreKeys = (await localStore.getAllKeys()).filter((key) =>
    key.startsWith("stellarkeys:"),
  );
  await localStore.remove(keystoreKeys);

  const keyIdList = await getKeyIdList({ localStore });

  if (keyIdList.length) {
    /* Clear any existing account data while maintaining app settings */
    await localStore.setItem(KEY_ID_LIST, []);
    await localStore.remove(ACCOUNT_NAME_LIST_ID);
    await clearSecretSources({ localStore });
    await clearPinnedSourceId({ localStore });
  }

  // A recovery always starts the wallet afresh, so every phrase's index
  // set, every account's provenance, any accounts the pre-V2 migration
  // left pending and every source's link status go with it, whether or not
  // the list above had anything in it; the recovered source rebuilds its
  // own afterwards.
  await clearDerivationIndices({ localStore });
  await clearAccountProvenance({ localStore });
  await clearPendingAttribution({ localStore });
  await clearLinkStatus({ localStore });

  // Recovery is onboarding (also the "forgot password" path), which must
  // not be followed by the one-time rebrand announcement.
  await localStore.setItem(
    REBRAND_ANNOUNCEMENT_STATUS_ID,
    REBRAND_ANNOUNCEMENT_STATUS.SEEN,
  );

  await clearSession({ localStore, sessionStore });
};

/*
  Makes a recovered wallet usable: gives it an application state if it has
  none, activates `publicKey`, starts the session timer and links the
  wallet's sources.
*/
export const finishRecovery = async ({
  publicKey,
  localStore,
  sessionStore,
  sessionTimer,
}: {
  publicKey: string;
  localStore: DataStorageAccess;
  sessionStore: Store;
  sessionTimer: SessionTimer;
}) => {
  // if we don't have an application state, assign them one
  const applicationState =
    (await localStore.getItem(APPLICATION_ID)) ||
    APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED;

  await localStore.setItem(APPLICATION_ID, applicationState);

  await activatePublicKey({
    publicKey,
    sessionStore,
    localStore,
  });

  // start the timer now that we have active private key
  await sessionTimer.startSession();

  // Link the recovered sources. This runs on every recover rather than
  // keying off the application-state write, which a re-import repeats; the
  // stored link status keeps it idempotent.
  void linkWalletSources({ sessionStore, localStore });
};

/* The response both recovery handlers return. */
export const buildRecoveryResponse = async ({
  localStore,
  sessionStore,
  error,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
  error: string;
}) => {
  const currentState = sessionStore.getState();
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    allAccounts: allAccountsSelector(currentState),
    publicKey: publicKeySelector(currentState),
    activeAccountId: await getActiveAccountId({ localStore }),
    applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
    hasPrivateKey: await hasPrivateKeySelector(currentState),
    error,
  };
};
