import browser from "webextension-polyfill";
import { Store } from "redux";

import {
  setActiveHashKey,
  hashKeySelector,
  SessionState,
  timeoutAccountAccess,
} from "../ducks/session";
import { DataStorageAccess } from "./dataStorageAccess";
import { TEMPORARY_STORE_ID } from "../../constants/localStorageTypes";
import { encode, decode } from "./base64-arraybuffer";

// 24 hours
const SESSION_LENGTH = 60 * 24;
export const SESSION_ALARM_NAME = "session-timer";

export class SessionTimer {
  duration = 1000 * 60 * SESSION_LENGTH;
  runningTimeout: null | ReturnType<typeof setTimeout> = null;
  constructor(duration?: number) {
    this.duration = duration || this.duration;
  }

  startSession() {
    browser?.alarms.create(SESSION_ALARM_NAME, {
      delayInMinutes: SESSION_LENGTH,
    });
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

interface ClearSession {
  localStore: DataStorageAccess;
  sessionStore: Store;
}

export const clearSession = async ({
  localStore,
  sessionStore,
}: ClearSession) => {
  sessionStore.dispatch(timeoutAccountAccess());
  await localStore.remove(TEMPORARY_STORE_ID);
};
