import { logIn, sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import {
  AddAccountMessage,
  CreateAccountMessage,
  MakeAccountActiveMessage,
  RecoverAccountMessage,
} from "@shared/api/types/message-request";
import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
} from "@shared/api/helpers/authKeypairVectors";
import { Account, SecretSourceType } from "@shared/api/types";
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
} from "background/helpers/secret-sources";
import { releaseDerivationIndex } from "background/helpers/derivation-indices";
import {
  DERIVATION_INDICES_ID,
  KEY_DERIVATION_NUMBER_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";

// Acceptance: a new account takes its phrase's lowest unused
// derivation index; two phrases each derive from 0 upward independently; the
// source is explicit on the message or implied by the active account; a
// released index is re-derived to the same key; the global counter is gone.

const [PHRASE_1, PHRASE_2] = AUTH_KEYPAIR_VECTORS;
const [ROWS_1, ROWS_2] = ACCOUNT_SOURCE_VECTORS.map(({ accounts }) => accounts);
const PASSWORD = "test";

// The linker is fire-and-forget: a real pass outlives the test that started it
// and writes the pin into the next test's storage. link-sources.test.ts covers
// it; here only the trigger matters.
jest.mock("background/helpers/link-sources", () => ({
  linkWalletSources: jest.fn().mockResolvedValue(undefined),
}));

// StellarHDWallet.fromMnemonic cannot run under jest (bip39 CJS interop, see
// deriveAuthKeypair.ts), so derive from the pinned (mnemonic, index) rows.
// Only indices 0..2 are pinned; a higher index throws.
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

type AddResponse = { publicKey: string; error?: string };

const createWallet = () =>
  send({
    type: SERVICE_TYPES.CREATE_ACCOUNT,
    password: PASSWORD,
    isOverwritingAccount: false,
  } as CreateAccountMessage);

const addAccount = (sourceId?: string) =>
  send({
    type: SERVICE_TYPES.ADD_ACCOUNT,
    password: PASSWORD,
    sourceId,
  } as AddAccountMessage) as Promise<AddResponse>;

const makeActive = (publicKey: string) =>
  send({
    type: SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE,
    publicKey,
  } as MakeAccountActiveMessage);

const recover = () =>
  send({
    type: SERVICE_TYPES.RECOVER_ACCOUNT,
    password: PASSWORD,
    recoverMnemonic: PHRASE_1.mnemonic,
    isOverwritingAccount: false,
  } as RecoverAccountMessage);

// No handler adds a second phrase yet; go through the helpers the
// handlers will use, at the phrase's index 0.
const addSecondPhrase = async () => {
  const phraseSourceId = await getPhraseSourceId(PHRASE_2.mnemonic);
  await storeAccount({
    mnemonicPhrase: PHRASE_2.mnemonic,
    phraseSourceId,
    sourceId: phraseSourceId,
    derivationIndex: 0,
    password: PASSWORD,
    keyPair: { publicKey: ROWS_2[0].publicKey, privateKey: ROWS_2[0].secret },
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

const allAccounts = (): Account[] =>
  mockSessionStore.getState().session.allAccounts ?? [];

const keyIdList = (): Promise<string[]> => mockDataStorage.getItem(KEY_ID_LIST);

const indexMap = (): Promise<Record<string, number[]>> =>
  mockDataStorage.getItem(DERIVATION_INDICES_ID);

/** Drops an account the way a removal flow will: session, list, index. */
const removeAccount = async (account: Account) => {
  const remaining = allAccounts().filter(({ id }) => id !== account.id);
  mockSessionStore.dispatch(
    logIn.fulfilled(
      { publicKey: remaining[0].publicKey, allAccounts: remaining },
      "",
      {} as any,
    ),
  );
  await mockDataStorage.setItem(
    KEY_ID_LIST,
    (await keyIdList()).filter((id) => id !== account.id),
  );
};

describe("per-source derivation indices", () => {
  jest.setTimeout(60_000);

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ account_id: "funded" }),
      }),
    ) as unknown as typeof fetch;
  });

  it("creates the first account at index 0 of its phrase", async () => {
    await createWallet();

    expect(await indexMap()).toEqual({ [PHRASE_1.userId]: [0] });
  });

  it("adds at the one held phrase's lowest unused index when no source is named", async () => {
    await createWallet();

    const added = await addAccount();

    expect(added.error).toBeUndefined();
    expect(added.publicKey).toBe(ROWS_1[1].publicKey);
    expect(await indexMap()).toEqual({ [PHRASE_1.userId]: [0, 1] });
  });

  it("derives each phrase from index 0 upward independently", async () => {
    await createWallet();
    await addSecondPhrase();

    const onSecond = await addAccount(PHRASE_2.userId);
    const onFirst = await addAccount(PHRASE_1.userId);

    expect(onSecond.publicKey).toBe(ROWS_2[1].publicKey);
    expect(onFirst.publicKey).toBe(ROWS_1[1].publicKey);
    expect(await indexMap()).toEqual({
      [PHRASE_1.userId]: [0, 1],
      [PHRASE_2.userId]: [0, 1],
    });
    const bySource = (sourceId: string) =>
      allAccounts()
        .filter((a) => a.sourceId === sourceId)
        .map(({ publicKey }) => publicKey);
    expect(bySource(PHRASE_1.userId)).toEqual([
      ROWS_1[0].publicKey,
      ROWS_1[1].publicKey,
    ]);
    expect(bySource(PHRASE_2.userId)).toEqual([
      ROWS_2[0].publicKey,
      ROWS_2[1].publicKey,
    ]);
  });

  it("follows the active account's phrase when several are held and none is named", async () => {
    await createWallet();
    await addSecondPhrase(); // the new account on phrase 2 is now active

    const onSecond = await addAccount();
    await makeActive(ROWS_1[0].publicKey);
    const onFirst = await addAccount();

    expect(onSecond.publicKey).toBe(ROWS_2[1].publicKey);
    expect(onFirst.publicKey).toBe(ROWS_1[1].publicKey);
  });

  it("rejects a source the wallet does not hold and stores nothing", async () => {
    await createWallet();
    const listBefore = await keyIdList();
    const accountsBefore = allAccounts();

    const response = await addAccount("f".repeat(64));

    expect(response.error).toBeDefined();
    expect(await keyIdList()).toEqual(listBefore);
    expect(allAccounts()).toEqual(accountsBefore);
    expect(await indexMap()).toEqual({ [PHRASE_1.userId]: [0] });
  });

  it("re-derives the same key after an account is removed and its index released", async () => {
    await createWallet();
    const { publicKey: addedKey } = await addAccount();
    const removed = allAccounts().find(
      ({ publicKey }) => publicKey === addedKey,
    ) as Account;
    await removeAccount(removed);
    await releaseDerivationIndex({
      localStore: mockDataStorage,
      sourceId: PHRASE_1.userId,
      index: 1,
    });

    const readded = await addAccount();

    expect(readded.publicKey).toBe(ROWS_1[1].publicKey);
    expect(readded.publicKey).toBe(removed.publicKey);
    expect(await indexMap()).toEqual({ [PHRASE_1.userId]: [0, 1] });
    expect(allAccounts()).toHaveLength(2);
  });

  it("skips an index whose key the wallet already holds and records it", async () => {
    await createWallet();
    await addAccount();
    // A set that under-approximates the accounts: nothing marked at all.
    await mockDataStorage.remove(DERIVATION_INDICES_ID);

    const added = await addAccount();

    expect(added.error).toBeUndefined();
    expect(added.publicKey).toBe(ROWS_1[2].publicKey);
    expect(await indexMap()).toEqual({ [PHRASE_1.userId]: [0, 1, 2] });
    expect(allAccounts().map(({ publicKey }) => publicKey)).toEqual([
      ROWS_1[0].publicKey,
      ROWS_1[1].publicKey,
      ROWS_1[2].publicKey,
    ]);
  });

  it("records every funded index a recovery preloads", async () => {
    await recover();

    // Indices 1..5 are probed; only 0..2 are pinned, so 3..5 cannot derive.
    expect(allAccounts().map(({ publicKey }) => publicKey)).toEqual([
      ROWS_1[0].publicKey,
      ROWS_1[1].publicKey,
      ROWS_1[2].publicKey,
    ]);
    expect(await indexMap()).toEqual({ [PHRASE_1.userId]: [0, 1, 2] });
  });

  it("recovering over a wallet starts the index sets afresh", async () => {
    await createWallet();
    await addSecondPhrase();

    await send({
      type: SERVICE_TYPES.RECOVER_ACCOUNT,
      password: PASSWORD,
      recoverMnemonic: PHRASE_2.mnemonic,
      isOverwritingAccount: true,
    } as RecoverAccountMessage);

    expect(await indexMap()).toEqual({ [PHRASE_2.userId]: [0, 1, 2] });
  });

  it("never writes the global derivation counter", async () => {
    await createWallet();
    await addAccount();
    expect(
      await mockDataStorage.getItem(KEY_DERIVATION_NUMBER_ID),
    ).toBeUndefined();

    await recover();
    expect(
      await mockDataStorage.getItem(KEY_DERIVATION_NUMBER_ID),
    ).toBeUndefined();
  });
});
