import { Keypair } from "stellar-sdk";

import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import {
  RecoverAccountFromSecretKeyMessage,
  RecoverAccountMessage,
} from "@shared/api/types/message-request";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import { AUTH_KEYPAIR_VECTORS } from "@shared/api/helpers/authKeypairVectors";
import { SecretSourceType } from "@shared/api/types";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  APPLICATION_ID,
  KEY_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";
import {
  addSecretSource,
  getSecretKeySourceId,
  getSecretSources,
} from "background/helpers/secret-sources";
import { getDerivationIndices } from "background/helpers/derivation-indices";
import { ACCOUNT_MUTATING_SERVICE_TYPES } from "background/helpers/account-mutation-lock";

jest.mock("background/helpers/secret-sources", () => ({
  ...jest.requireActual("background/helpers/secret-sources"),
  addSecretSource: jest.fn(),
}));

// The linker is fire-and-forget: a real pass outlives the test that started it
// and writes into the next test's storage. Only the trigger matters here.
jest.mock("background/helpers/link-sources", () => ({
  linkWalletSources: jest.fn().mockResolvedValue(undefined),
}));

// The phrase seed only needs to store an account; as in recoverAccount.test,
// the real HD wallet is swapped for a stub that derives per-index keys.
jest.mock("stellar-hd-wallet", () => ({
  generateMnemonic: () => "unused",
  fromMnemonic: () => ({
    getPublicKey: (index: number) => `pubKey${index}`,
    getSecret: (index: number) => `secret${index}`,
  }),
}));

const VECTOR = AUTH_KEYPAIR_VECTORS[0];
const SECRET = Keypair.random().secret();

const testAlarm = new MockBrowserAlarm(() => {});

type RecoveryResponse = {
  allAccounts: { publicKey: string; imported: boolean; id: string }[];
  publicKey: string;
  applicationState: string;
  hasPrivateKey: boolean;
  error: string;
};

const send = (message: object) =>
  popupMessageListener(
    message as any,
    mockSessionStore,
    mockDataStorage,
    mockKeyManager,
    testAlarm as any,
    { id: "fake-extension-id" },
  ) as Promise<RecoveryResponse>;

const recoverFromSecretKey = (
  secretKey: string,
  isOverwritingAccount = false,
) =>
  send({
    type: SERVICE_TYPES.RECOVER_ACCOUNT_FROM_SECRET_KEY,
    password: "test",
    secretKey,
    isOverwritingAccount,
  } as RecoverAccountFromSecretKeyMessage);

const recoverFromPhrase = () =>
  send({
    type: SERVICE_TYPES.RECOVER_ACCOUNT,
    password: "test",
    recoverMnemonic: VECTOR.mnemonic,
    isOverwritingAccount: false,
  } as RecoverAccountMessage);

const snapshotWallet = async () => {
  const keyIdList = (await mockDataStorage.getItem(KEY_ID_LIST)) as string[];
  const keystores = await Promise.all(
    keyIdList.map((id) => mockDataStorage.getItem(`stellarkeys:${id}`)),
  );
  return {
    keyIdList,
    keystores,
    sources: await getSecretSources({ localStore: mockDataStorage }),
    applicationState: await mockDataStorage.getItem(APPLICATION_ID),
  };
};

