import { Networks } from "stellar-sdk";

import { getAssetSacAddress, isSacContract } from "../token";

const USDC_CANONICAL =
  "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("getAssetSacAddress", () => {
  it("derives a C-prefixed strkey contract id for a classic credit_alphanum4 asset on PUBLIC", () => {
    expect(getAssetSacAddress(USDC_CANONICAL, Networks.PUBLIC)).toMatch(
      /^C[A-Z2-7]{55}$/,
    );
  });

  it("is deterministic for the same canonical and network", () => {
    expect(getAssetSacAddress(USDC_CANONICAL, Networks.PUBLIC)).toBe(
      getAssetSacAddress(USDC_CANONICAL, Networks.PUBLIC),
    );
  });

  it("produces different SAC addresses across networks (the network passphrase is part of the derivation)", () => {
    expect(getAssetSacAddress(USDC_CANONICAL, Networks.PUBLIC)).not.toBe(
      getAssetSacAddress(USDC_CANONICAL, Networks.TESTNET),
    );
  });
});

describe("isSacContract", () => {
  it("returns true when the contract id matches the SAC derived from the canonical name", () => {
    const sac = getAssetSacAddress(USDC_CANONICAL, Networks.PUBLIC);
    expect(isSacContract(USDC_CANONICAL, sac, Networks.PUBLIC)).toBe(true);
  });

  it("returns false when the contract id is not the SAC for the given canonical name", () => {
    const otherSac = getAssetSacAddress(
      "OTHER:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      Networks.PUBLIC,
    );
    expect(isSacContract(USDC_CANONICAL, otherSac, Networks.PUBLIC)).toBe(
      false,
    );
  });

  it("returns false when the name has no issuer component (e.g. a raw contract id)", () => {
    const sac = getAssetSacAddress(USDC_CANONICAL, Networks.PUBLIC);
    expect(isSacContract(sac, sac, Networks.PUBLIC)).toBe(false);
  });
});
