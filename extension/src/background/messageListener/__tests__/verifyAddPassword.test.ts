import { Keypair } from "stellar-sdk";

import { sessionSlice } from "background/ducks/session";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import { storeAccount } from "background/messageListener/helpers/store-account";
import { storeHardwareWalletAccount } from "background/messageListener/helpers/store-hardware-wallet";
import { WalletType } from "@shared/constants/hardwareWallet";
import {
  NO_SOFTWARE_KEYSTORE_ERROR,
  verifyAddPassword,
} from "../helpers/verify-add-password";

const PASSWORD = "test";
const testAlarm = new MockBrowserAlarm(() => {});

const verify = (password: string) =>
  verifyAddPassword({
    password,
    localStore: mockDataStorage,
    sessionStore: mockSessionStore,
    keyManager: mockKeyManager,
    sessionTimer: testAlarm as any,
  });

const createSoftwareWallet = async () => {
  const secret = Keypair.random().secret();
  await storeAccount({
    password: PASSWORD,
    keyPair: {
      publicKey: Keypair.fromSecret(secret).publicKey(),
      privateKey: secret,
    },
    sourceId: "source-1",
    imported: true,
    isSettingHashKey: true,
    sessionStore: mockSessionStore,
    localStore: mockDataStorage,
    keyManager: mockKeyManager,
  });
};

describe("verifyAddPassword", () => {
  jest.setTimeout(60_000);

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
  });

  it("returns null for the right password", async () => {
    await createSoftwareWallet();

    expect(await verify(PASSWORD)).toBeNull();
  });

  it('returns "Incorrect password" for a wrong password on an unlocked session', async () => {
    await createSoftwareWallet();

    expect(await verify("wrong")).toBe("Incorrect password");
  });

  it('returns "Unable to login" for a wrong password on a locked session', async () => {
    await createSoftwareWallet();
    mockSessionStore.dispatch(sessionSlice.actions.reset());

    expect(await verify("wrong")).toBe("Unable to login");
  });

  it("returns null for the right password on a locked session", async () => {
    await createSoftwareWallet();
    // No active hash key: the session is locked.
    mockSessionStore.dispatch(sessionSlice.actions.reset());

    expect(await verify(PASSWORD)).toBeNull();
  });

  it("returns NO_SOFTWARE_KEYSTORE_ERROR when there is no KEY_ID", async () => {
    expect(await verify(PASSWORD)).toBe(NO_SOFTWARE_KEYSTORE_ERROR);
  });

  it("checks the software keystore while a hardware account is active", async () => {
    await createSoftwareWallet();
    await storeHardwareWalletAccount({
      publicKey: Keypair.random().publicKey(),
      hardwareWalletType: WalletType.LEDGER,
      bipPath: "44'/148'/0'",
      sessionStore: mockSessionStore,
      localStore: mockDataStorage,
    });

    expect(await verify(PASSWORD)).toBeNull();
    expect(await verify("wrong")).toBe("Incorrect password");
  });
});
