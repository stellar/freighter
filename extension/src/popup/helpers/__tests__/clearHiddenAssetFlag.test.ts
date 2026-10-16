import * as ApiInternal from "@shared/api/internal";
import { clearHiddenAssetFlag } from "popup/helpers/useHiddenAssets";

const CANONICAL =
  "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const PUBLIC_KEY = "G1";

describe("clearHiddenAssetFlag", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("unhides an asset that is hidden", async () => {
    jest.spyOn(ApiInternal, "getHiddenAssets").mockResolvedValue({
      hiddenAssets: { [CANONICAL]: "hidden" },
      error: "",
    });
    const change = jest
      .spyOn(ApiInternal, "changeAssetVisibility")
      .mockResolvedValue({ hiddenAssets: {}, error: "" });

    await clearHiddenAssetFlag({
      canonicalAsset: CANONICAL,
      activePublicKey: PUBLIC_KEY,
    });

    expect(change).toHaveBeenCalledWith({
      assetIssuer: CANONICAL,
      assetVisibility: "visible",
      activePublicKey: PUBLIC_KEY,
    });
  });

  it("writes nothing when the asset is not hidden", async () => {
    jest
      .spyOn(ApiInternal, "getHiddenAssets")
      .mockResolvedValue({
        hiddenAssets: { [CANONICAL]: "visible" },
        error: "",
      });
    const change = jest
      .spyOn(ApiInternal, "changeAssetVisibility")
      .mockResolvedValue({ hiddenAssets: {}, error: "" });

    await clearHiddenAssetFlag({
      canonicalAsset: CANONICAL,
      activePublicKey: PUBLIC_KEY,
    });

    expect(change).not.toHaveBeenCalled();
  });

  it("never throws when the background reports an error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest
      .spyOn(ApiInternal, "getHiddenAssets")
      .mockResolvedValue({ hiddenAssets: {}, error: "boom" });

    await expect(
      clearHiddenAssetFlag({
        canonicalAsset: CANONICAL,
        activePublicKey: PUBLIC_KEY,
      }),
    ).resolves.toBeUndefined();
  });
});
