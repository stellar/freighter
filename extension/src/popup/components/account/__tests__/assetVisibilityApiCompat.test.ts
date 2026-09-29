import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { changeAssetVisibility } from "@shared/api/internal";

jest.mock("@shared/api/helpers/extensionMessaging", () => ({
  sendMessageToBackground: jest.fn(),
}));

const mockSend = sendMessageToBackground as jest.Mock;

const USDC = "USDC:GA5ZSE";

describe("changeAssetVisibility stays readable by an older background", () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({ error: "", hiddenAssets: {} });
  });

  // A service worker predating the rename reads `assetVisibility.issuer`.
  // Sending only `assetKey` makes it write the visibility under `undefined`
  // and return success, so Hide/Unhide silently does nothing -- the worst
  // shape of failure, because the UI reports that it worked.
  it("sends the legacy issuer field alongside assetKey", async () => {
    await changeAssetVisibility({
      assetKey: USDC,
      assetVisibility: "hidden",
      activePublicKey: "GAAAA",
    });

    const [message] = mockSend.mock.calls[0];
    expect(message.assetVisibility).toEqual({
      assetKey: USDC,
      issuer: USDC,
      visibility: "hidden",
    });
  });

  // The two fields are the same canonical `{code}:{issuer}` string, so an old
  // worker keyed by `issuer` and a new one keyed by `assetKey` land on the
  // same entry. If they ever diverge this test is the thing that notices.
  it("carries the identical value in both fields", async () => {
    await changeAssetVisibility({
      assetKey: USDC,
      assetVisibility: "visible",
      activePublicKey: "GAAAA",
    });

    const [message] = mockSend.mock.calls[0];
    expect(message.assetVisibility.issuer).toBe(
      message.assetVisibility.assetKey,
    );
  });
});
