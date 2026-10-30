import { getIsRemovable } from "popup/helpers/balance";

const CONTRACT = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

describe("getIsRemovable", () => {
  it("allows removing a classic asset, which is just a trustline to close", () => {
    expect(getIsRemovable({ contract: "", isSac: false })).toBe(true);
  });

  it.each([
    ["native", { isNative: true }],
    ["a liquidity pool share", { isLiquidityPool: true }],
  ])("never offers removal for %s", (_label, flags) => {
    // Both would build a changeTrust that cannot succeed: XLM has no
    // trustline, and LP shares are not removable this way.
    expect(getIsRemovable({ contract: "", isSac: false, ...flags })).toBe(
      false,
    );
  });

  it("never offers removal for a SAC", () => {
    expect(getIsRemovable({ contract: CONTRACT, isSac: true })).toBe(false);
  });

  // The rule that decides whether Remove appears at all for contract-backed
  // tokens: only ones this wallet added locally can be removed, because
  // removal just drops them from the local list. A token the backend returns
  // on its own would come straight back.
  it("offers removal for a contract token only when it was added locally", () => {
    expect(
      getIsRemovable({
        contract: CONTRACT,
        isSac: false,
        localOnlyTokenIds: [CONTRACT],
      }),
    ).toBe(true);

    expect(
      getIsRemovable({
        contract: CONTRACT,
        isSac: false,
        localOnlyTokenIds: ["COTHER"],
      }),
    ).toBe(false);

    expect(getIsRemovable({ contract: CONTRACT, isSac: false })).toBe(false);
  });
});
