import { getExpectedToFailReason } from "../useSimulateTxData";

const t = (key: string) => key;

describe("getExpectedToFailReason", () => {
  describe("destination is already funded", () => {
    it("returns null for any asset when destination is funded", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: true,
          assetCanonical:
            "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          amount: "10",
          t,
        }),
      ).toBeNull();
    });

    it("returns null when destination funded status is unknown", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: undefined,
          assetCanonical:
            "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          amount: "10",
          t,
        }),
      ).toBeNull();
    });
  });

  describe("destination is unfunded, classic assets", () => {
    it("returns the unfunded warning for a credit_alphanum4 asset (G-issuer)", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          amount: "10",
          t,
        }),
      ).toBe("Blockaid unfunded destination");
    });

    it("returns the unfunded warning for a credit_alphanum12 asset (G-issuer)", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "LONGCODE12:GDMTVHLWJTHSUDMZVVMXXH6VJHA2ZV3HNG5LYNAZ6RTWB7GISM6PGTUV",
          amount: "10",
          t,
        }),
      ).toBe("Blockaid unfunded destination");
    });
  });

  describe("destination is unfunded, SAC-wrapped classic assets", () => {
    // SACs normalize to their underlying classic G-issuer, so the canonical
    // is indistinguishable from a classic credit_alphanum send — which is
    // correct: a SAC's `transfer` still fails to an unfunded G-account.
    it("returns the unfunded warning for a SAC-wrapped USDC (classic G-issuer canonical)", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          amount: "10",
          t,
        }),
      ).toBe("Blockaid unfunded destination");
    });
  });

  describe("destination is unfunded, pure Soroban custom tokens", () => {
    // Pure Soroban tokens carry a C-issuer in their canonical form. Their
    // `transfer` is a contract invocation — the destination doesn't need
    // to be a funded classic account — so no warning should fire.
    it("returns null for a pure Soroban custom token (C-issuer)", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "PBT:CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
          amount: "10",
          t,
        }),
      ).toBeNull();
    });

    it("returns null regardless of amount for a pure Soroban custom token", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "PBT:CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
          amount: "0",
          t,
        }),
      ).toBeNull();
    });

    it("does NOT skip the warning for non-C issuers that aren't classic G-addresses (e.g. liquidity pool share canonicals)", () => {
      // Guards against the skip widening beyond contract-id issuers. A
      // looser check like `!issuer.startsWith("G")` would incorrectly
      // swallow the warning for "<poolId>:lp" and anything else non-G.
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef:lp",
          amount: "10",
          t,
        }),
      ).toBe("Blockaid unfunded destination");
    });
  });

  describe("destination is unfunded, native XLM", () => {
    it("returns the native unfunded warning when amount is below the create-account minimum", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical: "native",
          amount: "0.5",
          t,
        }),
      ).toBe("Blockaid unfunded destination native");
    });

    it("returns null when XLM amount is at the create-account minimum", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical: "native",
          amount: "1",
          t,
        }),
      ).toBeNull();
    });

    it("returns null when XLM amount is above the create-account minimum", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical: "native",
          amount: "5",
          t,
        }),
      ).toBeNull();
    });

    it("returns the native unfunded warning when amount is empty", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical: "native",
          amount: "",
          t,
        }),
      ).toBe("Blockaid unfunded destination native");
    });
  });
});
