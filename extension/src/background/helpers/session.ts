import browser from "webextension-polyfill";
import { Store } from "redux";

import {
  setActiveHashKey,
  hashKeySelector,
  SessionState,
  timeoutAccountAccess,
  lockHardwareWallet,
} from "../ducks/session";
import { flushSessionStore } from "../store";
import { DataStorageAccess } from "./dataStorageAccess";
import {
  AUTO_LOCK_TIMEOUT_MINUTES_ID,
  TEMPORARY_STORE_ID,
  TEMPORARY_STORE_MNEMONICS_ID,
} from "../../constants/localStorageTypes";
import {
  AutoLockTimeoutMinutes,
  coerceAutoLockTimeoutMinutes,
} from "@shared/constants/autoLock";
import { encode, decode } from "./base64-arraybuffer";
import type { WalletSources } from "./wallet-sources";

export const SESSION_ALARM_NAME = "session-timer";

/**
 * Idle-based auto-lock timer.
 *
 * The browser session is locked after a configurable number of minutes
 * of user inactivity. Any genuine user interaction in an extension page
 * pings the background, which calls `resetSession()` to rearm the alarm
 * at `now + configured timeout`. The alarm is implemented as a named
 * `browser.alarms` entry, so creating it with the same name replaces
 * any in-flight deadline atomically — no separate clear step needed.
 */
export class SessionTimer {
  private readonly localStore: DataStorageAccess;

  constructor(localStore: DataStorageAccess) {
    this.localStore = localStore;
  }

  private async getTimeoutMinutes(): Promise<AutoLockTimeoutMinutes> {
    const stored = await this.localStore.getItem(AUTO_LOCK_TIMEOUT_MINUTES_ID);
    return coerceAutoLockTimeoutMinutes(stored);
  }

  /**
   * (Re)arm the auto-lock alarm. Reads the persisted timeout on every
   * call so that settings changes take effect immediately.
   */
  async resetSession() {
    const delayInMinutes = await this.getTimeoutMinutes();
    await browser?.alarms.create(SESSION_ALARM_NAME, { delayInMinutes });
  }

  /**
   * Alias kept so unlock paths can read naturally
   * (`sessionTimer.startSession()`).
   */
  async startSession() {
    await this.resetSession();
  }

  /**
   * Cancel any pending auto-lock alarm. Used by explicit sign-out.
   */
  async stopSession() {
    await browser?.alarms.clear(SESSION_ALARM_NAME);
  }
}

const IV_LENGTH = 16; // AES-CBC uses 128-bit (16 byte) IV

interface HashString {
  str: string;
  keyObject: { key: CryptoKey };
}

const TEMPORARY_STORE_ENCRYPTION_NAME = "AES-CBC";
const HASH_KEY_ENCRYPTION_PARAMS = { name: "PBKDF2", hash: "SHA-256" };

export const encryptHashString = async ({
  str,
  keyObject,
}: HashString): Promise<ArrayBuffer> => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const encodedStr = encoder.encode(str);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: TEMPORARY_STORE_ENCRYPTION_NAME,
      iv,
    },
    keyObject.key,
    encodedStr,
  );

  // Prepend IV to ciphertext so each encryption is self-contained
  const result = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.byteLength);

  return result.buffer;
};

interface DecodeHashString {
  hash: ArrayBuffer;
  keyObject: { key: CryptoKey };
}

export const decryptHashString = async ({
  hash,
  keyObject,
}: DecodeHashString) => {
  const data = new Uint8Array(hash);
  // Extract the IV from the first 16 bytes
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: TEMPORARY_STORE_ENCRYPTION_NAME,
      iv,
    },
    keyObject.key,
    ciphertext,
  );

  const textDecoder = new TextDecoder();

  return textDecoder.decode(decrypted);
};

export const deriveKeyFromString = async (str: string) => {
  const iterations = 600000;
  const keylen = 32;
  // randomized salt will make sure the hashed password is different on every login
  const salt = crypto.getRandomValues(new Uint8Array(16)).toString();

  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(str);

  const importedKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    HASH_KEY_ENCRYPTION_PARAMS,
    false,
    ["deriveBits"],
  );

  const saltBuffer = encoder.encode(salt);
  const params = {
    ...HASH_KEY_ENCRYPTION_PARAMS,
    salt: saltBuffer,
    iterations,
  };
  const derivation = await crypto.subtle.deriveBits(
    params,
    importedKey,
    keylen * 8,
  );

  const importedEncryptionKey = await crypto.subtle.importKey(
    "raw",
    derivation,
    { name: TEMPORARY_STORE_ENCRYPTION_NAME },
    true,
    ["encrypt", "decrypt"],
  );

  return {
    key: importedEncryptionKey,
  };
};

