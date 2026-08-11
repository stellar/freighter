import {
  FUTURENET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
  NetworkDetails,
  NETWORKS,
} from "@shared/constants/stellar";
import { CUSTOM_NETWORK } from "@shared/helpers/stellar";

import {
  getStellarExpertUrl,
  isStellarExpertSupported,
} from "popup/helpers/account";

const CUSTOM_NETWORK_DETAILS = {
  network: CUSTOM_NETWORK,
  networkName: "Custom Network",
  networkUrl: "http://localhost:8000",
  networkPassphrase: "Standalone Network ; February 2017",
} as unknown as NetworkDetails;

describe("isStellarExpertSupported", () => {
  it("allows the networks stellar.expert actually serves", () => {
    expect(isStellarExpertSupported(MAINNET_NETWORK_DETAILS)).toBe(true);
    expect(isStellarExpertSupported(TESTNET_NETWORK_DETAILS)).toBe(true);
  });

  // Experimental mode switches the active network to Futurenet, which
  // stellar.expert has no explorer for. Gating on "not a custom network"
  // used to let Futurenet through.
  it("excludes Futurenet", () => {
    expect(isStellarExpertSupported(FUTURENET_NETWORK_DETAILS)).toBe(false);
    expect(FUTURENET_NETWORK_DETAILS.network).toBe(NETWORKS.FUTURENET);
  });

  it("excludes custom networks", () => {
    expect(isStellarExpertSupported(CUSTOM_NETWORK_DETAILS)).toBe(false);
  });
});

describe("getStellarExpertUrl", () => {
  it("maps the supported networks to their explorer paths", () => {
    expect(getStellarExpertUrl(MAINNET_NETWORK_DETAILS)).toBe(
      "https://stellar.expert/explorer/public",
    );
    expect(getStellarExpertUrl(TESTNET_NETWORK_DETAILS)).toBe(
      "https://stellar.expert/explorer/testnet",
    );
  });

  // Documents why callers must gate rather than relying on this helper: it
  // silently falls back to the mainnet explorer, so an ungated Futurenet link
  // would show a mainnet lookup for a Futurenet account.
  it("falls back to the mainnet path for unsupported networks", () => {
    expect(getStellarExpertUrl(FUTURENET_NETWORK_DETAILS)).toBe(
      "https://stellar.expert/explorer/public",
    );
  });
});
