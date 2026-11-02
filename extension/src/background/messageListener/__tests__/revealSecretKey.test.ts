import { Keypair } from "stellar-sdk";

import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import {
  CreateAccountMessage,
  ImportAccountMessage,
  RevealSecretKeyMessage,
} from "@shared/api/types/message-request";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import { KEY_ID_LIST, TEMPORARY_STORE_ID } from "constants/localStorageTypes";

// `webextension-polyfill` is mocked to undefined globally; give the
// `isFromExtensionPage` check enough of `browser.runtime` to recognize our
// own pages.
jest.mock("webextension-polyfill", () => ({
  __esModule: true,
  default: {
    runtime: {
      id: "fake-id",
      getURL: (path: string) => `chrome-extension://fake-id${path}`,
    },
  },
}));

// The real library doesn't load under jest. Derive a real keypair so the
// revealed key can be checked against the account's public key.
const mockDerived = Keypair.random();
jest.mock("stellar-hd-wallet", () => ({
  generateMnemonic: () => "mocked mnemonic phrase",
  fromMnemonic: () => ({
    getPublicKey: () => mockDerived.publicKey(),
    getSecret: () => mockDerived.secret(),
  }),
}));

const PASSWORD = "test-password";
const extensionPage = {};
const contentScript = { tab: { id: 1 }, url: "https://example.com" };

const testAlarm = new MockBrowserAlarm(() => {});

const send = (request: unknown, sender: object = extensionPage) =>
  popupMessageListener(
    request as any,
    mockSessionStore,
    mockDataStorage,
    mockKeyManager,
    testAlarm as any,
    sender as any,
  ) as Promise<any>;

const reveal = (publicKey: string, password = PASSWORD, sender?: object) =>
  send(
    {
      type: SERVICE_TYPES.REVEAL_SECRET_KEY,
      publicKey,
      password,
    } as RevealSecretKeyMessage,
    sender,
  );

describe("REVEAL_SECRET_KEY", () => {
  let derivedPublicKey = "";
  const imported = Keypair.random();

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());

    const created = await send({
      type: SERVICE_TYPES.CREATE_ACCOUNT,
      password: PASSWORD,
      isOverwritingAccount: false,
    } as CreateAccountMessage);
    derivedPublicKey = created.publicKey;

    const importResult = await send({
      type: SERVICE_TYPES.IMPORT_ACCOUNT,
      password: PASSWORD,
      privateKey: imported.secret(),
    } as ImportAccountMessage);
    expect(importResult.error).toBeUndefined();
  });

  it("returns each account's own secret key", async () => {
    const importedResult = await reveal(imported.publicKey());
    expect(importedResult).toEqual({ secretKey: imported.secret() });

    expect(derivedPublicKey).toBe(mockDerived.publicKey());
    const derivedResult = await reveal(derivedPublicKey);
    expect(derivedResult).toEqual({ secretKey: mockDerived.secret() });
  });

  it("refuses a wrong password while the wallet is unlocked", async () => {
    const result = await reveal(imported.publicKey(), "wrong-password");
    expect(result).toEqual({ error: "Incorrect password" });
  });

  it("unlocks and reveals when the session holds no keys", async () => {
    await mockDataStorage.remove(TEMPORARY_STORE_ID);

    const result = await reveal(imported.publicKey());
    expect(result).toEqual({ secretKey: imported.secret() });
  });

  it("refuses a wrong password when the session holds no keys", async () => {
    await mockDataStorage.remove(TEMPORARY_STORE_ID);

    const result = await reveal(imported.publicKey(), "wrong-password");
    expect(result).toEqual({ error: "Incorrect password" });
  });

  it("refuses an account the wallet doesn't hold", async () => {
    const result = await reveal(Keypair.random().publicKey());
    expect(result).toEqual({ error: "Account not found" });
  });

  it("refuses a hardware account", async () => {
    const hwPublicKey = Keypair.random().publicKey();
    const keyIdList = await mockDataStorage.getItem(KEY_ID_LIST);
    await mockDataStorage.setItem(KEY_ID_LIST, [
      ...keyIdList,
      `hw:${hwPublicKey}`,
    ]);

    const result = await reveal(hwPublicKey);
    expect(result).toEqual({
      error: "No secret key is held for a hardware account",
    });
  });

  it("refuses a sender that isn't one of our pages", async () => {
    const result = await reveal(imported.publicKey(), PASSWORD, contentScript);
    expect(result).toEqual({ error: "Unauthorized" });
  });
});
