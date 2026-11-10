import { Keypair } from "stellar-sdk";

import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
} from "@shared/api/helpers/authKeypairVectors";
import { Account, SecretSource, SecretSourceType } from "@shared/api/types";
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
  getSecretKeySourceId,
} from "background/helpers/secret-sources";
import {
  APPLICATION_ID,
  DERIVATION_INDICES_ID,
} from "constants/localStorageTypes";
import {
  PENDING_PHRASE_MISSING_ERROR,
  PHRASE_ALREADY_HELD_ERROR,
} from "../handlers/addRecoveryPhraseSource";

// Acceptance (#54): a generated phrase becomes a new phrase source with its
// first account at index 0, from any starting composition, including a
// wallet with no phrase; the user's name sticks; nothing about onboarding
// state moves.

const [PHRASE_1, PHRASE_2] = AUTH_KEYPAIR_VECTORS;
const [ROWS_1, ROWS_2] = ACCOUNT_SOURCE_VECTORS.map(({ accounts }) => accounts);
const PASSWORD = "test";

jest.mock("background/helpers/link-sources", () => ({
  linkWalletSources: jest.fn().mockResolvedValue(undefined),
}));

// StellarHDWallet.fromMnemonic cannot run under jest (bip39 CJS interop), so
// derive from the pinned (mnemonic, index) rows. Each generate hands out the
// next phrase in `mockGenerated`.
const mockGenerated: string[] = [];
jest.mock("stellar-hd-wallet", () => {
  const { ACCOUNT_SOURCE_VECTORS: vectors } = jest.requireActual(
    "@shared/api/helpers/authKeypairVectors",
  );
  return {
    generateMnemonic: () => mockGenerated.shift(),
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
  ) as Promise<any>;

const createWallet = () => {
  mockGenerated.push(PHRASE_1.mnemonic);
  return send({
    type: SERVICE_TYPES.CREATE_ACCOUNT,
    password: PASSWORD,
    isOverwritingAccount: false,
  });
};

const generate = (mnemonic: string) => {
  mockGenerated.push(mnemonic);
  return send({ type: SERVICE_TYPES.GENERATE_RECOVERY_PHRASE });
};

const addPhraseSource = (accountName?: string, password = PASSWORD) =>
  send({
    type: SERVICE_TYPES.ADD_RECOVERY_PHRASE_SOURCE,
    password,
    accountName,
  });

/** A wallet whose only source is an imported secret key. */
const createKeyOnlyWallet = async () => {
  const secret = Keypair.random().secret();
  const sourceId = await getSecretKeySourceId(secret);
  await storeAccount({
    password: PASSWORD,
    keyPair: {
      publicKey: Keypair.fromSecret(secret).publicKey(),
      privateKey: secret,
    },
    sourceId,
    imported: true,
    isSettingHashKey: true,
    sessionStore: mockSessionStore,
    localStore: mockDataStorage,
    keyManager: mockKeyManager,
  });
  await addSecretSource({
    localStore: mockDataStorage,
    id: sourceId,
    type: SecretSourceType.SECRET_KEY,
  });
};

const allAccounts = (): Account[] =>
  mockSessionStore.getState().session.allAccounts ?? [];

const pendingPhrase = () =>
  mockSessionStore.getState().session.pendingMnemonicPhrase;

describe("adding a generated recovery phrase source", () => {
  jest.setTimeout(60_000);

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    mockGenerated.length = 0;
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ account_id: "funded" }),
      }),
    ) as unknown as typeof fetch;
  });

  it("holds a generated phrase without storing it", async () => {
    await createWallet();

    const res = await generate(PHRASE_2.mnemonic);

    expect(res.mnemonicPhrase).toBe(PHRASE_2.mnemonic);
    expect(pendingPhrase()).toBe(PHRASE_2.mnemonic);
    expect(allAccounts()).toHaveLength(1);
    expect(await mockDataStorage.getItem(DERIVATION_INDICES_ID)).toEqual({
      [PHRASE_1.userId]: [0],
    });
  });

  it("stores the phrase as Seed Phrase 2 with its first account at index 0", async () => {
    await createWallet();
    const applicationState = await mockDataStorage.getItem(APPLICATION_ID);
    await generate(PHRASE_2.mnemonic);

    const res = await addPhraseSource("Savings");

    expect(res.error).toBeUndefined();
    expect(res.publicKey).toBe(ROWS_2[0].publicKey);
    const added = allAccounts().find(
      ({ publicKey }) => publicKey === ROWS_2[0].publicKey,
    );
    expect(added).toMatchObject({ sourceId: PHRASE_2.userId, name: "Savings" });
    expect(
      (res.secretSources as SecretSource[]).map(({ id, label }) => [id, label]),
    ).toEqual([
      [PHRASE_1.userId, "Seed Phrase 1"],
      [PHRASE_2.userId, "Seed Phrase 2"],
    ]);
    expect(await mockDataStorage.getItem(DERIVATION_INDICES_ID)).toEqual({
      [PHRASE_1.userId]: [0],
      [PHRASE_2.userId]: [0],
    });
    expect(await mockDataStorage.getItem(APPLICATION_ID)).toBe(
      applicationState,
    );
    expect(pendingPhrase()).toBe("");
  });

  it("then adds the next account under the new phrase, not the first", async () => {
    await createWallet();
    await generate(PHRASE_2.mnemonic);
    await addPhraseSource();

    const res = await send({
      type: SERVICE_TYPES.ADD_ACCOUNT,
      password: PASSWORD,
      sourceId: PHRASE_2.userId,
    });

    expect(res.publicKey).toBe(ROWS_2[1].publicKey);
    expect(
      allAccounts()
        .filter(({ sourceId }) => sourceId === PHRASE_2.userId)
        .map(({ publicKey }) => publicKey),
    ).toEqual([ROWS_2[0].publicKey, ROWS_2[1].publicKey]);
    expect(
      allAccounts()
        .filter(({ sourceId }) => sourceId === PHRASE_1.userId)
        .map(({ publicKey }) => publicKey),
    ).toEqual([ROWS_1[0].publicKey]);
  });

  it("works in a wallet that holds no phrase", async () => {
    await createKeyOnlyWallet();
    await generate(PHRASE_1.mnemonic);

    const res = await addPhraseSource();

    expect(res.error).toBeUndefined();
    expect(res.publicKey).toBe(ROWS_1[0].publicKey);
    expect(
      (res.secretSources as SecretSource[]).map(({ type, label }) => [
        type,
        label,
      ]),
    ).toEqual([
      [SecretSourceType.SECRET_KEY, "Secret Key 1"],
      [SecretSourceType.PHRASE, "Seed Phrase 1"],
    ]);
  });

  it("gives the new account the next unused default name", async () => {
    await createWallet();
    await generate(PHRASE_2.mnemonic);

    await addPhraseSource("   ");

    expect(allAccounts().map(({ name }) => name)).toEqual([
      "Account 1",
      "Account 2",
    ]);
  });

  it("refuses a phrase the wallet already holds", async () => {
    await createWallet();
    await generate(PHRASE_1.mnemonic);

    const res = await addPhraseSource();

    expect(res.error).toBe(PHRASE_ALREADY_HELD_ERROR);
    expect(allAccounts()).toHaveLength(1);
  });

  it("refuses when no phrase was generated", async () => {
    await createWallet();

    const res = await addPhraseSource();

    expect(res.error).toBe(PENDING_PHRASE_MISSING_ERROR);
  });

  it("refuses a wrong password and keeps the phrase for a retry", async () => {
    await createWallet();
    await generate(PHRASE_2.mnemonic);

    const res = await addPhraseSource(undefined, "wrong");

    expect(res.error).toBe("Incorrect password");
    expect(allAccounts()).toHaveLength(1);
    expect(pendingPhrase()).toBe(PHRASE_2.mnemonic);
  });

  it("leaves the application state as onboarding set it", async () => {
    await createWallet();
    await mockDataStorage.setItem(
      APPLICATION_ID,
      APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    );
    await generate(PHRASE_2.mnemonic);

    await addPhraseSource();

    expect(await mockDataStorage.getItem(APPLICATION_ID)).toBe(
      APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    );
  });
});

describe("adding an account with a chosen name", () => {
  jest.setTimeout(60_000);

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    mockGenerated.length = 0;
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ account_id: "funded" }),
      }),
    ) as unknown as typeof fetch;
  });

  it("names the account as asked", async () => {
    await createWallet();

    await send({
      type: SERVICE_TYPES.ADD_ACCOUNT,
      password: PASSWORD,
      sourceId: PHRASE_1.userId,
      accountName: "Trading",
    });

    expect(allAccounts().map(({ name }) => name)).toEqual([
      "Account 1",
      "Trading",
    ]);
  });

  it("skips a default name already in use", async () => {
    await createWallet();
    await send({
      type: SERVICE_TYPES.ADD_ACCOUNT,
      password: PASSWORD,
      accountName: "Account 3",
    });

    await send({ type: SERVICE_TYPES.ADD_ACCOUNT, password: PASSWORD });

    expect(allAccounts().map(({ name }) => name)).toEqual([
      "Account 1",
      "Account 3",
      "Account 4",
    ]);
  });
});
