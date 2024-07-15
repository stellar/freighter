import * as extensionMessaging from "@shared/api/helpers/extensionMessaging";
import { getAddress } from "../getAddress";

describe("getPublicKey", () => {
  it("returns a publicKey", async () => {
    const TEST_KEY = "100";
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ publicKey: TEST_KEY });

    const publicKey = await getAddress();
    expect(publicKey).toEqual({ address: TEST_KEY });
  });
  it("returns an error", async () => {
    const TEST_ERROR = "Error!";
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ apiError: TEST_ERROR });
    const publicKey = await getAddress();
    expect(publicKey).toEqual({ address: "", error: TEST_ERROR });
  });
});