describe("Recover account from secret key message listener", () => {
  // Each recovery runs Scrypt; under a parallel run that outlasts the 5 s
  // default, as the sibling suites already allow for.
  jest.setTimeout(60_000);

  let startSession: jest.SpyInstance;

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    // Nothing past index 0 is funded, so seeding a phrase wallet stores one
    // account and stays fast.
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({}) }),
    ) as unknown as typeof fetch;
    startSession = jest.spyOn(testAlarm, "startSession");
    const actual = jest.requireActual("background/helpers/secret-sources");
    (addSecretSource as jest.Mock).mockImplementation(actual.addSecretSource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a one-account wallet with no phrase", async () => {
    const res = await recoverFromSecretKey(SECRET);

    expect(res.error).toBe("");
    expect(res.allAccounts).toHaveLength(1);
    expect(res.allAccounts[0].imported).toBe(true);
    expect(res.publicKey).toBe(Keypair.fromSecret(SECRET).publicKey());
    expect(res.hasPrivateKey).toBe(true);

    const sourceId = await getSecretKeySourceId(SECRET);
    const sources = await getSecretSources({ localStore: mockDataStorage });
    expect(Object.values(sources)).toEqual([
      expect.objectContaining({
        id: sourceId,
        type: SecretSourceType.SECRET_KEY,
      }),
    ]);

    const key = await mockKeyManager.loadKey(res.allAccounts[0].id, "test");
    expect(key.extra).not.toHaveProperty("mnemonicPhrase");

    expect(await mockDataStorage.getItem(APPLICATION_ID)).toBe(
      APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    );
  });

  it("rejects an invalid key without touching storage", async () => {
    await recoverFromPhrase();
    const before = await snapshotWallet();
    expect(before.keyIdList).toHaveLength(1);

    for (const isOverwritingAccount of [false, true]) {
      const res = await recoverFromSecretKey("SBAD", isOverwritingAccount);

      expect(res.error).toBe("Invalid secret key");
      expect(await snapshotWallet()).toEqual(before);
    }
  });

  it("replaces an existing wallet when overwriting", async () => {
    await recoverFromPhrase();
    expect(
      await getDerivationIndices({
        localStore: mockDataStorage,
        sourceId: VECTOR.userId,
      }),
    ).toEqual([0]);

    const res = await recoverFromSecretKey(SECRET, true);

    expect(res.error).toBe("");
    expect(res.allAccounts.map(({ publicKey }) => publicKey)).toEqual([
      Keypair.fromSecret(SECRET).publicKey(),
    ]);
    expect(
      (await mockDataStorage.getItem(KEY_ID_LIST)) as string[],
    ).toHaveLength(1);
    const sourceId = await getSecretKeySourceId(SECRET);
    expect(
      Object.keys(await getSecretSources({ localStore: mockDataStorage })),
    ).toEqual([sourceId]);
    expect(
      await getDerivationIndices({
        localStore: mockDataStorage,
        sourceId: VECTOR.userId,
      }),
    ).toEqual([]);
  });

  it("leaves a clean fresh install when storing fails", async () => {
    jest
      .spyOn(mockKeyManager, "storeKey")
      .mockRejectedValueOnce(new Error("storage full"));

    const res = await recoverFromSecretKey(SECRET);

    expect(res.error).toBe("Error importing account");
    expect(
      ((await mockDataStorage.getItem(KEY_ID_LIST)) as string[] | null) ?? [],
    ).toEqual([]);
    expect(await getSecretSources({ localStore: mockDataStorage })).toEqual({});
    expect(await mockDataStorage.getItem(APPLICATION_ID)).toBeFalsy();
    expect(startSession).not.toHaveBeenCalled();
  });

  it("leaves a clean fresh install when registering the source fails", async () => {
    (addSecretSource as jest.Mock).mockRejectedValueOnce(new Error("boom"));

    const res = await recoverFromSecretKey(SECRET);

    expect(res.error).toBe("Error importing account");
    const keyIdList =
      ((await mockDataStorage.getItem(KEY_ID_LIST)) as string[] | null) ?? [];
    expect(keyIdList).toEqual([]);
    expect(await mockDataStorage.getItem(KEY_ID)).toBeFalsy();
    const leftover = Object.keys(await mockStorageApi.get(null)).filter((k) =>
      k.startsWith("stellarkeys:"),
    );
    expect(leftover).toEqual([]);
    expect(await getSecretSources({ localStore: mockDataStorage })).toEqual({});
    expect(await mockDataStorage.getItem(APPLICATION_ID)).toBeFalsy();
    expect(startSession).not.toHaveBeenCalled();
  });

  it("is serialized with other account mutations", () => {
    expect(
      ACCOUNT_MUTATING_SERVICE_TYPES.has(
        SERVICE_TYPES.RECOVER_ACCOUNT_FROM_SECRET_KEY,
      ),
    ).toBe(true);
  });
});
