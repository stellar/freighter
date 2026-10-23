import { logIn, sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import {
  AddAccountMessage,
  CreateAccountMessage,
  MigrateAccountsMessage,
} from "@shared/api/types/message-request";
import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
} from "@shared/api/helpers/authKeypairVectors";
import { Account, BalanceToMigrate } from "@shared/api/types";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import {
  ACCOUNT_PROVENANCE_ID,
  DERIVATION_INDICES_ID,
  KEY_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";
import { AccountType } from "@shared/api/types";
import { linkWalletSources } from "background/helpers/link-sources";

// #73: the migration resolves the account to replace by its id, swaps the
// replacement into that keystore's slot in `keyIdList` (not in
// `allAccounts`), and activates an account that was actually migrated.
// #74: each replacement derives at the migrated phrase's lowest unused index,
// and an index derived in a run is never handed out twice in that run.

const [PHRASE_1, PHRASE_2] = AUTH_KEYPAIR_VECTORS;
const NEW_ACCOUNTS = ACCOUNT_SOURCE_VECTORS[1].accounts;
const PASSWORD = "test";

// The linker is fire-and-forget: a real pass outlives the test that started it
// and writes the pin into the next test's storage. link-sources.test.ts covers
// it; here only the trigger matters.
jest.mock("background/helpers/link-sources", () => ({
  linkWalletSources: jest.fn().mockResolvedValue(undefined),
}));

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

const mockSubmitTx = jest.fn();
jest.mock("@shared/api/helpers/stellarSdkServer", () => {
  const { Account: SdkAccount } = jest.requireActual("stellar-sdk");
  return {
    stellarSdkServer: () => ({
      loadAccount: async (publicKey: string) => new SdkAccount(publicKey, "1"),
    }),
    submitTx: (...args: unknown[]) => mockSubmitTx(...args),
  };
});

jest.mock("background/helpers/migration", () => ({
  migrateTrustlines: jest.fn().mockResolvedValue(undefined),
}));

const mockLink = linkWalletSources as jest.Mock;

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

const allAccounts = (): Account[] =>
  mockSessionStore.getState().session.allAccounts ?? [];

const keyIdList = (): Promise<string[]> => mockDataStorage.getItem(KEY_ID_LIST);

const indexMap = (): Promise<Record<string, number[]>> =>
  mockDataStorage.getItem(DERIVATION_INDICES_ID);

const provenance = (): Promise<
  Record<string, { type: AccountType; sourceId?: string }>
> => mockDataStorage.getItem(ACCOUNT_PROVENANCE_ID);

const balanceFor = (account: Account): BalanceToMigrate => ({
  id: account.id,
  publicKey: account.publicKey,
  name: account.name,
  minBalance: "1",
  xlmBalance: "10",
  trustlineBalances: [],
});

const migrate = (balancesToMigrate: BalanceToMigrate[]) =>
  send({
    type: SERVICE_TYPES.MIGRATE_ACCOUNTS,
    balancesToMigrate,
    isMergeSelected: false,
    recommendedFee: "0.00001",
    password: PASSWORD,
  } as MigrateAccountsMessage);

/** A wallet on PHRASE_1 with two accounts, about to migrate to PHRASE_2. */
const seedWallet = async () => {
  await send({
    type: SERVICE_TYPES.CREATE_ACCOUNT,
    password: PASSWORD,
    isOverwritingAccount: false,
  } as CreateAccountMessage);
  await send({
    type: SERVICE_TYPES.ADD_ACCOUNT,
    password: PASSWORD,
  } as AddAccountMessage);
  mockSessionStore.dispatch(
    sessionSlice.actions.setMigratedMnemonicPhrase({
      migratedMnemonicPhrase: PHRASE_2.mnemonic,
    }),
  );
};

describe("migrateAccounts", () => {
  jest.setTimeout(60_000);

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    mockSubmitTx.mockReset();
    mockSubmitTx.mockResolvedValue({});
    jest.restoreAllMocks();
  });

  it("replaces the account by id in its keystore's slot, deriving at the new phrase's first free index", async () => {
    await seedWallet();
    const [firstKeyId, secondKeyId] = await keyIdList();
    const second = allAccounts()[1];
    const reversed = [...allAccounts()].reverse();
    mockSessionStore.dispatch(
      logIn.fulfilled(
        { publicKey: reversed[0].publicKey, allAccounts: reversed },
        "",
        {} as any,
      ),
    );

    const response = (await migrate([balanceFor(second)])) as {
      migratedAccounts: { isMigrated: boolean }[];
    };

    expect(response.migratedAccounts[0].isMigrated).toBe(true);
    const list = await keyIdList();
    expect(list).toHaveLength(2);
    expect(list[0]).toBe(firstKeyId);
    expect(list[1]).not.toBe(secondKeyId);
    const replaced = allAccounts().find(({ id }) => id === list[1]);
    // Phrase 2 is new, so its first account is index 0 whatever slot the
    // old account sat in.
    expect(replaced).toMatchObject({
      publicKey: NEW_ACCOUNTS[0].publicKey,
      sourceId: PHRASE_2.userId,
    });
    expect(
      allAccounts()
        .map(({ id }) => id)
        .sort(),
    ).toEqual([...list].sort());
    const untouched = allAccounts().find(({ id }) => id === firstKeyId);
    expect(untouched?.sourceId).toBe(PHRASE_1.userId);
    // The old phrase keeps its index: the migrated-off account was abandoned.
    expect(await indexMap()).toEqual({
      [PHRASE_1.userId]: [0, 1],
      [PHRASE_2.userId]: [0],
    });
    // #75: the replaced id's provenance goes with it; the new id is rooted
    // in the migrated phrase.
    expect(await provenance()).toEqual({
      [firstKeyId]: { type: AccountType.FREIGHTER, sourceId: PHRASE_1.userId },
      [list[1]]: { type: AccountType.FREIGHTER, sourceId: PHRASE_2.userId },
    });
  });

  it("gives each migrated account the next index on the new phrase", async () => {
    await seedWallet();
    const [first, second] = allAccounts();

    const response = (await migrate([
      balanceFor(first),
      balanceFor(second),
    ])) as { migratedAccounts: { newPublicKey: string }[] };

    expect(
      response.migratedAccounts.map(({ newPublicKey }) => newPublicKey),
    ).toEqual([NEW_ACCOUNTS[0].publicKey, NEW_ACCOUNTS[1].publicKey]);
    expect((await indexMap())[PHRASE_2.userId]).toEqual([0, 1]);
  });

  it("keeps a keystore id added while the replacement keystore is being stored", async () => {
    await seedWallet();
    const [firstKeyId, secondKeyId] = await keyIdList();
    const second = allAccounts()[1];
    const hwKeyId =
      "hw:GBXMNIDFHHJ4KRVYVKWOPLKD4VTBINTOUGFBNV6R2UW4PT2DMJZN3PKD";
    const storeKey = mockKeyManager.storeKey.bind(mockKeyManager);
    // A hardware import on another surface lands in keyIdList while Scrypt
    // is running for the replacement keystore.
    jest
      .spyOn(mockKeyManager, "storeKey")
      .mockImplementation(async (params) => {
        await mockDataStorage.setItem(KEY_ID_LIST, [
          ...(await keyIdList()),
          hwKeyId,
        ]);
        return storeKey(params);
      });

    await migrate([balanceFor(second)]);

    const list = await keyIdList();
    expect(list).toHaveLength(3);
    expect(list[0]).toBe(firstKeyId);
    expect(list[1]).not.toBe(secondKeyId);
    expect(list[2]).toBe(hwKeyId);
    expect(allAccounts().map(({ id }) => id)).toContain(list[1]);
  });

  it("rejects an unknown id before anything is submitted", async () => {
    await seedWallet();
    const [, second] = allAccounts();
    const before = await keyIdList();

    await expect(
      migrate([{ ...balanceFor(second), id: "0.000-not-a-keystore" }]),
    ).rejects.toThrow(/no keystore/i);

    expect(mockSubmitTx).not.toHaveBeenCalled();
    expect(await keyIdList()).toEqual(before);
  });

  it("activates an account that was migrated when the first one fails", async () => {
    await seedWallet();
    const [first, second] = allAccounts();
    mockSubmitTx
      .mockRejectedValueOnce(new Error("tx_failed"))
      .mockResolvedValue({});

    const response = (await migrate([
      balanceFor(first),
      balanceFor(second),
    ])) as { migratedAccounts: { isMigrated: boolean }[]; publicKey: string };

    expect(
      response.migratedAccounts.map(({ isMigrated }) => isMigrated),
    ).toEqual([false, true]);
    expect(response.publicKey).toBe(NEW_ACCOUNTS[1].publicKey);
    const list = await keyIdList();
    expect(await mockDataStorage.getItem(KEY_ID)).toBe(list[1]);
    expect(list[0]).toBe(first.id);
    // Index 0 was reserved for the failed account and never marked; the
    // second account did not re-derive it.
    expect((await indexMap())[PHRASE_2.userId]).toEqual([1]);
  });

  it("links the migrated phrase once an account has migrated", async () => {
    await seedWallet();
    mockLink.mockClear();

    await migrate([balanceFor(allAccounts()[0])]);

    expect(mockLink).toHaveBeenCalledTimes(1);
    expect(mockLink).toHaveBeenCalledWith({
      sessionStore: mockSessionStore,
      localStore: mockDataStorage,
    });
  });

  it("does not link when no account migrated", async () => {
    await seedWallet();
    mockLink.mockClear();
    mockSubmitTx.mockRejectedValue(new Error("tx_failed"));

    await migrate([balanceFor(allAccounts()[0])]);

    expect(mockLink).not.toHaveBeenCalled();
  });
});
