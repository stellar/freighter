import { logIn, sessionSlice } from "background/ducks/session";
import { markDerivationIndexUsed } from "background/helpers/derivation-indices";
import { getMnemonics } from "background/helpers/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  ACCOUNT_ALREADY_EXISTS_ERROR,
  ACCOUNT_DISCOVERY_FAILED_ERROR,
} from "@shared/constants/errors";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
} from "@shared/api/helpers/authKeypairVectors";
import {
  Account,
  AccountProvenanceMap,
  SecretSource,
  SecretSourceType,
} from "@shared/api/types";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  MockBrowserAlarm,
  mockStorageApi,
} from "background/messageListener/helpers/test-helpers";
import { storeAccount } from "background/messageListener/helpers/store-account";
import {
  addSecretSource,
  getSecretSources,
} from "background/helpers/secret-sources";
import {
  ACCOUNT_NAME_LIST_ID,
  ACCOUNT_PROVENANCE_ID,
  APPLICATION_ID,
  DERIVATION_INDICES_ID,
  KEY_ID,
  KEY_ID_LIST,
  REBRAND_ANNOUNCEMENT_STATUS_ID,
  SECRET_SOURCES_ID,
  TEMPORARY_STORE_ID,
} from "constants/localStorageTypes";
import { REBRAND_ANNOUNCEMENT_STATUS } from "constants/rebrandAnnouncement";
import { PHRASE_ALREADY_HELD_ERROR } from "../handlers/addRecoveryPhraseSource";
import { IMPORT_PHRASE_FAILED_ERROR } from "../handlers/importRecoveryPhrase";

const [PHRASE_1, PHRASE_2] = AUTH_KEYPAIR_VECTORS;
const PASSWORD = "test";
const DEPTH = 50;

jest.mock("background/helpers/link-sources", () => ({
  linkWalletSources: jest.fn().mockResolvedValue(undefined),
}));

// Delegates to the real storeAccount; a test can make one call fail.
jest.mock("background/messageListener/helpers/store-account", () => {
  const actual = jest.requireActual(
    "background/messageListener/helpers/store-account",
  );
  return {
    ...actual,
    storeAccount: jest.fn(actual.storeAccount),
  };
});
const mockStoreAccount = storeAccount as jest.MockedFunction<
  typeof storeAccount
>;
const realStoreAccount = jest.requireActual(
  "background/messageListener/helpers/store-account",
).storeAccount;