interface StoreActiveHashKey {
  sessionStore: Store;
  hashKey: {
    key: CryptoKey;
  };
}

export const storeActiveHashKey = async ({
  sessionStore,
  hashKey,
}: StoreActiveHashKey) => {
  const format = "jwk"; // JSON Web Key format
  // export the key for transferability
  const exportedKey = await crypto.subtle.exportKey(format, hashKey.key);

  // store hashed password in memory
  sessionStore.dispatch(
    setActiveHashKey({
      hashKey: {
        // JSON Web Key is able to be stringified without encoding
        key: JSON.stringify(exportedKey),
      },
    }),
  );
};

interface GetActiveHashKey {
  sessionStore: Store;
}

export const getActiveHashKeyCryptoKey = async ({
  sessionStore,
}: GetActiveHashKey) => {
  const hashKey = hashKeySelector(sessionStore.getState() as SessionState);

  if (hashKey?.key) {
    try {
      const format = "jwk";
      // JSON Web Key can be parsed with decoding
      // eslint-disable-next-line no-undef
      const exportedHashKey = JSON.parse(hashKey.key) as JsonWebKey;
      // import the password key for future use indecryption
      const key = await crypto.subtle.importKey(
        format,
        exportedHashKey,
        TEMPORARY_STORE_ENCRYPTION_NAME,
        true,
        ["encrypt", "decrypt"],
      );

      return {
        key,
      };
    } catch (e) {
      return null;
    }
  }

  return null;
};

interface StoreEncryptedTemporaryData {
  localStore: DataStorageAccess;
  keyName: string;
  temporaryData: string;
  hashKey: {
    key: CryptoKey;
  };
}

export const storeEncryptedTemporaryData = async ({
  localStore,
  keyName,
  temporaryData,
  hashKey,
}: StoreEncryptedTemporaryData) => {
  const encryptedPrivateKey = await encryptHashString({
    str: temporaryData,
    keyObject: hashKey,
  });

  const existingTemporaryStore = await localStore.getItem(TEMPORARY_STORE_ID);

  // store encrypted private key in local storage, a separate space from where the password is stored
  await localStore.setItem(TEMPORARY_STORE_ID, {
    ...existingTemporaryStore,
    [keyName]: encode(encryptedPrivateKey),
  });
};

interface GetEncryptedTemporaryData {
  sessionStore: Store;
  localStore: DataStorageAccess;
  keyName: string;
}

export const getEncryptedTemporaryData = async ({
  sessionStore,
  localStore,
  keyName,
}: GetEncryptedTemporaryData) => {
  const temoraryStore = (await localStore.getItem(TEMPORARY_STORE_ID)) || {};
  const encryptedKeyJSON = temoraryStore[keyName];
  if (!encryptedKeyJSON) {
    return "";
  }
  const encryptedKey = decode(encryptedKeyJSON as string);
  const hashKey = await getActiveHashKeyCryptoKey({ sessionStore });

  if (hashKey !== null) {
    // use the hashed password to decrypt the private key
    const activePrivateKey = await decryptHashString({
      hash: encryptedKey,
      keyObject: hashKey,
    });

    return activePrivateKey;
  }

  return "";
};

/*
  The held mnemonics live in ONE encrypted entry of the temporary store, as a
  JSON map of phrase source id -> mnemonic. A standalone secret key is a
  source with no mnemonic, so a secret-key-only wallet has no entry at all.
  The entry goes with the rest of the temporary store on lock.
*/
type MnemonicMap = Record<string, string>;

interface StoreMnemonics {
  localStore: DataStorageAccess;
  hashKey: {
    key: CryptoKey;
  };
  mnemonics: MnemonicMap;
}

/* Replace the held map wholesale. Unlock uses this to write every held phrase at once. */
export const storeMnemonics = async ({
  localStore,
  hashKey,
  mnemonics,
}: StoreMnemonics) => {
  await storeEncryptedTemporaryData({
    localStore,
    keyName: TEMPORARY_STORE_MNEMONICS_ID,
    temporaryData: JSON.stringify(mnemonics),
    hashKey,
  });
};

