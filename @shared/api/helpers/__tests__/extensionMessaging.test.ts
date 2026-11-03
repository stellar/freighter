import { EXTERNAL_SERVICE_TYPES } from "../../../constants/services";
import {
  FreighterApiInternalError,
  sendMessageToContentScript,
} from "../extensionMessaging";

describe("sendMessageToContentScript", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resolves DISCONNECT with an error when the extension never responds", async () => {
    const response = sendMessageToContentScript({
      type: EXTERNAL_SERVICE_TYPES.DISCONNECT,
    });

    jest.advanceTimersByTime(2000);

    await expect(response).resolves.toEqual({
      apiError: FreighterApiInternalError,
    });
  });
});
