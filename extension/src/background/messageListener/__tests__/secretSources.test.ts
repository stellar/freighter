import { Keypair } from "stellar-sdk";

import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import {
  AddAccountMessage,
  ConfirmPasswordMessage,
  CreateAccountMessage,
  ImportAccountMessage,
  ShowBackupPhraseMessage,
  SignOutMessage,
} from "@shared/api/types/message-request";
import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
} from "@shared/api/helpers/authKeypairVectors";
import { deriveSourceIdentity } from "@shared/api/helpers/deriveAuthKeypair";
import { SecretSourceType } from "@shared/api/types";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import { storeAccount } from "background/messageListener/helpers/store-account";
import { getMnemonics } from "background/helpers/session";
import {
  addSecretSource,
  getPhraseSourceId,
  getPinnedSourceId,
  getSecretSources,
  setPinnedSourceId,
} from "background/helpers/secret-sources";
import {
  KEY_ID,
  KEY_ID_LIST,
  PINNED_SOURCE_ID,
  SECRET_SOURCES_ID,
  TEMPORARY_STORE_ID,
} from "constants/localStorageTypes";

// Acceptance: a wallet with two phrases and one standalone key unlocks
// with both mnemonics in the temporary store and three SecretSource records
// with the right labels; locking clears the mnemonics and leaves the pinned
// source id in place; a secret-key-only wallet unlocks with a source set and
// an empty mnemonic map.

const [PHRASE_1, PHRASE_2] = AUTH_KEYPAIR_VECTORS;
// A key no held phrase derives.
const STANDALONE_SECRET =
  "SDHOAMBNLGCE2MV5ZKIVZAQD3VCLGP53P3OBSBI6UN5L5XZI5TKHFQL4";
const PASSWORD = "test";

// StellarHDWallet.fromMnemonic cannot run under jest (bip39 CJS interop, see
// deriveAuthKeypair.ts), so derive from the pinned (mnemonic, index) rows.
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

const testAlarm = new MockBrowserAlarm(() => {});
const send = (request: object) =>
  popupMessageListener(
    request as any,
    mockSessionStore,
    mockDataStorage,
    mockKeyManager,
    testAlarm as any,
    { id: "fake-extension-id" },
  );

const createWallet = () =>
  send({
    type: SERVICE_TYPES.CREATE_ACCOUNT,
    password: PASSWORD,
    isOverwritingAccount: false,
  } as CreateAccountMessage);

// No handler adds a second phrase yet; go through the helpers the
// handlers will use.
const addSecondPhrase = async () => {
  const phraseSourceId = await getPhraseSourceId(PHRASE_2.mnemonic);
  const row = ACCOUNT_SOURCE_VECTORS[1].accounts[0];
  await storeAccount({
    mnemonicPhrase: PHRASE_2.mnemonic,
    phraseSourceId,
    sourceId: phraseSourceId,
    password: PASSWORD,
    keyPair: { publicKey: row.publicKey, privateKey: row.secret },
    sessionStore: mockSessionStore,
    localStore: mockDataStorage,
    keyManager: mockKeyManager,
  });
  await addSecretSource({
    localStore: mockDataStorage,
    id: phraseSourceId,
    type: SecretSourceType.PHRASE,
  });
};

const importKey = () =>
  send({
    type: SERVICE_TYPES.IMPORT_ACCOUNT,
    password: PASSWORD,
    privateKey: STANDALONE_SECRET,
  } as ImportAccountMessage);

const signOut = () => send({ type: SERVICE_TYPES.SIGN_OUT } as SignOutMessage);

const unlock = () =>
  send({
    type: SERVICE_TYPES.CONFIRM_PASSWORD,
    password: PASSWORD,
  } as ConfirmPasswordMessage);

const heldMnemonics = () =>
  getMnemonics({ sessionStore: mockSessionStore, localStore: mockDataStorage });

const labels = async () =>
  Object.values(await getSecretSources({ localStore: mockDataStorage })).map(
    ({ label }) => label,
  );

