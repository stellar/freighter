import { SERVICE_TYPES } from "@shared/constants/services";

/*
  Messages that change the wallet's accounts, sources or session. Each one
  builds its own session store from storage.session and flushes the whole
  state back on every dispatch, and the account lists in storage.local are
  read-modify-writes. Two of these from different surfaces (popup, sidebar,
  fullscreen) must not interleave, or the later writer drops the earlier
  one's account, name, label, index or lock state.

  Read-only messages stay off the lock so an import's Scrypt doesn't stall
  them.

  Sign-out and the auto-lock alarm wait on this lock too, so a holder must
  not await a network call without a timeout. Best-effort requests should
  run detached and write only to storage.local.
*/
export const ACCOUNT_MUTATING_SERVICE_TYPES: ReadonlySet<string> = new Set([
  SERVICE_TYPES.CREATE_ACCOUNT,
  SERVICE_TYPES.RECOVER_ACCOUNT,
  SERVICE_TYPES.ADD_ACCOUNT,
  SERVICE_TYPES.IMPORT_ACCOUNT,
  SERVICE_TYPES.IMPORT_HARDWARE_WALLET,
  SERVICE_TYPES.MIGRATE_ACCOUNTS,
  SERVICE_TYPES.GENERATE_RECOVERY_PHRASE,
  SERVICE_TYPES.ADD_RECOVERY_PHRASE_SOURCE,
  SERVICE_TYPES.IMPORT_RECOVERY_PHRASE,
  SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE,
  SERVICE_TYPES.CONFIRM_MIGRATED_MNEMONIC_PHRASE,
  // Both run loginToAllAccounts, whose unlock pass writes the source records
  // and rewrites the temporary store.
  SERVICE_TYPES.CONFIRM_PASSWORD,
  SERVICE_TYPES.SHOW_BACKUP_PHRASE,
  SERVICE_TYPES.UPDATE_ACCOUNT_NAME,
  SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE,
  SERVICE_TYPES.SIGN_OUT,
  SERVICE_TYPES.RESET_WALLET,
  // These dispatch to the session store too, so their flush could overwrite
  // another holder's session.
  SERVICE_TYPES.GET_MIGRATED_MNEMONIC_PHRASE,
  SERVICE_TYPES.RESET_EXP_DATA,
]);

// One chain per background context is enough: MV3 runs a single service
// worker per extension and Firefox a single background page.
let tail: Promise<unknown> = Promise.resolve();

/*
  Runs `fn` once every earlier holder has settled. A rejection still releases
  the lock. Callers take it before building the session store, so the store
  they load already reflects the previous holder's writes.
*/
export const withAccountMutationLock = <T>(fn: () => Promise<T>) => {
  const run = tail.then(fn);
  tail = run.catch(() => undefined);
  return run;
};
