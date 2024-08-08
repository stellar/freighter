import * as extensionMessaging from "@shared/api/helpers/extensionMessaging";
import { getNetwork } from "../getNetwork";

describe("getNetwork", () => {
  it("returns a network", async () => {
    extensionMessaging.sendMessageToContentScript = jest.fn().mockReturnValue({
      networkDetails: { network: "foo", networkPassphrase: "baz" },
    });
    const network = await getNetwork();
    expect(network).toEqual({ network: "foo", networkPassphrase: "baz" });
  });
  it("returns an error", async () => {
    extensionMessaging.sendMessageToContentScript = jest
      .fn()
      .mockReturnValue({ apiError: "error" });
    const network = await getNetwork();

    expect(network).toEqual({
      network: "",
      networkPassphrase: "",
      error: "error",
    });
  });
});
