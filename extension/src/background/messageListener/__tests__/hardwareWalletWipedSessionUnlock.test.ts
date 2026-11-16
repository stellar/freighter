import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";

import { sessionSlice } from "background/ducks/session";
import {
  HAS_ACCOUNT_SUBSCRIPTION,
  KEY_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";

import { confirmPassword } from "../handlers/confirmPassword";
import { loadAccount } from "../handlers/loadAccount";

// Persisting the store and broadcasting to other surfaces are side effects
// that are not under test here.
jest.mock("background/store", () => ({
  flushSessionStore: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../helpers/broadcast-session-state", () => ({
  broadcastSessionState: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

const HW_PUBLIC_KEY = "GBHWLEDGERPUBLICKEY";
const HW_KEY_ID = `hw:${HW_PUBLIC_KEY}`;
const HOT_KEY_ID = "hot-key-id-0";
const HOT_PUBLIC_KEY = "GBHOTWALLETPUBLICKEY";
const PASSWORD = "correct-password";

const buildLocalStore = (initial: Record<string, unknown>) => {
  const data: Record<string, unknown> = { ...initial };
  return {
    getItem: jest.fn((key: string) => Promise.resolve(data[key] ?? null)),
    setItem: jest.fn((key: string, value: unknown) => {
      data[key] = value;
      return Promise.resolve();
    }),
    remove: jest.fn((key: string) => {
      delete data[key];
      return Promise.resolve();
    }),
  };
};

// Only the hot (mnemonic) keystore can be unlocked with a password. A
// hardware wallet key ID has no keystore, so loading it always fails.
const buildKeyManager = () => ({
  loadKey: jest.fn((keyId: string, password: string) => {
    if (keyId === HOT_KEY_ID && password === PASSWORD) {
      return Promise.resolve({
        publicKey: HOT_PUBLIC_KEY,
        privateKey: "SHOTWALLETSECRET",
        extra: { mnemonicPhrase: "test mnemonic phrase", imported: false },
      });
    }
    return Promise.reject(new Error("Could not load key"));
  }),
});

// A fresh store with no preloaded state is what the background rebuilds
// after the browser wipes `storage.session` (browser restart, extension
// reload or update): no public key, no hash key and
// `isHardwareWalletLocked: false`.
const buildWipedSessionStore = () =>
  configureStore({
    reducer: combineReducers({ session: sessionSlice.reducer }),
  });

describe("unlocking a wiped session with a hardware wallet active", () => {
  it("reports locked after the wipe, then unlocks the hardware wallet with the password", async () => {
    const localStore = buildLocalStore({
      [KEY_ID]: HW_KEY_ID,
      [KEY_ID_LIST]: [HOT_KEY_ID, HW_KEY_ID],
      // Already subscribed, so `logIn` does not call the indexer.
      [HAS_ACCOUNT_SUBSCRIPTION]: { [HW_KEY_ID]: true },
    });
    const sessionStore = buildWipedSessionStore();
    const keyManager = buildKeyManager();
    const sessionTimer = {
      startSession: jest.fn().mockResolvedValue(undefined),
    };

    // 1. The wiped session must read as locked. Before the fix this
    //    returned `hasPrivateKey: true` with an empty public key, so the
    //    unlock screen mounted already "unlocked" and never navigated.
    const beforeUnlock = await loadAccount({
      localStore: localStore as any,
      sessionStore,
    });
    expect(beforeUnlock.publicKey).toBe("");
    expect(beforeUnlock.hasPrivateKey).toBe(false);

    // 2. The correct password unlocks the session.
    const unlockResult = await confirmPassword({
      request: { password: PASSWORD } as any,
      localStore: localStore as any,
      sessionStore,
      keyManager: keyManager as any,
      sessionTimer: sessionTimer as any,
    });

    expect(unlockResult).not.toHaveProperty("error");
    expect(unlockResult).toMatchObject({
      publicKey: HW_PUBLIC_KEY,
      hasPrivateKey: true,
    });

    // The password is checked against the hot keystore, never against
    // the hardware wallet key ID (which has no keystore).
    expect(keyManager.loadKey.mock.calls[0]).toEqual([HOT_KEY_ID, PASSWORD]);
    expect(keyManager.loadKey).not.toHaveBeenCalledWith(
      HW_KEY_ID,
      expect.anything(),
    );
    expect(sessionTimer.startSession).toHaveBeenCalledTimes(1);

    // 3. The background now reports the hardware wallet as the unlocked
    //    active account, so `hasPrivateKey` goes false -> true and the
    //    unlock screen navigates.
    const afterUnlock = await loadAccount({
      localStore: localStore as any,
      sessionStore,
    });
    expect(afterUnlock.publicKey).toBe(HW_PUBLIC_KEY);
    expect(afterUnlock.hasPrivateKey).toBe(true);
    expect(afterUnlock.allAccounts.map((a) => a.publicKey)).toEqual([
      HOT_PUBLIC_KEY,
      HW_PUBLIC_KEY,
    ]);
  });

  it("stays locked when the password is wrong", async () => {
    const localStore = buildLocalStore({
      [KEY_ID]: HW_KEY_ID,
      [KEY_ID_LIST]: [HOT_KEY_ID, HW_KEY_ID],
      [HAS_ACCOUNT_SUBSCRIPTION]: { [HW_KEY_ID]: true },
    });
    const sessionStore = buildWipedSessionStore();
    const sessionTimer = {
      startSession: jest.fn().mockResolvedValue(undefined),
    };

    const unlockResult = await confirmPassword({
      request: { password: "wrong-password" } as any,
      localStore: localStore as any,
      sessionStore,
      keyManager: buildKeyManager() as any,
      sessionTimer: sessionTimer as any,
    });

    expect(unlockResult).toEqual({ error: "Incorrect password" });
    expect(sessionTimer.startSession).not.toHaveBeenCalled();

    const afterAttempt = await loadAccount({
      localStore: localStore as any,
      sessionStore,
    });
    expect(afterAttempt.publicKey).toBe("");
    expect(afterAttempt.hasPrivateKey).toBe(false);
  });
});
