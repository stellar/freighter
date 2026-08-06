import { NETWORK_NAMES } from "@shared/constants/stellar";

import { getNetworkDisplayName } from "../getNetworkDisplayName";

const DISPLAY_NAMES = {
  mainnet: "translated-mainnet",
  testnet: "translated-testnet",
  futurenet: "translated-futurenet",
};

describe("getNetworkDisplayName", () => {
  it.each([
    [NETWORK_NAMES.PUBNET, DISPLAY_NAMES.mainnet],
    [NETWORK_NAMES.TESTNET, DISPLAY_NAMES.testnet],
    [NETWORK_NAMES.FUTURENET, DISPLAY_NAMES.futurenet],
  ])("maps %s to its display name", (networkName, expected) => {
    expect(getNetworkDisplayName(networkName, DISPLAY_NAMES)).toBe(expected);
  });

  it("preserves custom network names", () => {
    expect(getNetworkDisplayName("My Network", DISPLAY_NAMES)).toBe(
      "My Network",
    );
  });
});
