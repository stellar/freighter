import { Keypair } from "stellar-sdk";

import { logIn, sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import { WalletType } from "@shared/constants/hardwareWallet";
import {
  AddAccountMessage,
  ConfirmPasswordMessage,
  CreateAccountMessage,
  ImportAccountMessage,
  ImportHardWareWalletMessage,
  MakeAccountActiveMessage,
  AccountRef,
  SignOutMessage,
  UpdateAccountNameMessage,
} from "@shared/api/types/message-request";
import { ACCOUNT_ALREADY_EXISTS_ERROR } from "@shared/constants/errors";
import { AUTH_KEYPAIR_VECTORS } from "@shared/api/helpers/authKeypairVectors";
import { deriveSourceIdentity } from "@shared/api/helpers/deriveAuthKeypair";
import { Account } from "@shared/api/types";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import {
  getAccountNameList,
  getIsHardwareWalletActive,
  HW_PREFIX,
} from "background/helpers/account";
import { storeHardwareWalletAccount } from "background/messageListener/helpers/store-hardware-wallet";
import { KEY_ID, KEY_ID_LIST } from "constants/localStorageTypes";

// Acceptance: every account carries its keystore id and its source id;
// switching, renaming and unlocking resolve by id, so the order of
// `allAccounts` changes nothing; an unknown id or public key is an error,
// never a silent fall back to the first account. Two accounts never share an
// address through an import, and where they already do, the id still picks
// the right one.

const [PHRASE_1] = AUTH_KEYPAIR_VECTORS;
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
  } as ImportAccountMessage);

const importLedger = () =>
  send({
    type: SERVICE_TYPES.IMPORT_HARDWARE_WALLET,
    publicKey: HW_PUBLIC_KEY,
    hardwareWalletType: WalletType.LEDGER,
    bipPath: "44'/148'/0'",
  } as ImportHardWareWalletMessage);

const importLedgerAt = (publicKey: string) =>
  send({
    type: SERVICE_TYPES.IMPORT_HARDWARE_WALLET,
    publicKey,
    hardwareWalletType: WalletType.LEDGER,
    bipPath: "44'/148'/0'",
  } as ImportHardWareWalletMessage);

const switchTo = (account: AccountRef) =>
  send({
    type: SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE,
    ...account,
  } as MakeAccountActiveMessage);

const rename = (id: string, accountName: string) =>
  send({
    type: SERVICE_TYPES.UPDATE_ACCOUNT_NAME,
    id,
    accountName,
  } as UpdateAccountNameMessage);

const signOut = () => send({ type: SERVICE_TYPES.SIGN_OUT } as SignOutMessage);

const unlock = () =>
  send({
    type: SERVICE_TYPES.CONFIRM_PASSWORD,
    password: PASSWORD,
  } as ConfirmPasswordMessage);

const allAccounts = (): Account[] =>
  mockSessionStore.getState().session.allAccounts ?? [];

const keyIdList = (): Promise<string[]> => mockDataStorage.getItem(KEY_ID_LIST);

const activeKeyId = (): Promise<string> => mockDataStorage.getItem(KEY_ID);

const accountNames = () => getAccountNameList({ localStore: mockDataStorage });

/** Puts `allAccounts` into the session store in reverse, as a grouped switcher might. */
const reverseAllAccounts = () => {
  const reversed = [...allAccounts()].reverse();
  mockSessionStore.dispatch(
    logIn.fulfilled(
      { publicKey: reversed[0].publicKey, allAccounts: reversed },
      "",
      {} as any,
    ),
  );
  return reversed;
};

const standaloneSourceId = async () =>
  (
    await deriveSourceIdentity(
      Keypair.fromSecret(STANDALONE_SECRET).rawSecretKey(),
    )
  ).sourceId;

const seedFourAccounts = async () => {
  await createWallet();
  await addAccount();
  await importKey();
  await importLedger();
};