describe("secret sources", () => {
  jest.setTimeout(60_000);

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
  });

  it("holds two phrases and one standalone key as three labelled sources", async () => {
    await createWallet();
    await addSecondPhrase();
    const response = (await importKey()) as { error?: string };

    expect(response.error).toBeUndefined();
    expect(await labels()).toEqual([
      "Seed Phrase 1",
      "Seed Phrase 2",
      "Secret Key 1",
    ]);
    const { sourceId } = await deriveSourceIdentity(
      Keypair.fromSecret(STANDALONE_SECRET).rawSecretKey(),
    );
    const sources = await getSecretSources({ localStore: mockDataStorage });
    expect(sources[sourceId]).toMatchObject({
      type: SecretSourceType.SECRET_KEY,
      label: "Secret Key 1",
    });
    expect(await heldMnemonics()).toEqual({
      [PHRASE_1.userId]: PHRASE_1.mnemonic,
      [PHRASE_2.userId]: PHRASE_2.mnemonic,
    });
  });

  it("keeps stamping the held phrase into a secret-key import", async () => {
    await createWallet();
    await importKey();

    const keyId = await mockDataStorage.getItem(KEY_ID);
    const keyStore = await mockKeyManager.loadKey(keyId, PASSWORD);
    expect(keyStore.extra).toEqual({
      imported: true,
      mnemonicPhrase: PHRASE_1.mnemonic,
    });
  });

  it("locking clears every mnemonic and keeps the sources and the pin", async () => {
    await createWallet();
    await addSecondPhrase();
    await importKey();
    await setPinnedSourceId({
      localStore: mockDataStorage,
      sourceId: PHRASE_1.userId,
    });

    await signOut();

    expect(await mockDataStorage.getItem(TEMPORARY_STORE_ID)).toBeUndefined();
    expect(await heldMnemonics()).toEqual({});
    expect(await labels()).toEqual([
      "Seed Phrase 1",
      "Seed Phrase 2",
      "Secret Key 1",
    ]);
    expect(await getPinnedSourceId({ localStore: mockDataStorage })).toBe(
      PHRASE_1.userId,
    );
  });

  it("unlocking restores every held phrase under its source id", async () => {
    await createWallet();
    await addSecondPhrase();
    await importKey();
    await signOut();

    const response = (await unlock()) as { hasPrivateKey: boolean };

    expect(response.hasPrivateKey).toBe(true);
    expect(await heldMnemonics()).toEqual({
      [PHRASE_1.userId]: PHRASE_1.mnemonic,
      [PHRASE_2.userId]: PHRASE_2.mnemonic,
    });
    const temporaryStore = await mockDataStorage.getItem(TEMPORARY_STORE_ID);
    const keyIdList = await mockDataStorage.getItem(KEY_ID_LIST);
    expect(keyIdList).toHaveLength(3);
    for (const keyId of keyIdList) {
      expect(temporaryStore[keyId]).toBeDefined();
    }
  });

  it("a secret-key-only wallet unlocks with its source set and no mnemonics", async () => {
    const keypair = Keypair.fromSecret(STANDALONE_SECRET);
    const keyStore = await mockKeyManager.storeKey({
      key: {
        extra: { imported: true, mnemonicPhrase: "" },
        type: "plaintextKey" as any,
        publicKey: keypair.publicKey(),
        privateKey: STANDALONE_SECRET,
      },
      password: PASSWORD,
      encrypterName: "ScryptEncrypter",
    });
    await mockDataStorage.setItem(KEY_ID_LIST, [keyStore.id]);
    await mockDataStorage.setItem(KEY_ID, keyStore.id);
    const { sourceId } = await deriveSourceIdentity(keypair.rawSecretKey());
    await addSecretSource({
      localStore: mockDataStorage,
      id: sourceId,
      type: SecretSourceType.SECRET_KEY,
    });

    const response = (await unlock()) as { hasPrivateKey: boolean };

    expect(response.hasPrivateKey).toBe(true);
    expect(await heldMnemonics()).toEqual({});
    expect(await labels()).toEqual(["Secret Key 1"]);
    const temporaryStore = await mockDataStorage.getItem(TEMPORARY_STORE_ID);
    expect(Object.keys(temporaryStore)).toEqual([keyStore.id]);
  });

  it("show recovery phrase and add account still resolve the one held phrase", async () => {
    await createWallet();

    const shown = (await send({
      type: SERVICE_TYPES.SHOW_BACKUP_PHRASE,
      password: PASSWORD,
    } as ShowBackupPhraseMessage)) as { mnemonicPhrase: string };
    const added = (await send({
      type: SERVICE_TYPES.ADD_ACCOUNT,
      password: PASSWORD,
    } as AddAccountMessage)) as { publicKey: string; error?: string };

    expect(shown.mnemonicPhrase).toBe(PHRASE_1.mnemonic);
    expect(added.error).toBeUndefined();
    expect(added.publicKey).toBe(
      ACCOUNT_SOURCE_VECTORS[0].accounts[1].publicKey,
    );
    // A derived account joins its phrase; it is not a new source.
    expect(await labels()).toEqual(["Seed Phrase 1"]);
  });

  it("stores nothing about a source in the keystore", async () => {
    await createWallet();

    expect(await mockDataStorage.getItem(SECRET_SOURCES_ID)).toBeDefined();
    expect(await mockDataStorage.getItem(PINNED_SOURCE_ID)).toBeUndefined();
    const keyId = await mockDataStorage.getItem(KEY_ID);
    const keyStore = await mockKeyManager.loadKey(keyId, PASSWORD);
    expect(Object.keys(keyStore.extra)).toEqual(["imported", "mnemonicPhrase"]);
  });
});
