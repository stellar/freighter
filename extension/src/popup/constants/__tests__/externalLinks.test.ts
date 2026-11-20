import { NETWORKS } from "@shared/constants/stellar";
import { getBlendAppUrl } from "popup/constants/externalLinks";

describe("getBlendAppUrl", () => {
  it("opens Blend's app for the network the user is on", () => {
    expect(getBlendAppUrl(NETWORKS.PUBLIC)).toBe(
      "https://mainnet.blend.capital/",
    );
    expect(getBlendAppUrl(NETWORKS.TESTNET)).toBe(
      "https://testnet.blend.capital/",
    );
  });

  it("falls back to Blend's mainnet app on any other network", () => {
    expect(getBlendAppUrl(NETWORKS.FUTURENET)).toBe(
      "https://mainnet.blend.capital/",
    );
    expect(getBlendAppUrl("my custom network")).toBe(
      "https://mainnet.blend.capital/",
    );
  });
});
