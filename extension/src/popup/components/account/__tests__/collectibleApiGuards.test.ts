import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { addCollectible, removeCollectible } from "@shared/api/internal";

jest.mock("@shared/api/helpers/extensionMessaging", () => ({
  sendMessageToBackground: jest.fn(),
}));

const mockSend = sendMessageToBackground as jest.Mock;

const args = {
  publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
  network: "PUBLIC",
  collectibleContractAddress: "CAS3J7GY",
  collectibleTokenId: "1",
};

describe("collectible writers survive a background that does not answer", () => {
  beforeEach(() => mockSend.mockReset());

  // `browser.runtime.sendMessage` resolves to `null` when no listener handles
  // the type -- which is what a service worker predating the message does.
  // Before this guard the null replaced the default object and every caller
  // crashed on `response.error`.
  it.each([
    ["removeCollectible", removeCollectible],
    ["addCollectible", addCollectible],
  ])("%s reports an error instead of throwing", async (_label, fn) => {
    mockSend.mockResolvedValue(null);

    const res = await fn(args);

    // The specific message, not just any error: reading `response.error` off
    // null would also throw into the catch-all below, which reports something
    // generic. Only the explicit null check tells the user the actionable
    // thing, which is that the extension needs reloading.
    expect(res.error).toBe(
      "Freighter needs to be reloaded to complete this action",
    );
    expect(res.collectiblesList).toEqual([]);
  });

  it.each([
    ["removeCollectible", removeCollectible],
    ["addCollectible", addCollectible],
  ])("%s never reads a missing response as success", async (_label, fn) => {
    mockSend.mockResolvedValue(null);

    // The dangerous failure is the silent one: a caller that sees no error
    // would report success and update the UI for a write that never happened.
    expect((await fn(args)).error).not.toBe("");
  });

  it.each([
    ["removeCollectible", removeCollectible],
    ["addCollectible", addCollectible],
  ])("%s passes a real response straight through", async (_label, fn) => {
    mockSend.mockResolvedValue({
      error: "",
      collectiblesList: [{ id: "CAS3J7GY", tokenIds: ["2"] }],
    });

    expect(await fn(args)).toEqual({
      error: "",
      collectiblesList: [{ id: "CAS3J7GY", tokenIds: ["2"] }],
    });
  });

  it.each([
    ["removeCollectible", removeCollectible],
    ["addCollectible", addCollectible],
  ])("%s surfaces a handler error", async (_label, fn) => {
    mockSend.mockResolvedValue({ error: "Collectible not found" });

    expect((await fn(args)).error).toBe("Collectible not found");
  });
});
