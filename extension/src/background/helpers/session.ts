import browser from "webextension-polyfill";
import { encode, decode } from "base64-arraybuffer-es6";
import { Store } from "redux";

import {
  setActiveHashKey,
  hashKeySelector,
  SessionState,
  timeoutAccountAccess,
} from "../ducks/session";
import { DataStorageAccess } from "./dataStorageAccess";
import { TEMPORARY_STORE_ID } from "../../constants/localStorageTypes";

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

interface HashString {
  str: string;
  keyObject: { iv: ArrayBuffer; key: CryptoKey };
}

export const encryptHashString = ({ str, keyObject }: HashString) => {
  const encoder = new TextEncoder();
  const encodedStr = encoder.encode(str);

  return crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv: keyObject.iv,
    },
    keyObject.key,
    encodedStr,
  );
};

interface DecodeHashString {
  hash: ArrayBuffer;
  keyObject: { iv: ArrayBuffer; key: CryptoKey };
}

export const decryptHashString = async ({
  hash,
  keyObject,
}: DecodeHashString) => {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv: keyObject.iv,
    },
    keyObject.key,
    hash,
  );

  const textDecoder = new TextDecoder();

  return textDecoder.decode(decrypted);
};

export const deriveKeyFromString = async (str: string) => {
  const iterations = 1000;
  const keylen = 32;
  const keyLength = 48;
  // randomized salt will make sure the hashed password is different on every login
  const salt = crypto.getRandomValues(new Uint8Array(16)).toString();

  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(str);

  const importedKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "PBKDF2", hash: "SHA-256" },
    false,
    ["deriveBits"],
  );

  const saltBuffer = encoder.encode(salt);
  const params = {
    name: "PBKDF2",
    hash: "SHA-256",
    salt: saltBuffer,
    iterations,
  };
  const derivation = await crypto.subtle.deriveBits(
    params,
    importedKey,
    keyLength * 8,
  );

  const derivedKey = derivation.slice(0, keylen);
  const iv = derivation.slice(keylen);

  const importedEncryptionKey = await crypto.subtle.importKey(
    "raw",
    derivedKey,
    { name: "AES-CBC" },
    true,
    ["encrypt", "decrypt"],
  );

  return {
    key: importedEncryptionKey,
    iv,
  };
};

interface StoreActiveHashKey {
  sessionStore: Store;
  hashKey: {
    key: CryptoKey;
    iv: ArrayBuffer;
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
        // properly encode ArrayBuffer into serializable format
        iv: encode(hashKey.iv),
        // JSON Web Key is able to be stringified without encoding
        key: JSON.stringify(exportedKey),
      },
    }),
  );
};

interface StoreEncryptedTemporaryData {
  localStore: DataStorageAccess;
  keyName: string;
  temporaryData: string;
  hashKey: {
    key: CryptoKey;
    iv: ArrayBuffer;
  };
}

export const storeEncryptedTemporaryData = async ({
  localStore,
  keyName,
  temporaryData,
  hashKey,
}: StoreEncryptedTemporaryData) => {
  // if keyId starts with hd, don't bother

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

interface GetActiveHashKey {
  sessionStore: Store;
}

export const getActiveHashKeyCryptoKey = async ({
  sessionStore,
}: GetActiveHashKey) => {
  const hashKey = hashKeySelector(sessionStore.getState() as SessionState);

  if (hashKey?.key && hashKey?.iv) {
    try {
      const format = "jwk";
      // JSON Web Key can be parsed with decoding
      const exportedHashKey = JSON.parse(hashKey.key) as JsonWebKey;
      // import the password key for future use indecryption
      const key = await crypto.subtle.importKey(
        format,
        exportedHashKey,
        "AES-CBC",
        true,
        ["encrypt", "decrypt"],
      );

      return {
        iv: decode(hashKey.iv),
        key,
      };
    } catch (e) {
      return null;
    }
  }

  return null;
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
  const hashKey = hashKeySelector(sessionStore.getState() as SessionState);

  if (!hashKey?.key || !hashKey.iv || !encryptedKey) {
    return "";
  }

  if (hashKey) {
    const format = "jwk";
    // JSON Web Key can be parsed with decoding
    const exportedHashKey = JSON.parse(hashKey.key) as JsonWebKey;
    // import the password key for future use indecryption
    const key = await crypto.subtle.importKey(
      // @ts-ignore
      format,
      exportedHashKey,
      "AES-CBC",
      false,
      exportedHashKey.key_ops,
    );

    // use the hashed password to decrypt the private key
    const activePrivateKey = await decryptHashString({
      hash: encryptedKey,
      keyObject: { iv: decode(hashKey.iv), key },
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
