import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "../popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import { CreateAccountMessage } from "@shared/api/types/message-request";
import {
  mockStorageApi,
  sessionStore,
  dataStorage,
  keyManager,
} from "./helpers";

describe("Create account message listener", () => {
  beforeAll(async () => {
    await mockStorageApi.clear();
    sessionStore.dispatch(sessionSlice.actions.reset());
  });
  it("creates a new account", async () => {
    const request = {
      type: SERVICE_TYPES.CREATE_ACCOUNT,
      password: "test",
      isOverwritingAccount: false,
    } as CreateAccountMessage;
    const response = await popupMessageListener(
      request,
      sessionStore,
      dataStorage,
      keyManager,
    );
    // console.log(response);
  });
});
