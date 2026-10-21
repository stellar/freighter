import { Store } from "redux";
import { Keypair } from "stellar-sdk";

import {
  deriveAuthKeypair,
  deriveSourceIdentity,
} from "@shared/api/helpers/deriveAuthKeypair";
import {
  SecretSource,
  SecretSourceMap,
  SecretSourceType,
} from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getMnemonics } from "background/helpers/session";
import {
  PINNED_SOURCE_ID,
  SECRET_SOURCES_ID,
} from "constants/localStorageTypes";

/*
  The set of secret sources a wallet holds (every seed phrase and every
  standalone secret key), persisted in PLAIN local storage beside
  `accountNameList`. Nothing here is secret: a source id is a derived public
  key that is not linkable to a G address, and the label and timestamp exist
  only for the UI. Keeping it in plain storage is what lets the install-time
  migration of pre-V2 storage read it with no password.

  The pinned source id lives beside the set. It is the source that signs every
  backend request and it survives lock.
*/

const LABEL_PREFIX: Record<SecretSourceType, string> = {
  [SecretSourceType.PHRASE]: "Seed Phrase",
  [SecretSourceType.SECRET_KEY]: "Secret Key",
};

/** The phrase source id. Returns only the id; the signing keypair is derived elsewhere. */
export const getPhraseSourceId = async (mnemonic: string): Promise<string> =>
  (await deriveAuthKeypair(mnemonic)).userId;

/** The secret-key source id, from the key's raw 32-byte ed25519 seed. */
export const getSecretKeySourceId = async (
  secretKey: string,
): Promise<string> =>
  (await deriveSourceIdentity(Keypair.fromSecret(secretKey).rawSecretKey()))
    .sourceId;

export const getSecretSources = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<SecretSourceMap> =>
  ((await localStore.getItem(SECRET_SOURCES_ID)) as SecretSourceMap) || {};

/**
 * Allocates the next label number for `type`: one past the highest number
 * already used by that type, so a label is never reused after a removal.
 */
const nextLabel = (sources: SecretSourceMap, type: SecretSourceType) => {
  const prefix = LABEL_PREFIX[type];
  const pattern = new RegExp(`^${prefix} (\\d+)$`);
  let highest = 0;

  for (const source of Object.values(sources)) {
    if (source.type !== type) {
      continue;
    }
    const match = pattern.exec(source.label);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  }

  return `${prefix} ${highest + 1}`;
};

/**
 * Registers a source. Idempotent by id: an existing record is returned
 * untouched, so re-adding (a re-import, a recover with N preloaded accounts)
 * never allocates a second label.
 */
export const addSecretSource = async ({
  localStore,
  id,
  type,
}: {
  localStore: DataStorageAccess;
  id: string;
  type: SecretSourceType;
}): Promise<SecretSource> => {
  const sources = await getSecretSources({ localStore });

  if (sources[id]) {
    return sources[id];
  }

  const source: SecretSource = {
    id,
    type,
    label: nextLabel(sources, type),
    createdAt: Date.now(),
  };

  await localStore.setItem(SECRET_SOURCES_ID, { ...sources, [id]: source });

  return source;
};

export const clearSecretSources = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  await localStore.remove(SECRET_SOURCES_ID);
};

export const getPinnedSourceId = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<string | null> =>
  ((await localStore.getItem(PINNED_SOURCE_ID)) as string) || null;

export const setPinnedSourceId = async ({
  localStore,
  sourceId,
}: {
  localStore: DataStorageAccess;
  sourceId: string;
}) => {
  await localStore.setItem(PINNED_SOURCE_ID, sourceId);
};

export const clearPinnedSourceId = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  await localStore.remove(PINNED_SOURCE_ID);
};

/** The held mnemonic of one phrase source, or null when it is not held. */
export const getHeldMnemonic = async ({
  sessionStore,
  localStore,
  sourceId,
}: {
  sessionStore: Store;
  localStore: DataStorageAccess;
  sourceId: string;
}): Promise<{ sourceId: string; mnemonic: string } | null> => {
  const mnemonic = (await getMnemonics({ sessionStore, localStore }))[sourceId];

  return mnemonic ? { sourceId, mnemonic } : null;
};

/**
 * INTERIM resolver for the callers that still assume "the" wallet phrase
 * (backend auth, analytics id, show recovery phrase, ...). It returns the
 * pinned source's mnemonic when one is pinned and held, else the first held
 * phrase, else null. For a one-phrase wallet this is exactly the phrase the
 * single slot used to hold.
 *
 * Follow-ups move the auth/analytics callers to pinned-source signing.
 * Account creation names its source and falls back here only when the
 * message names none and the active account has no held phrase. Until then a
 * wallet with no phrase (secret-key only) resolves to null, and callers that
 * re-run the unlock on null will do so even though the session is unlocked;
 * that state cannot be reached until onboarding by secret key ships.
 */
export const getDefaultMnemonic = async ({
  sessionStore,
  localStore,
}: {
  sessionStore: Store;
  localStore: DataStorageAccess;
}): Promise<{ sourceId: string; mnemonic: string } | null> => {
  const mnemonics = await getMnemonics({ sessionStore, localStore });
  const pinned = await getPinnedSourceId({ localStore });

  if (pinned && mnemonics[pinned]) {
    return { sourceId: pinned, mnemonic: mnemonics[pinned] };
  }

  const [first] = Object.keys(mnemonics);

  return first ? { sourceId: first, mnemonic: mnemonics[first] } : null;
};
