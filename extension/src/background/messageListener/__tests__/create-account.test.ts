import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "../popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import { CreateAccountMessage } from "@shared/api/types/message-request";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "../helpers/test-helpers";
import {
  KEY_ID,
  KEY_ID_LIST,
  APPLICATION_ID,
  TEMPORARY_STORE_ID,
} from "constants/localStorageTypes";
import { createAccount } from "../handlers/create-account";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

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
      testAlarm,
    )) as Awaited<ReturnType<typeof createAccount>>;

    const { session } = mockSessionStore.getState();
    const keyIdList = await mockDataStorage.getItem(KEY_ID_LIST);
    const keyId = await mockDataStorage.getItem(KEY_ID);
    const applicationState = await mockDataStorage.getItem(APPLICATION_ID);
    const tempStoreId = await mockDataStorage.getItem(TEMPORARY_STORE_ID);

    expect(response.hasPrivateKey).toBeTruthy();
    expect(session.hashKey?.iv).not.toBeUndefined();
    expect(keyIdList.length).toBe(1);
    expect(keyId).toBeDefined();
    expect(applicationState).toBe(APPLICATION_STATE.PASSWORD_CREATED);
    expect(tempStoreId[keyId]).toBeDefined();
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
      testAlarm,
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
      testAlarm,
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
      testAlarm,
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
      testAlarm,
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
