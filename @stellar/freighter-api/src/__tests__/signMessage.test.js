import * as extensionMessaging from "@shared/api/helpers/extensionMessaging";
import { signMessage } from "../signMessage";

describe("signMessage", () => {
  it("returns a signed message", async () => {
    const TEST_BLOB = { signedBlob: "foo", signerAddress: "bar" };
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockImplementationOnce(() => TEST_BLOB);
    const blob = await signMessage();
    expect(blob).toEqual({ signedMessage: "foo", signerAddress: "bar" });
  });

  it("returns a generic error", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockImplementationOnce(() => ({
        apiError: "error",
      }));
    const msg = await signMessage();
    expect(msg).toEqual({
      signedMessage: null,
      signerAddress: "",
      error: "error",
    });
  });
});
