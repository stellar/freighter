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
  SignOutMessage,
  UpdateAccountNameMessage,
} from "@shared/api/types/message-request";
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
import { getAccountNameList } from "background/helpers/account";
import { KEY_ID, KEY_ID_LIST } from "constants/localStorageTypes";

// Acceptance for #73: every account carries its keystore id and its source id;
// switching, renaming and unlocking resolve by id, so the order of
// `allAccounts` changes nothing; an unknown public key is an error, never a
// silent fall back to the first account.

const [PHRASE_1] = AUTH_KEYPAIR_VECTORS;
// A key no held phrase derives.
const STANDALONE_SECRET =
  "SDHOAMBNLGCE2MV5ZKIVZAQD3VCLGP53P3OBSBI6UN5L5XZI5TKHFQL4";
const HW_PUBLIC_KEY =
  "GBXMNIDFHHJ4KRVYVKWOPLKD4VTBINTOUGFBNV6R2UW4PT2DMJZN3PKD";
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

const switchTo = (publicKey: string) =>
  send({
    type: SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE,
    publicKey,
  } as MakeAccountActiveMessage);

const rename = (publicKey: string, accountName: string) =>
  send({
    type: SERVICE_TYPES.UPDATE_ACCOUNT_NAME,
    publicKey,
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
      await switchTo(account.publicKey);
      expect(await activeKeyId()).toBe(account.id);
    }
  });

  it("renames the right keystore whatever the list order", async () => {
    await seedFourAccounts();
    const [, second] = reverseAllAccounts();
    const before = await accountNames();

    await rename(second.publicKey, "Renamed");

    expect(await accountNames()).toEqual({ ...before, [second.id]: "Renamed" });
    const renamed = allAccounts().find(({ id }) => id === second.id);
    expect(renamed?.name).toBe("Renamed");
  });

  it("rejects a switch to an unknown public key and changes nothing", async () => {
    await createWallet();
    await addAccount();
    const keyId = await activeKeyId();
    const publicKey = mockSessionStore.getState().session.publicKey;

    await expect(switchTo(Keypair.random().publicKey())).rejects.toThrow();

    expect(await activeKeyId()).toBe(keyId);
    expect(mockSessionStore.getState().session.publicKey).toBe(publicKey);
  });

  it("rejects a rename of an unknown public key and changes nothing", async () => {
    await createWallet();
    await addAccount();
    const names = await accountNames();
    const accounts = allAccounts();

    await expect(
      rename(Keypair.random().publicKey(), "Renamed"),
    ).rejects.toThrow();

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
