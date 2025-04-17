import * as extensionMessaging from "@shared/api/helpers/extensionMessaging";
import * as ApiExternal from "@shared/api/external";

import { signAuthEntry } from "../signAuthEntry";

describe("signAuthEntry", () => {
  it("returns a signed auth entry", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ signedAuthEntry: "foo", signerAddress: "baz" });
    ApiExternal.requestAllowedStatus = jest.fn().mockImplementationOnce(() => ({
      isAllowed: true,
    }));
    const authEntry = await signAuthEntry();
    expect(authEntry).toEqual({ signedAuthEntry: "foo", signerAddress: "baz" });
  });
  it("returns a generic error", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ apiError: "baz" });
    ApiExternal.requestAllowedStatus = jest.fn().mockImplementationOnce(() => ({
      isAllowed: true,
    }));
    const authEntry = await signAuthEntry();

    expect(authEntry).toEqual({
      signedAuthEntry: null,
      signerAddress: "",
      error: "baz",
    });
  });
});
