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
});