describe("stable account id", () => {
  jest.setTimeout(60_000);

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    jest.restoreAllMocks();
  });

  it("gives every account its keystore id and its source id", async () => {
    await seedFourAccounts();

    const accounts = allAccounts();
    expect(accounts.map(({ id }) => id)).toEqual(await keyIdList());
    expect(accounts.map(({ sourceId }) => sourceId)).toEqual([
      PHRASE_1.userId,
      PHRASE_1.userId,
      await standaloneSourceId(),
      undefined,
    ]);
    expect(accounts[3].id).toBe(`hw:${HW_PUBLIC_KEY}`);
  });

  it("rebuilds the same ids and source ids on unlock", async () => {
    await seedFourAccounts();
    const identities = () =>
      allAccounts().map(({ id, sourceId }) => ({ id, sourceId }));
    const before = identities();

    await signOut();
    expect(allAccounts()).toEqual([]);
    await unlock();

    expect(identities()).toEqual(before);
  });

  it("switches to the right keystore whatever the list order", async () => {
    await seedFourAccounts();
    const reversed = reverseAllAccounts();

    for (const account of reversed) {
      await switchTo({ id: account.id });
      expect(await activeKeyId()).toBe(account.id);
    }
  });

  it("switches by public key when that is all the caller has", async () => {
    await seedFourAccounts();
    const reversed = reverseAllAccounts();

    for (const account of reversed) {
      await switchTo({ publicKey: account.publicKey });
      expect(await activeKeyId()).toBe(account.id);
    }
  });

  it("renames the right keystore whatever the list order", async () => {
    await seedFourAccounts();
    const [, second] = reverseAllAccounts();
    const before = await accountNames();

    await rename(second.id, "Renamed");

    expect(await accountNames()).toEqual({ ...before, [second.id]: "Renamed" });
    const renamed = allAccounts().find(({ id }) => id === second.id);
    expect(renamed?.name).toBe("Renamed");
  });

  it("rejects a switch to an unknown public key and changes nothing", async () => {
    await createWallet();
    await addAccount();
    const keyId = await activeKeyId();
    const publicKey = mockSessionStore.getState().session.publicKey;

    await expect(
      switchTo({ publicKey: Keypair.random().publicKey() }),
    ).rejects.toThrow();
    await expect(switchTo({ id: "no-such-keystore" })).rejects.toThrow();

    expect(await activeKeyId()).toBe(keyId);
    expect(mockSessionStore.getState().session.publicKey).toBe(publicKey);
  });

  it("rejects a rename of an unknown id and changes nothing", async () => {
    await createWallet();
    await addAccount();
    const names = await accountNames();
    const accounts = allAccounts();

    await expect(rename("no-such-keystore", "Renamed")).rejects.toThrow();

    expect(await accountNames()).toEqual(names);
    expect(allAccounts()).toEqual(accounts);
  });

  it("keeps every other account's id when one keystore fails to open", async () => {
    await createWallet();
    await addAccount();
    await importKey();
    const [first, broken, third] = await keyIdList();
    await signOut();
    const loadKey = mockKeyManager.loadKey.bind(mockKeyManager);
    let failed = false;
    jest
      .spyOn(mockKeyManager, "loadKey")
      .mockImplementation(async (id: string, password: string) => {
        if (id === broken && !failed) {
          failed = true;
          throw new Error("corrupt keystore");
        }
        return loadKey(id, password);
      });

    await unlock();

    expect(allAccounts().map(({ id }) => id)).toEqual([first, third]);
  });

  it("refuses a Ledger whose address the wallet already holds", async () => {
    await createWallet();
    const [hot] = allAccounts();
    const ids = await keyIdList();
    const keyId = await activeKeyId();

    const response = (await importLedgerAt(hot.publicKey)) as {
      error?: string;
    };

    expect(response.error).toBe(ACCOUNT_ALREADY_EXISTS_ERROR);
    expect(await keyIdList()).toEqual(ids);
    expect(await activeKeyId()).toBe(keyId);
    expect(allAccounts()).toHaveLength(1);
  });

  it("still lets the same Ledger reconnect", async () => {
    await createWallet();
    await importLedger();
    await switchTo({ id: allAccounts()[0].id });

    const response = (await importLedger()) as { error?: string };

    expect(response.error).toBeUndefined();
    expect(await activeKeyId()).toBe(`${HW_PREFIX}${HW_PUBLIC_KEY}`);
    expect(allAccounts()).toHaveLength(2);
  });

  it("refuses a secret key whose address the wallet already holds", async () => {
    await createWallet();
    await importKey();
    const ids = await keyIdList();

    const response = (await importKey()) as { error?: string };

    expect(response.error).toBe(ACCOUNT_ALREADY_EXISTS_ERROR);
    expect(await keyIdList()).toEqual(ids);
  });

  it("refuses a secret key a connected Ledger already holds", async () => {
    await createWallet();
    await importLedgerAt(Keypair.fromSecret(STANDALONE_SECRET).publicKey());
    const ids = await keyIdList();

    const response = (await importKey()) as { error?: string };

    expect(response.error).toBe(ACCOUNT_ALREADY_EXISTS_ERROR);
    expect(await keyIdList()).toEqual(ids);
  });

  describe("a hot account and a Ledger that already share an address", () => {
    // The import guard stops this from happening now, but a wallet written by
    // an older build can still hold it. Store the Ledger directly, past the
    // handler's guard.
    const seedSharedAddress = async () => {
      await createWallet();
      const [hot] = allAccounts();
      await storeHardwareWalletAccount({
        publicKey: hot.publicKey,
        hardwareWalletType: WalletType.LEDGER,
        bipPath: "44'/148'/0'",
        sessionStore: mockSessionStore,
        localStore: mockDataStorage,
      });
      const ledger = allAccounts().find(({ id }) => id.startsWith(HW_PREFIX))!;
      expect(ledger.publicKey).toBe(hot.publicKey);
      return { hot, ledger };
    };

    it("switches to the Ledger by id, so signing goes to the device", async () => {
      const { hot, ledger } = await seedSharedAddress();
      await switchTo({ id: hot.id });

      const response = (await switchTo({ id: ledger.id })) as {
        activeAccountId: string;
      };

      expect(await activeKeyId()).toBe(ledger.id);
      expect(response.activeAccountId).toBe(ledger.id);
      expect(
        await getIsHardwareWalletActive({ localStore: mockDataStorage }),
      ).toBe(true);
    });

    it("switches to the hot account by id", async () => {
      const { hot, ledger } = await seedSharedAddress();
      await switchTo({ id: ledger.id });

      await switchTo({ id: hot.id });

      expect(await activeKeyId()).toBe(hot.id);
      expect(
        await getIsHardwareWalletActive({ localStore: mockDataStorage }),
      ).toBe(false);
    });

    it("renames only the row it names", async () => {
      const { hot, ledger } = await seedSharedAddress();
      const before = await accountNames();

      await rename(ledger.id, "My Ledger");

      expect(await accountNames()).toEqual({
        ...before,
        [ledger.id]: "My Ledger",
      });
      expect(allAccounts().find(({ id }) => id === hot.id)?.name).toBe(
        before[hot.id],
      );
    });
  });

  it("leaves no account behind when the keystore cannot be stored", async () => {
    await createWallet();
    const accounts = allAccounts();
    jest
      .spyOn(mockKeyManager, "storeKey")
      .mockRejectedValueOnce(new Error("storage full"));

    const response = (await addAccount()) as { error?: string };

    expect(response.error).toBeDefined();
    expect(allAccounts()).toEqual(accounts);
  });
});
