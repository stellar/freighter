import * as extensionMessaging from "@shared/api/helpers/extensionMessaging";
import { disconnect } from "../disconnect";

describe("disconnect", () => {
  it("returns an empty object on success", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({});
    const res = await disconnect();
    expect(res).toEqual({});
  });
  it("returns an error", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ apiError: "error" });
    const res = await disconnect();
    expect(res).toEqual({ error: "error" });
  });
  it("returns an internal error when the extension can't be reached", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ error: "Unable to send message to extension" });
    const res = await disconnect();
    expect(res).toEqual({
      error: extensionMessaging.FreighterApiInternalError,
    });
  });
});
