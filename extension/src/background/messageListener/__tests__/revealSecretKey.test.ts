import { Keypair } from "stellar-sdk";

import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import {
  CreateAccountMessage,
  ImportAccountMessage,
  RevealSecretKeyMessage,
  ShowBackupPhraseMessage,
} from "@shared/api/types/message-request";
import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
} from "@shared/api/helpers/authKeypairVectors";
import { SecretSourceType } from "@shared/api/types";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import { storeAccount } from "background/messageListener/helpers/store-account";
import {
  addSecretSource,
  getPhraseSourceId,
  getSecretKeySourceId,
} from "background/helpers/secret-sources";
import {
  KEY_ID,
  KEY_ID_LIST,
  TEMPORARY_STORE_ID,
} from "constants/localStorageTypes";

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

// The linker is fire-and-forget and would write into the next test's storage.
jest.mock("background/helpers/link-sources", () => ({
  linkWalletSources: jest.fn().mockResolvedValue(undefined),
}));

// StellarHDWallet.fromMnemonic cannot run under jest, so derive from the
// pinned (mnemonic, index) rows.
jest.mock("stellar-hd-wallet", () => {
  const { ACCOUNT_SOURCE_VECTORS: vectors, AUTH_KEYPAIR_VECTORS: phrases } =
    jest.requireActual("@shared/api/helpers/authKeypairVectors");
  return {
    generateMnemonic: () => phrases[0].mnemonic,
    fromMnemonic: (mnemonic: string) => {
      const rows = vectors.find((v: any) => v.mnemonic === mnemonic).accounts;
      return {
        getPublicKey: (i: number) => rows[i].publicKey,
        getSecret: (i: number) => rows[i].secret,
      };
    },
  };
});

const [PHRASE_1, PHRASE_2] = AUTH_KEYPAIR_VECTORS;
const DERIVED_1 = ACCOUNT_SOURCE_VECTORS[0].accounts[0];
const DERIVED_2 = ACCOUNT_SOURCE_VECTORS[1].accounts[0];
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

const reveal = (accountId: string, password = PASSWORD, sender?: object) =>
  send(
    {
      type: SERVICE_TYPES.REVEAL_SECRET_KEY,
      accountId,
      password,
    } as RevealSecretKeyMessage,
    sender,
  );

const showPhrase = ({
  sourceId,
  password = PASSWORD,
  sender,
}: { sourceId?: string; password?: string; sender?: object } = {}) =>
  send(
    {
      type: SERVICE_TYPES.SHOW_BACKUP_PHRASE,
      password,
      sourceId,
    } as ShowBackupPhraseMessage,
    sender,
  );

const createWallet = () =>
  send({
    type: SERVICE_TYPES.CREATE_ACCOUNT,
    password: PASSWORD,
    isOverwritingAccount: false,
  } as CreateAccountMessage);

const importKey = (privateKey: string) =>
  send({
    type: SERVICE_TYPES.IMPORT_ACCOUNT,
    password: PASSWORD,
    privateKey,
  } as ImportAccountMessage);

// No handler adds a second phrase yet; go through the helpers the handlers
// will use.
const addSecondPhrase = async () => {
  const phraseSourceId = await getPhraseSourceId(PHRASE_2.mnemonic);
  await storeAccount({
    mnemonicPhrase: PHRASE_2.mnemonic,
    phraseSourceId,
    sourceId: phraseSourceId,
    password: PASSWORD,
    keyPair: { publicKey: DERIVED_2.publicKey, privateKey: DERIVED_2.secret },
    sessionStore: mockSessionStore,
    localStore: mockDataStorage,
    keyManager: mockKeyManager,
  });
  await addSecretSource({
    localStore: mockDataStorage,
    id: phraseSourceId,
    type: SecretSourceType.PHRASE,
  });
  return phraseSourceId;
};

const keyIds = async (): Promise<string[]> =>
  mockDataStorage.getItem(KEY_ID_LIST);

const reset = async () => {
  await mockStorageApi.clear();
  mockSessionStore.dispatch(sessionSlice.actions.reset());
};

