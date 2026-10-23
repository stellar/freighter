import { Keypair } from "stellar-sdk";

import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import { WalletType } from "@shared/constants/hardwareWallet";
import {
  AddAccountMessage,
  ConfirmPasswordMessage,
  CreateAccountMessage,
  ImportAccountMessage,
  ImportHardWareWalletMessage,
  RecoverAccountMessage,
  SignOutMessage,
} from "@shared/api/types/message-request";
import { AUTH_KEYPAIR_VECTORS } from "@shared/api/helpers/authKeypairVectors";
import { deriveSourceIdentity } from "@shared/api/helpers/deriveAuthKeypair";
import { Account, AccountType } from "@shared/api/types";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import {
  getAccountProvenance,
  setAccountProvenance,
} from "background/helpers/account-provenance";
import {
  ACCOUNT_PROVENANCE_ID,
  KEY_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";

// Acceptance for #75: every account's type and source live in a plain map a
// locked wallet can read with no password; a secret-key import carries no
// phrase in its keystore; unlock reads provenance from the map and never
// from the keystore's `extra`.

const [PHRASE_1, PHRASE_2] = AUTH_KEYPAIR_VECTORS;
// A key no held phrase derives.
const STANDALONE_SECRET =
  "SDHOAMBNLGCE2MV5ZKIVZAQD3VCLGP53P3OBSBI6UN5L5XZI5TKHFQL4";
const HW_PUBLIC_KEY =
  "GBXMNIDFHHJ4KRVYVKWOPLKD4VTBINTOUGFBNV6R2UW4PT2DMJZN3PKD";
const PASSWORD = "test";

// The linker is fire-and-forget: a real pass outlives the test that started it
// and writes the pin into the next test's storage. link-sources.test.ts covers
// it; here only the trigger matters.
jest.mock("background/helpers/link-sources", () => ({
  linkWalletSources: jest.fn().mockResolvedValue(undefined),
}));

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

const mockCaptureException = jest.fn();
jest.mock("@sentry/browser", () => ({
  ...jest.requireActual("@sentry/browser"),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

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

const addAccount = () =>
  send({
    type: SERVICE_TYPES.ADD_ACCOUNT,
    password: PASSWORD,
  } as AddAccountMessage);

const importKey = () =>
  send({
    type: SERVICE_TYPES.IMPORT_ACCOUNT,
    password: PASSWORD,
    privateKey: STANDALONE_SECRET,
  } as ImportAccountMessage) as Promise<{ error?: string }>;

const importLedger = () =>
  send({
    type: SERVICE_TYPES.IMPORT_HARDWARE_WALLET,
    publicKey: HW_PUBLIC_KEY,
    hardwareWalletType: WalletType.LEDGER,
    bipPath: "44'/148'/0'",
  } as ImportHardWareWalletMessage);

const recover = (mnemonic: string, isOverwritingAccount: boolean) =>
  send({
    type: SERVICE_TYPES.RECOVER_ACCOUNT,
    password: PASSWORD,
    recoverMnemonic: mnemonic,
    isOverwritingAccount,
  } as RecoverAccountMessage);

const signOut = () => send({ type: SERVICE_TYPES.SIGN_OUT } as SignOutMessage);

const unlock = () =>
  send({
    type: SERVICE_TYPES.CONFIRM_PASSWORD,
    password: PASSWORD,
  } as ConfirmPasswordMessage);

const allAccounts = (): Account[] =>
  mockSessionStore.getState().session.allAccounts ?? [];

const keyIdList = (): Promise<string[]> => mockDataStorage.getItem(KEY_ID_LIST);

const provenance = () => getAccountProvenance({ localStore: mockDataStorage });

const standaloneSourceId = async () =>
  (
    await deriveSourceIdentity(
      Keypair.fromSecret(STANDALONE_SECRET).rawSecretKey(),
    )
  ).sourceId;

/**
 * A keystore written by hand, the way a pre-#75 install stamped every
 * keystore with the active phrase. Returns its id, listed and active.
 */
const seedStampedKeystore = async ({
  imported,
}: {
  imported: boolean;
}): Promise<string> => {
  const keypair = Keypair.fromSecret(STANDALONE_SECRET);
  const keyStore = await mockKeyManager.storeKey({
    key: {
      extra: { imported, mnemonicPhrase: PHRASE_1.mnemonic },
      type: "plaintextKey" as any,
      publicKey: keypair.publicKey(),
      privateKey: STANDALONE_SECRET,
    },
    password: PASSWORD,
    encrypterName: "ScryptEncrypter",
  });
  await mockDataStorage.setItem(KEY_ID_LIST, [keyStore.id]);
  await mockDataStorage.setItem(KEY_ID, keyStore.id);
  return keyStore.id;
};

describe("account provenance", () => {
  jest.setTimeout(60_000);

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    mockCaptureException.mockReset();
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({}) }),
    ) as unknown as typeof fetch;
  });

  it("records every account's type and source in plain storage", async () => {
    await createWallet();
    await addAccount();
    await importKey();
    await importLedger();

    const [derived0, derived1, imported, hardware] = await keyIdList();
    expect(await provenance()).toEqual({
      [derived0]: { type: AccountType.FREIGHTER, sourceId: PHRASE_1.userId },
      [derived1]: { type: AccountType.FREIGHTER, sourceId: PHRASE_1.userId },
      [imported]: {
        type: AccountType.IMPORTED,
        sourceId: await standaloneSourceId(),
      },
      [hardware]: { type: AccountType.HW },
    });
    expect(hardware).toBe(`hw:${HW_PUBLIC_KEY}`);
  });

  it("keeps the map readable while locked, with no password", async () => {
    await createWallet();
    await importKey();
    const before = await provenance();

    await signOut();

    expect(allAccounts()).toEqual([]);
    expect(await mockDataStorage.getItem(ACCOUNT_PROVENANCE_ID)).toEqual(
      before,
    );
    expect(Object.keys(before)).toHaveLength(2);
  });

  it("stamps no phrase into a secret-key import's keystore", async () => {
    await createWallet();
    const response = await importKey();

    expect(response.error).toBeUndefined();
    const keyId = await mockDataStorage.getItem(KEY_ID);
    const keyStore = await mockKeyManager.loadKey(keyId, PASSWORD);
    expect(keyStore.extra).toEqual({ imported: true });
  });

  it("still stamps the phrase into a derived account's keystore", async () => {
    await createWallet();
    await addAccount();

    const [, keyId] = await keyIdList();
    const keyStore = await mockKeyManager.loadKey(keyId, PASSWORD);
    expect(keyStore.extra).toEqual({
      imported: false,
      mnemonicPhrase: PHRASE_1.mnemonic,
    });
  });

  it("unlocks an import from the map, not from what its keystore says", async () => {
    // A pre-#75 import: stamped with the phrase, and here even mislabelled
    // as not imported. The map is the authority.
    const keyId = await seedStampedKeystore({ imported: false });
    const sourceId = await standaloneSourceId();
    await setAccountProvenance({
      localStore: mockDataStorage,
      keyId,
      type: AccountType.IMPORTED,
      sourceId,
    });

    const response = (await unlock()) as { hasPrivateKey: boolean };

    expect(response.hasPrivateKey).toBe(true);
    expect(allAccounts()).toHaveLength(1);
    expect(allAccounts()[0]).toMatchObject({
      id: keyId,
      imported: true,
      sourceId,
      hardwareWalletType: WalletType.NONE,
    });
  });

  it("unlocks an unattributed keystore with no source and no telemetry", async () => {
    // A pre-V2 account the #76 migration has not reached: its keystore says
    // "imported", but nothing reads that any more.
    const keyId = await seedStampedKeystore({ imported: true });

    await unlock();

    expect(allAccounts()).toHaveLength(1);
    expect(allAccounts()[0]).toMatchObject({ id: keyId, imported: false });
    expect(allAccounts()[0].sourceId).toBeUndefined();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("recovering over a wallet keeps entries only for the recovered accounts", async () => {
    await createWallet();
    await importKey();

    await recover(PHRASE_2.mnemonic, true);

    const list = await keyIdList();
    const map = await provenance();
    expect(Object.keys(map).sort()).toEqual([...list].sort());
    for (const entry of Object.values(map)) {
      expect(entry).toEqual({
        type: AccountType.FREIGHTER,
        sourceId: PHRASE_2.userId,
      });
    }
  });
});
