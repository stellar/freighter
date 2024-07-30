import * as extensionMessaging from "@shared/api/helpers/extensionMessaging";

import { signAuthEntry } from "../signAuthEntry";

describe("signAuthEntry", () => {
  it("returns a signed auth entry", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ signedAuthEntry: "foo", signerAddress: "baz" });
    const authEntry = await signAuthEntry();
    expect(authEntry).toEqual({ signedAuthEntry: "foo", signerAddress: "baz" });
  });
  it("returns a generic error", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ apiError: "baz" });
    const authEntry = await signAuthEntry();

    expect(authEntry).toEqual({
      signedAuthEntry: null,
      signerAddress: "",
      error: "baz",
    });
  });
});
