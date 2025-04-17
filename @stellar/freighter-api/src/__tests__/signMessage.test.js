import * as extensionMessaging from "@shared/api/helpers/extensionMessaging";
import * as ApiExternal from "@shared/api/external";
import { signMessage } from "../signMessage";

describe("signMessage", () => {
  it("returns a signed message", async () => {
    const TEST_BLOB = { signedBlob: "foo", signerAddress: "bar" };
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockImplementationOnce(() => TEST_BLOB);
    ApiExternal.requestAllowedStatus = jest.fn().mockImplementationOnce(() => ({
      isAllowed: true,
    }));
    const blob = await signMessage();
    expect(blob).toEqual({ signedMessage: "foo", signerAddress: "bar" });
  });

  it("returns a generic error", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockImplementationOnce(() => ({
        apiError: "error",
      }));
    ApiExternal.requestAllowedStatus = jest.fn().mockImplementationOnce(() => ({
      isAllowed: true,
    }));
    const msg = await signMessage();
    expect(msg).toEqual({
      signedMessage: null,
      signerAddress: "",
      error: "error",
    });
  });
});
