import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import { CreateAccountMessage } from "@shared/api/types/message-request";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import {
  KEY_ID,
  KEY_ID_LIST,
  APPLICATION_ID,
  TEMPORARY_STORE_ID,
} from "constants/localStorageTypes";
import { createAccount } from "background/messageListener/handlers/createAccount";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { AUTH_KEYPAIR_VECTORS } from "@shared/api/helpers/authKeypairVectors";
import { SecretSourceType } from "@shared/api/types";
import { getMnemonics } from "background/helpers/session";
import {
  getPinnedSourceId,
  getSecretSources,
  setPinnedSourceId,
} from "background/helpers/secret-sources";

// A real BIP39 phrase: the handler derives the phrase's source id from it.
const VECTOR = AUTH_KEYPAIR_VECTORS[0];

jest.mock("stellar-hd-wallet", () => {
  return {
    generateMnemonic: () =>
      jest.requireActual("@shared/api/helpers/authKeypairVectors")
        .AUTH_KEYPAIR_VECTORS[0].mnemonic,
    fromMnemonic: () => {
      return {
        getPublicKey: (_: number) => "pubKey",
        getSecret: (_: number) => "secret",
      };
    },
  };
});

const testAlarm = new MockBrowserAlarm(() => console.log("Alarm fired"));
describe("Create account message listener", () => {
  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
  });
  it("creates a new account", async () => {
    const request = {
      type: SERVICE_TYPES.CREATE_ACCOUNT,
      password: "test",
      isOverwritingAccount: false,
    } as CreateAccountMessage;
    const response = (await popupMessageListener(
      request,
      mockSessionStore,
      mockDataStorage,
      mockKeyManager,
      testAlarm as any,
      { id: "fake-extension-id" },
    )) as Awaited<ReturnType<typeof createAccount>>;

    const { session } = mockSessionStore.getState();
    const keyIdList = await mockDataStorage.getItem(KEY_ID_LIST);
    const keyId = await mockDataStorage.getItem(KEY_ID);
    const applicationState = await mockDataStorage.getItem(APPLICATION_ID);
    const tempStoreId = await mockDataStorage.getItem(TEMPORARY_STORE_ID);

    expect(response.hasPrivateKey).toBeTruthy();
    expect(session.hashKey?.key).toBeTruthy();
    expect(keyIdList.length).toBe(1);
    expect(keyId).toBeDefined();
    expect(applicationState).toBe(APPLICATION_STATE.PASSWORD_CREATED);
    expect(tempStoreId[keyId]).toBeDefined();
  });
  it("registers the new phrase as Seed Phrase 1 and holds its mnemonic", async () => {
    await popupMessageListener(
      {
        type: SERVICE_TYPES.CREATE_ACCOUNT,
        password: "test",
        isOverwritingAccount: false,
      } as CreateAccountMessage,
      mockSessionStore,
      mockDataStorage,
      mockKeyManager,
      testAlarm as any,
      { id: "fake-extension-id" },
    );

    expect(await getSecretSources({ localStore: mockDataStorage })).toEqual({
      [VECTOR.userId]: {
        id: VECTOR.userId,
        type: SecretSourceType.PHRASE,
        label: "Seed Phrase 1",
        createdAt: expect.any(Number),
      },
    });
    expect(
      await getMnemonics({
        sessionStore: mockSessionStore,
        localStore: mockDataStorage,
      }),
    ).toEqual({ [VECTOR.userId]: VECTOR.mnemonic });
  });
  it("resets the source set and re-pins the new phrase when overwriting", async () => {
    await popupMessageListener(
      {
        type: SERVICE_TYPES.CREATE_ACCOUNT,
        password: "test",
        isOverwritingAccount: false,
      } as CreateAccountMessage,
      mockSessionStore,
      mockDataStorage,
      mockKeyManager,
      testAlarm as any,
      { id: "fake-extension-id" },
    );
    // A pin the old wallet held that the new phrase does not derive.
    await setPinnedSourceId({
      localStore: mockDataStorage,
      sourceId: "f".repeat(64),
    });

    await popupMessageListener(
      {
        type: SERVICE_TYPES.CREATE_ACCOUNT,
        password: "test",
        isOverwritingAccount: true,
      } as CreateAccountMessage,
      mockSessionStore,
      mockDataStorage,
      mockKeyManager,
      testAlarm as any,
      { id: "fake-extension-id" },
    );

    const sources = await getSecretSources({ localStore: mockDataStorage });
    expect(Object.values(sources).map((s) => s.label)).toEqual([
      "Seed Phrase 1",
    ]);
    expect(await getPinnedSourceId({ localStore: mockDataStorage })).toBe(
      VECTOR.userId,
    );
  });
  it("can overwrite account", async () => {
    const response = (await popupMessageListener(
      {
        type: SERVICE_TYPES.CREATE_ACCOUNT,
        password: "test",
        isOverwritingAccount: false,
      } as CreateAccountMessage,
      mockSessionStore,
      mockDataStorage,
      mockKeyManager,
      testAlarm as any,
      { id: "fake-extension-id" },
    )) as Awaited<ReturnType<typeof createAccount>>;
    const keyId = await mockDataStorage.getItem(KEY_ID);

    const secondResponse = (await popupMessageListener(
      {
        type: SERVICE_TYPES.CREATE_ACCOUNT,
        password: "test",
        isOverwritingAccount: true,
      } as CreateAccountMessage,
      mockSessionStore,
      mockDataStorage,
      mockKeyManager,
      testAlarm as any,
      { id: "fake-extension-id" },
    )) as Awaited<ReturnType<typeof createAccount>>;
    const secondKeyId = await mockDataStorage.getItem(KEY_ID);
    const keyIdList = await mockDataStorage.getItem(KEY_ID_LIST);

    expect(response.hasPrivateKey).toBeTruthy();
    expect(secondResponse.hasPrivateKey).toBeTruthy();
    expect(secondKeyId).not.toEqual(keyId);
    expect(keyIdList.length).toEqual(1);
    expect(keyIdList).not.toContain(keyId);
  });

  it("should add a new account", async () => {
    const response = (await popupMessageListener(
      {
        type: SERVICE_TYPES.CREATE_ACCOUNT,
        password: "test",
        isOverwritingAccount: false,
      } as CreateAccountMessage,
      mockSessionStore,
      mockDataStorage,
      mockKeyManager,
      testAlarm as any,
      { id: "fake-extension-id" },
    )) as Awaited<ReturnType<typeof createAccount>>;
    const keyId = await mockDataStorage.getItem(KEY_ID);

    const secondResponse = (await popupMessageListener(
      {
        type: SERVICE_TYPES.CREATE_ACCOUNT,
        password: "test",
        isOverwritingAccount: false,
      } as CreateAccountMessage,
      mockSessionStore,
      mockDataStorage,
      mockKeyManager,
      testAlarm as any,
      { id: "fake-extension-id" },
    )) as Awaited<ReturnType<typeof createAccount>>;
    const secondKeyId = await mockDataStorage.getItem(KEY_ID);
    const keyIdList = await mockDataStorage.getItem(KEY_ID_LIST);

    expect(response.hasPrivateKey).toBeTruthy();
    expect(secondResponse.hasPrivateKey).toBeTruthy();
    expect(secondKeyId).not.toEqual(keyId);
    expect(keyIdList.length).toEqual(2);
    expect(keyIdList).toContain(keyId);
    expect(keyIdList).toContain(secondKeyId);
  });
});