// StellarHDWallet.fromMnemonic cannot run under jest (bip39 CJS interop), so
// derive from the pinned (mnemonic, index) rows, and past them from a
// deterministic seed per (mnemonic, index). Only the pinned phrases resolve.
const mockGenerated: string[] = [];
jest.mock("stellar-hd-wallet", () => {
  const { createHash } = jest.requireActual("crypto");
  const { Keypair } = jest.requireActual("stellar-sdk");
  const { ACCOUNT_SOURCE_VECTORS: vectors } = jest.requireActual(
    "@shared/api/helpers/authKeypairVectors",
  );
  return {
    generateMnemonic: () => mockGenerated.shift(),
    fromMnemonic: (mnemonic: string) => {
      const rows = vectors.find((v: any) => v.mnemonic === mnemonic).accounts;
      const keypair = (i: number) =>
        Keypair.fromRawEd25519Seed(
          createHash("sha256").update(`${mnemonic}:${i}`).digest(),
        );
      return {
        getPublicKey: (i: number) =>
          rows[i] ? rows[i].publicKey : keypair(i).publicKey(),
        getSecret: (i: number) =>
          rows[i] ? rows[i].secret : keypair(i).secret(),
      };
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fromMnemonic } = require("stellar-hd-wallet");
const wallet2 = fromMnemonic(PHRASE_2.mnemonic);
const ROWS_1 = ACCOUNT_SOURCE_VECTORS[0].accounts;

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

// One of our own pages: no tab and no foreign extension id. (`browser` is
// an empty mock here, so `runtime.id` is undefined.)
const discover = (mnemonicPhrase: string) =>
  popupMessageListener(
    { type: SERVICE_TYPES.DISCOVER_PHRASE_ACCOUNTS, mnemonicPhrase } as any,
    mockSessionStore,
    mockDataStorage,
    mockKeyManager,
    testAlarm as any,
    {},
  ) as Promise<any>;

/**
 * The import message alone, with the indices discovery would pass. Sent from
 * one of our own pages, as `discover` is.
 */
const importWithIndices = (
  mnemonicPhrase: string,
  fundedIndices: unknown,
  password = PASSWORD,
) =>
  popupMessageListener(
    {
      type: SERVICE_TYPES.IMPORT_RECOVERY_PHRASE,
      password,
      mnemonicPhrase,
      fundedIndices,
    } as any,
    mockSessionStore,
    mockDataStorage,
    mockKeyManager,
    testAlarm as any,
    {},
  ) as Promise<any>;

/** What the popup does: discover, then import with the result. */
const importPhrase = async (mnemonicPhrase: string, password = PASSWORD) => {
  const discovered = await discover(mnemonicPhrase);
  if (discovered.error) {
    return discovered;
  }
  return importWithIndices(mnemonicPhrase, discovered.fundedIndices, password);
};

/** Funded addresses for the mocked Horizon. */
let funded = new Set<string>();
const fund = (...indices: number[]) => {
  funded = new Set(indices.map((i) => wallet2.getPublicKey(i)));
};

const HORIZON_ACCOUNTS = `${MAINNET_NETWORK_DETAILS.networkUrl}/accounts/`;

/** The mainnet account lookups discovery made, ignoring other requests. */
const horizonLookups = () =>
  (global.fetch as jest.Mock).mock.calls.filter(
    ([url]) => typeof url === "string" && url.startsWith(HORIZON_ACCOUNTS),
  );

const allAccounts = (): Account[] =>
  mockSessionStore.getState().session.allAccounts ?? [];

/** One phrase source (Seed Phrase 1) with accounts at indices 0 and 1. */
const createWallet = async () => {
  mockGenerated.push(PHRASE_1.mnemonic);
  await send({
    type: SERVICE_TYPES.CREATE_ACCOUNT,
    password: PASSWORD,
    isOverwritingAccount: false,
  });
  await send({ type: SERVICE_TYPES.ADD_ACCOUNT, password: PASSWORD });
};

/** The first source's stored state, to compare after an import. */
const snapshotFirstSource = async () => {
  const provenance = ((await mockDataStorage.getItem(ACCOUNT_PROVENANCE_ID)) ||
    {}) as AccountProvenanceMap;
  const keyIds = Object.keys(provenance).filter(
    (id) => provenance[id].sourceId === PHRASE_1.userId,
  );
  const names = (await mockDataStorage.getItem(ACCOUNT_NAME_LIST_ID)) || {};
  const keystores: Record<string, unknown> = {};
  for (const id of keyIds) {
    keystores[id] = await mockDataStorage.getItem(`stellarkeys:${id}`);
  }
  return {
    keyIds,
    keystores,
    names: Object.fromEntries(keyIds.map((id) => [id, names[id]])),
    indices: ((await mockDataStorage.getItem(DERIVATION_INDICES_ID)) || {})[
      PHRASE_1.userId
    ],
    provenance: Object.fromEntries(keyIds.map((id) => [id, provenance[id]])),
  };
};

/** What "writes nothing" compares. */
const snapshotWrites = async () => ({
  keyIdList: await mockDataStorage.getItem(KEY_ID_LIST),
  secretSources: await mockDataStorage.getItem(SECRET_SOURCES_ID),
  names: await mockDataStorage.getItem(ACCOUNT_NAME_LIST_ID),
  keyId: await mockDataStorage.getItem(KEY_ID),
});

const newAccounts = () =>
  allAccounts().filter(({ sourceId }) => sourceId === PHRASE_2.userId);

const indicesOf = async (sourceId: string) =>
  ((await mockDataStorage.getItem(DERIVATION_INDICES_ID)) || {})[sourceId];

describe("importing an additional recovery phrase", () => {
  jest.setTimeout(120_000);

  let before: Awaited<ReturnType<typeof snapshotFirstSource>>;

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    mockGenerated.length = 0;
    mockStoreAccount.mockReset();
    mockStoreAccount.mockImplementation(realStoreAccount);
    funded = new Set();
    global.fetch = jest.fn((url: string) => {
      const publicKey = String(url).startsWith(HORIZON_ACCOUNTS)
        ? String(url).slice(HORIZON_ACCOUNTS.length)
        : "";
      const isFunded = funded.has(publicKey);
      return Promise.resolve({
        ok: isFunded,
        status: isFunded ? 200 : 404,
        json: () =>
          Promise.resolve(
            isFunded ? { account_id: publicKey } : { status: 404 },
          ),
      });
    }) as unknown as typeof fetch;

    await createWallet();
    before = await snapshotFirstSource();
    (global.fetch as jest.Mock).mockClear();
  });

  it("adds the second phrase as Seed Phrase 2 with index 0 and its funded indices", async () => {
    fund(3, 10);

    const res = await importPhrase(PHRASE_2.mnemonic);

    expect(res.error).toBeUndefined();
    expect(newAccounts().map(({ publicKey }) => publicKey)).toEqual([
      wallet2.getPublicKey(0),
      wallet2.getPublicKey(3),
      wallet2.getPublicKey(10),
    ]);
    expect(newAccounts().every(({ imported }) => !imported)).toBe(true);
    expect(await indicesOf(PHRASE_2.userId)).toEqual([0, 3, 10]);
    expect(
      (res.secretSources as SecretSource[]).map(({ id, label }) => [id, label]),
    ).toEqual([
      [PHRASE_1.userId, "Seed Phrase 1"],
      [PHRASE_2.userId, "Seed Phrase 2"],
    ]);
    expect(res.allAccounts).toHaveLength(5);
    // Indices 1 to 49 are checked.
    expect(horizonLookups()).toHaveLength(DEPTH - 1);
  });

  it("leaves the first phrase's keystores, names, indices and provenance unchanged", async () => {
    fund(3, 10);
    const keyIdList = await mockDataStorage.getItem(KEY_ID_LIST);

    await importPhrase(PHRASE_2.mnemonic);

    expect(await snapshotFirstSource()).toEqual(before);
    expect(before.keyIds).toHaveLength(2);
    expect(before.indices).toEqual([0, 1]);
    expect(
      (await mockDataStorage.getItem(KEY_ID_LIST)).slice(0, keyIdList.length),
    ).toEqual(keyIdList);
  });

  it("adds only index 0 when nothing is funded", async () => {
    const res = await importPhrase(PHRASE_2.mnemonic);

    expect(res.error).toBeUndefined();
    expect(newAccounts().map(({ publicKey }) => publicKey)).toEqual([
      wallet2.getPublicKey(0),
    ]);
    expect(await indicesOf(PHRASE_2.userId)).toEqual([0]);
  });

  it("makes the new phrase's index 0 active", async () => {
    fund(3, 10);

    const res = await importPhrase(PHRASE_2.mnemonic);

    const first = newAccounts()[0];
    expect(res.publicKey).toBe(wallet2.getPublicKey(0));
    expect(res.activeAccountId).toBe(first.id);
    expect(await mockDataStorage.getItem(KEY_ID)).toBe(first.id);
    expect(mockSessionStore.getState().session.publicKey).toBe(
      wallet2.getPublicKey(0),
    );
  });

  it("accepts a phrase with capitals, newlines and extra spaces and registers the clean phrase's source id", async () => {
    const messy = `\n  ${PHRASE_2.mnemonic
      .toUpperCase()
      .split(" ")
      .join("  \n\t ")}   `;

    const res = await importPhrase(messy);

    expect(res.error).toBeUndefined();
    expect(
      Object.keys(await getSecretSources({ localStore: mockDataStorage })),
    ).toEqual([PHRASE_1.userId, PHRASE_2.userId]);
    expect(newAccounts().map(({ publicKey }) => publicKey)).toEqual([
      wallet2.getPublicKey(0),
    ]);
  });

  it('refuses an invalid phrase with "Invalid mnemonic phrase"', async () => {
    const writes = await snapshotWrites();
    const fifteen =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon address";
    const badChecksum = PHRASE_1.mnemonic.replace(/about$/, "abandon");

    for (const phrase of [fifteen, badChecksum]) {
      const res = await importPhrase(phrase);
      expect(res.error).toBe("Invalid mnemonic phrase");
    }

    expect(await snapshotWrites()).toEqual(writes);
    expect(horizonLookups()).toHaveLength(0);
  });

  it("refuses a phrase the wallet already holds with PHRASE_ALREADY_HELD_ERROR and makes no Horizon request", async () => {
    const writes = await snapshotWrites();

    const res = await importPhrase(PHRASE_1.mnemonic.toUpperCase());

    expect(res.error).toBe(PHRASE_ALREADY_HELD_ERROR);
    expect(horizonLookups()).toHaveLength(0);
    expect(await snapshotWrites()).toEqual(writes);
  });

  it("refuses the whole import when a funded index is already in the wallet", async () => {
    await send({
      type: SERVICE_TYPES.IMPORT_ACCOUNT,
      password: PASSWORD,
      privateKey: wallet2.getSecret(3),
    });
    fund(3, 10);
    const writes = await snapshotWrites();

    const res = await importPhrase(PHRASE_2.mnemonic);

    expect(res.error).toBe(ACCOUNT_ALREADY_EXISTS_ERROR);
    expect(
      (await getSecretSources({ localStore: mockDataStorage }))[
        PHRASE_2.userId
      ],
    ).toBeUndefined();
    expect(newAccounts()).toHaveLength(0);
    expect(await snapshotWrites()).toEqual(writes);
  });

  it("refuses when index 0 was earlier imported as a secret key", async () => {
    await send({
      type: SERVICE_TYPES.IMPORT_ACCOUNT,
      password: PASSWORD,
      privateKey: wallet2.getSecret(0),
    });
    const writes = await snapshotWrites();

    const res = await importPhrase(PHRASE_2.mnemonic);

    expect(res.error).toBe(ACCOUNT_ALREADY_EXISTS_ERROR);
    expect(await snapshotWrites()).toEqual(writes);
  });

  it('refuses a wrong password on a locked session with "Unable to login" and writes nothing', async () => {
    const writes = await snapshotWrites();
    mockSessionStore.dispatch(sessionSlice.actions.reset());

    const res = await importWithIndices(PHRASE_2.mnemonic, [], "wrong");

    expect(res.error).toBe("Unable to login");
    expect(await snapshotWrites()).toEqual(writes);
    expect(horizonLookups()).toHaveLength(0);
  });

  it("leaves the source registered when a storeAccount fails partway, and a retry is refused as already held", async () => {
    fund(3);
    mockStoreAccount
      .mockImplementationOnce(realStoreAccount)
      .mockImplementationOnce(() => Promise.reject(new Error("disk full")));
    const activeBefore = await mockDataStorage.getItem(KEY_ID);
    const publicKeyBefore = mockSessionStore.getState().session.publicKey;

    const res = await importPhrase(PHRASE_2.mnemonic);

    expect(res.error).toBe(IMPORT_PHRASE_FAILED_ERROR);
    // The active account is put back to the one active before the import.
    expect(await mockDataStorage.getItem(KEY_ID)).toBe(activeBefore);
    expect(mockSessionStore.getState().session.publicKey).toBe(publicKeyBefore);
    expect(
      (await getSecretSources({ localStore: mockDataStorage }))[
        PHRASE_2.userId
      ],
    ).toBeDefined();

    const retry = await importPhrase(PHRASE_2.mnemonic);
    expect(retry.error).toBe(PHRASE_ALREADY_HELD_ERROR);
  });

  it("rolls back when the first storeAccount fails before writing, and a retry imports", async () => {
    fund(3);
    mockStoreAccount.mockImplementationOnce(() =>
      Promise.reject(new Error("disk full")),
    );
    const writes = await snapshotWrites();
    const accountsBefore = allAccounts();

    const res = await importPhrase(PHRASE_2.mnemonic);

    expect(res.error).toBe(IMPORT_PHRASE_FAILED_ERROR);
    expect(
      (await getSecretSources({ localStore: mockDataStorage }))[
        PHRASE_2.userId
      ],
    ).toBeUndefined();
    expect((await indicesOf(PHRASE_2.userId)) ?? []).toEqual([]);
    expect(await snapshotWrites()).toEqual(writes);
    expect(allAccounts()).toEqual(accountsBefore);

    const retry = await importPhrase(PHRASE_2.mnemonic);
    expect(retry.error).toBeUndefined();
    expect(
      (retry.secretSources as SecretSource[]).find(
        ({ id }) => id === PHRASE_2.userId,
      )?.label,
    ).toBe("Seed Phrase 2");
    expect(newAccounts().map(({ publicKey }) => publicKey)).toEqual([
      wallet2.getPublicKey(0),
      wallet2.getPublicKey(3),
    ]);
  });

  it("removes the phrase, keystore, private key and provenance when the first store fails at the keystore id list", async () => {
    fund(3);
    const heldPhrases = async () =>
      Object.keys(
        await getMnemonics({
          sessionStore: mockSessionStore,
          localStore: mockDataStorage,
        }),
      );
    const temporaryKeys = async () =>
      Object.keys(
        (await mockDataStorage.getItem(TEMPORARY_STORE_ID)) || {},
      ).sort();
    const keystoreIds = async () =>
      (await mockKeyManager.loadAllKeyIds()).sort();

    const phrasesBefore = await heldPhrases();
    const temporaryKeysBefore = await temporaryKeys();
    const keystoreIdsBefore = await keystoreIds();
    const provenanceBefore = await mockDataStorage.getItem(
      ACCOUNT_PROVENANCE_ID,
    );
    // Copied: the mock storage hands out the arrays it holds, and
    // storeAccount pushes onto the keystore id list it reads.
    const writes = JSON.parse(JSON.stringify(await snapshotWrites()));
    const accountsBefore = allAccounts();

    // Everything storeAccount writes before the list has landed by then.
    // Real storage returns a copy, so there the push is lost with the failed
    // write; put the list back to match.
    const keyIdListBefore = [...(await mockDataStorage.getItem(KEY_ID_LIST))];
    const realSetItem = mockDataStorage.setItem;
    const setItem = jest
      .spyOn(mockDataStorage, "setItem")
      .mockImplementation(async (key, value) => {
        if (key === KEY_ID_LIST) {
          await realSetItem(key, keyIdListBefore);
          throw new Error("disk full");
        }
        return realSetItem(key, value);
      });
    let res;
    try {
      res = await importPhrase(PHRASE_2.mnemonic);
    } finally {
      setItem.mockRestore();
    }

    expect(res.error).toBe(IMPORT_PHRASE_FAILED_ERROR);
    expect(phrasesBefore).not.toContain(PHRASE_2.userId);
    expect(await heldPhrases()).toEqual(phrasesBefore);
    expect(await keystoreIds()).toEqual(keystoreIdsBefore);
    expect(await temporaryKeys()).toEqual(temporaryKeysBefore);
    expect(await mockDataStorage.getItem(ACCOUNT_PROVENANCE_ID)).toEqual(
      provenanceBefore,
    );
    expect(await snapshotWrites()).toEqual(writes);
    expect(allAccounts()).toEqual(accountsBefore);

    const retry = await importPhrase(PHRASE_2.mnemonic);
    expect(retry.error).toBeUndefined();
    expect(await heldPhrases()).toContain(PHRASE_2.userId);
    // One keystore per imported account, none left over from the failure.
    expect(await keystoreIds()).toHaveLength(keystoreIdsBefore.length + 2);
  });

  it("rolls back the session when the first store fails after joining it", async () => {
    // Fails the way storeAccount would after its session dispatch and index
    // mark, but before the keystore id reaches the list.
    mockStoreAccount.mockImplementationOnce(async (args) => {
      await markDerivationIndexUsed({
        localStore: args.localStore,
        sourceId: PHRASE_2.userId,
        index: 0,
      });
      await args.sessionStore.dispatch(
        logIn({
          publicKey: args.keyPair.publicKey,
          allAccounts: [
            ...allAccounts(),
            {
              id: "phantom",
              sourceId: PHRASE_2.userId,
              publicKey: args.keyPair.publicKey,
              name: "Account 3",
              imported: false,
            },
          ],
          localStore: args.localStore,
        }) as any,
      );
      throw new Error("disk full");
    });
    const accountsBefore = allAccounts();
    const publicKeyBefore = mockSessionStore.getState().session.publicKey;

    const res = await importPhrase(PHRASE_2.mnemonic);

    expect(res.error).toBe(IMPORT_PHRASE_FAILED_ERROR);
    expect(allAccounts()).toEqual(accountsBefore);
    expect(mockSessionStore.getState().session.publicKey).toBe(publicKeyBefore);
    expect((await indicesOf(PHRASE_2.userId)) ?? []).toEqual([]);
    expect(
      (await getSecretSources({ localStore: mockDataStorage }))[
        PHRASE_2.userId
      ],
    ).toBeUndefined();

    const retry = await importPhrase(PHRASE_2.mnemonic);
    expect(retry.error).toBeUndefined();
    expect(newAccounts()).toHaveLength(1);
  });

  it("refuses with ACCOUNT_DISCOVERY_FAILED_ERROR when a lookup fails, writes nothing, and a retry imports", async () => {
    fund(3);
    const writes = await snapshotWrites();
    const accountsBefore = allAccounts();
    const realFetch = global.fetch as jest.Mock;
    global.fetch = jest.fn((url: string) =>
      String(url) === `${HORIZON_ACCOUNTS}${wallet2.getPublicKey(7)}`
        ? Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve({ status: 429 }),
          })
        : realFetch(url),
    ) as unknown as typeof fetch;

    const res = await importPhrase(PHRASE_2.mnemonic);

    expect(res.error).toBe(ACCOUNT_DISCOVERY_FAILED_ERROR);
    expect(
      (await getSecretSources({ localStore: mockDataStorage }))[
        PHRASE_2.userId
      ],
    ).toBeUndefined();
    expect(await snapshotWrites()).toEqual(writes);
    expect(allAccounts()).toEqual(accountsBefore);

    global.fetch = realFetch;
    const retry = await importPhrase(PHRASE_2.mnemonic);
    expect(retry.error).toBeUndefined();
    expect(newAccounts().map(({ publicKey }) => publicKey)).toEqual([
      wallet2.getPublicKey(0),
      wallet2.getPublicKey(3),
    ]);
  });

  it("refuses with PHRASE_ALREADY_HELD_ERROR when the phrase is registered between discovery and import", async () => {
    fund(3, 10);
    const writes = await snapshotWrites();
    mockStoreAccount.mockClear();

    const { fundedIndices } = await discover(PHRASE_2.mnemonic);
    // Another window finishes importing the same phrase in between.
    await addSecretSource({
      localStore: mockDataStorage,
      id: PHRASE_2.userId,
      type: SecretSourceType.PHRASE,
    });
    const res = await importWithIndices(PHRASE_2.mnemonic, fundedIndices);

    expect(res.error).toBe(PHRASE_ALREADY_HELD_ERROR);
    expect(newAccounts()).toHaveLength(0);
    expect(mockStoreAccount).not.toHaveBeenCalled();
    const after = await snapshotWrites();
    expect(after.keyIdList).toEqual(writes.keyIdList);
    expect(after.names).toEqual(writes.names);
    expect(after.keyId).toEqual(writes.keyId);
  });

  it("makes no Horizon request during the import itself", async () => {
    fund(3, 10);
    const { fundedIndices } = await discover(PHRASE_2.mnemonic);
    (global.fetch as jest.Mock).mockClear();

    const res = await importWithIndices(PHRASE_2.mnemonic, fundedIndices);

    expect(res.error).toBeUndefined();
    expect(horizonLookups()).toHaveLength(0);
    expect(await indicesOf(PHRASE_2.userId)).toEqual([0, 3, 10]);
  });

  it("sorts the indices it is given", async () => {
    const res = await importWithIndices(PHRASE_2.mnemonic, [10, 3]);

    expect(res.error).toBeUndefined();
    expect(await indicesOf(PHRASE_2.userId)).toEqual([0, 3, 10]);
  });

  it.each([
    ["missing", undefined],
    ["index 0", [0]],
    ["past the discovery depth", [DEPTH]],
    ["negative", [-1]],
    ["fractional", [1.5]],
    ["a string", ["3"]],
    ["duplicated", [3, 3]],
  ])(
    "refuses %s indices with IMPORT_PHRASE_FAILED_ERROR and writes nothing",
    async (_, fundedIndices) => {
      const writes = await snapshotWrites();

      const res = await importWithIndices(PHRASE_2.mnemonic, fundedIndices);

      expect(res.error).toBe(IMPORT_PHRASE_FAILED_ERROR);
      expect(await snapshotWrites()).toEqual(writes);
      expect(newAccounts()).toHaveLength(0);
    },
  );

  it("refuses discovery from a web page", async () => {
    const res = await popupMessageListener(
      {
        type: SERVICE_TYPES.DISCOVER_PHRASE_ACCOUNTS,
        mnemonicPhrase: PHRASE_2.mnemonic,
      } as any,
      mockSessionStore,
      mockDataStorage,
      mockKeyManager,
      testAlarm as any,
      {
        id: "fake-extension-id",
        tab: {},
        url: "https://evil.example",
      },
    );

    expect((res as { error?: string }).error).toBe("Unauthorized");
    expect(horizonLookups()).toHaveLength(0);
  });

  it("refuses the import from a web page and writes nothing", async () => {
    const writes = await snapshotWrites();

    const res = await popupMessageListener(
      {
        type: SERVICE_TYPES.IMPORT_RECOVERY_PHRASE,
        password: PASSWORD,
        mnemonicPhrase: PHRASE_2.mnemonic,
        fundedIndices: [],
      } as any,
      mockSessionStore,
      mockDataStorage,
      mockKeyManager,
      testAlarm as any,
      {
        id: "fake-extension-id",
        tab: {},
        url: "https://evil.example",
      },
    );

    expect((res as { error?: string }).error).toBe("Unauthorized");
    expect(await snapshotWrites()).toEqual(writes);
    expect(newAccounts()).toHaveLength(0);
  });

  it("does not touch application state or the rebrand announcement status", async () => {
    await mockDataStorage.setItem(
      APPLICATION_ID,
      APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    );
    await mockDataStorage.setItem(
      REBRAND_ANNOUNCEMENT_STATUS_ID,
      REBRAND_ANNOUNCEMENT_STATUS.PENDING,
    );

    const res = await importPhrase(PHRASE_2.mnemonic);

    expect(res.error).toBeUndefined();
    expect(await mockDataStorage.getItem(APPLICATION_ID)).toBe(
      APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    );
    expect(await mockDataStorage.getItem(REBRAND_ANNOUNCEMENT_STATUS_ID)).toBe(
      REBRAND_ANNOUNCEMENT_STATUS.PENDING,
    );
    expect(allAccounts().map(({ publicKey }) => publicKey)).toEqual(
      expect.arrayContaining([ROWS_1[0].publicKey, ROWS_1[1].publicKey]),
    );
  });
});