const decryptMnemonicMap = async ({
  localStore,
  hashKey,
}: {
  localStore: DataStorageAccess;
  hashKey: { key: CryptoKey };
}): Promise<MnemonicMap> => {
  const temporaryStore = (await localStore.getItem(TEMPORARY_STORE_ID)) || {};
  const encrypted = temporaryStore[TEMPORARY_STORE_MNEMONICS_ID];

  if (!encrypted) {
    return {};
  }

  const json = await decryptHashString({
    hash: decode(encrypted as string),
    keyObject: hashKey,
  });

  return JSON.parse(json) as MnemonicMap;
};

interface AddMnemonic {
  localStore: DataStorageAccess;
  hashKey: {
    key: CryptoKey;
  };
  sourceId: string;
  mnemonic: string;
}

/*
  Merge one phrase into the held map. Takes the hash key explicitly rather
  than reading it from the session store: on wallet creation the key is
  freshly derived and only dispatched to the store after the temporary data
  is written.
*/
export const addMnemonic = async ({
  localStore,
  hashKey,
  sourceId,
  mnemonic,
}: AddMnemonic) => {
  const mnemonics = await decryptMnemonicMap({ localStore, hashKey });

  await storeMnemonics({
    localStore,
    hashKey,
    mnemonics: { ...mnemonics, [sourceId]: mnemonic },
  });
};

interface GetMnemonics {
  sessionStore: Store;
  localStore: DataStorageAccess;
}

/* Every held phrase keyed by source id; empty when locked or when none is held. */
export const getMnemonics = async ({
  sessionStore,
  localStore,
}: GetMnemonics): Promise<MnemonicMap> => {
  const hashKey = await getActiveHashKeyCryptoKey({ sessionStore });

  if (hashKey === null) {
    return {};
  }

  return decryptMnemonicMap({ localStore, hashKey });
};

export const getMnemonic = async ({
  sessionStore,
  localStore,
  sourceId,
}: GetMnemonics & { sourceId: string }): Promise<string> =>
  (await getMnemonics({ sessionStore, localStore }))[sourceId] || "";

/*
  Per-unlock cache of the wallet's derived source identities (see
  wallet-sources.ts). It lives here so both lock paths (clearSession and the
  signOut handler) can drop it without wallet-sources and session importing
  each other. In memory only: the signers are never written anywhere, and a
  service worker restart simply re-derives them on the next call.

  The value is the derivation's promise, so concurrent callers share one
  derivation. The generation is bumped on every lock, so a derivation that
  started before the lock cannot cache its signers after it.
*/
let walletSourcesCache: {
  key: string;
  value: Promise<WalletSources>;
} | null = null;
let walletSourcesGeneration = 0;

export const getWalletSourcesGeneration = () => walletSourcesGeneration;

/* The cached sources for this cache key, or null when none are cached for it. */
export const getCachedWalletSources = (key: string) =>
  walletSourcesCache?.key === key ? walletSourcesCache.value : null;

/* Caches `value` under `key`, unless the wallet was locked since `generation`. */
export const setCachedWalletSources = (
  key: string,
  value: Promise<WalletSources>,
  generation: number,
) => {
  if (generation === walletSourcesGeneration) {
    walletSourcesCache = { key, value };
  }
};

/* Drops `value` if it is still the cached entry; a no-op otherwise. */
export const dropCachedWalletSources = (value: Promise<WalletSources>) => {
  if (walletSourcesCache?.value === value) {
    walletSourcesCache = null;
  }
};

/* Called on lock: drops the cache and invalidates any derivation in flight. */
export const clearCachedWalletSources = () => {
  walletSourcesCache = null;
  walletSourcesGeneration += 1;
};

interface ClearSession {
  localStore: DataStorageAccess;
  sessionStore: Store;
}

export const clearSession = async ({
  localStore,
  sessionStore,
}: ClearSession) => {
  sessionStore.dispatch(timeoutAccountAccess());
  // Locks hardware-wallet sessions too. `timeoutAccountAccess` clears
  // the hot-wallet hashKey, but HW unlocked-state is read from
  // `localStore.isHardwareWalletActive` and is unaffected — so without
  // this dispatch the idle alarm would be a no-op on HW-only sessions.
  sessionStore.dispatch(lockHardwareWallet());
  clearCachedWalletSources();
  await flushSessionStore(sessionStore);
  await localStore.remove(TEMPORARY_STORE_ID);
};