describe("REVEAL_SECRET_KEY", () => {
  const imported = Keypair.random();
  let derivedId = "";
  let importedId = "";

  beforeEach(async () => {
    await reset();
    await createWallet();
    const importResult = await importKey(imported.secret());
    expect(importResult.error).toBeUndefined();
    [derivedId, importedId] = await keyIds();
  });

  it("returns each account's own secret key", async () => {
    expect(await reveal(importedId)).toEqual({ secretKey: imported.secret() });
    expect(await reveal(derivedId)).toEqual({ secretKey: DERIVED_1.secret });
  });

  it("refuses a wrong password while the wallet is unlocked", async () => {
    const result = await reveal(importedId, "wrong-password");
    expect(result).toEqual({ error: "Incorrect password" });
  });

  it("reveals when the session holds no keys", async () => {
    await mockDataStorage.remove(TEMPORARY_STORE_ID);

    expect(await reveal(importedId)).toEqual({ secretKey: imported.secret() });
  });

  it("refuses a wrong password when the session holds no keys", async () => {
    await mockDataStorage.remove(TEMPORARY_STORE_ID);

    const result = await reveal(importedId, "wrong-password");
    expect(result).toEqual({ error: "Incorrect password" });
  });

  it("refuses an account the wallet doesn't hold", async () => {
    expect(await reveal("not-a-key-id")).toEqual({
      error: "Account not found",
    });
  });

  it("refuses a hardware account", async () => {
    const hwId = `hw:${Keypair.random().publicKey()}`;
    await mockDataStorage.setItem(KEY_ID_LIST, [...(await keyIds()), hwId]);

    expect(await reveal(hwId)).toEqual({
      error: "No secret key is held for a hardware account",
    });
  });

  it("refuses a sender that isn't one of our pages", async () => {
    const result = await reveal(importedId, PASSWORD, contentScript);
    expect(result).toEqual({ error: "Unauthorized" });
  });
});

describe("SHOW_BACKUP_PHRASE", () => {
  beforeEach(async () => {
    await reset();
    await createWallet();
  });

  it("returns the phrase to one of our pages", async () => {
    expect(await showPhrase()).toEqual({ mnemonicPhrase: PHRASE_1.mnemonic });
  });

  it("refuses a sender that isn't one of our pages", async () => {
    expect(await showPhrase({ sender: contentScript })).toEqual({
      error: "Unauthorized",
    });
  });

  describe("scoped to a source", () => {
    let phrase1Id = "";
    let phrase2Id = "";

    beforeEach(async () => {
      phrase1Id = await getPhraseSourceId(PHRASE_1.mnemonic);
      phrase2Id = await addSecondPhrase();
    });

    it("reveals the named phrase and not the other one", async () => {
      expect(await showPhrase({ sourceId: phrase2Id })).toEqual({
        mnemonicPhrase: PHRASE_2.mnemonic,
      });
      expect(await showPhrase({ sourceId: phrase1Id })).toEqual({
        mnemonicPhrase: PHRASE_1.mnemonic,
      });
    });

    it("reveals the named phrase when the session holds none", async () => {
      await mockDataStorage.remove(TEMPORARY_STORE_ID);

      expect(await showPhrase({ sourceId: phrase2Id })).toEqual({
        mnemonicPhrase: PHRASE_2.mnemonic,
      });
    });

    it("refuses a secret-key source", async () => {
      const key = Keypair.random();
      await importKey(key.secret());
      const keySourceId = await getSecretKeySourceId(key.secret());

      expect(await showPhrase({ sourceId: keySourceId })).toEqual({
        error: "Recovery phrase not found",
      });
    });

    it("refuses a source the wallet doesn't hold", async () => {
      expect(await showPhrase({ sourceId: "unknown-source" })).toEqual({
        error: "Recovery phrase not found",
      });
    });

    it("refuses a wrong password", async () => {
      const result = await showPhrase({
        sourceId: phrase2Id,
        password: "wrong-password",
      });
      expect(result).toHaveProperty("error");
      expect(result).not.toHaveProperty("mnemonicPhrase");
    });
  });

  describe("while a hardware account is active", () => {
    // A Ledger account's key id has no keystore to check a password against.
    beforeEach(async () => {
      const hwKeyId = `hw:${Keypair.random().publicKey()}`;
      await mockDataStorage.setItem(KEY_ID_LIST, [
        ...(await keyIds()),
        hwKeyId,
      ]);
      await mockDataStorage.setItem(KEY_ID, hwKeyId);
    });

    it("returns the phrase for the right password", async () => {
      expect(await showPhrase()).toEqual({
        mnemonicPhrase: PHRASE_1.mnemonic,
      });
    });

    it("refuses a wrong password", async () => {
      const result = await showPhrase({ password: "wrong-password" });
      expect(result).toHaveProperty("error");
      expect(result).not.toHaveProperty("mnemonicPhrase");
    });
  });
});
