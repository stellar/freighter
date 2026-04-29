import { Memo } from "stellar-sdk";
import {
  validateFederationMemo,
  buildMemoFromFederation,
  FederationMemoType,
} from "../federationMemo";

// --- validateFederationMemo ---

describe("validateFederationMemo", () => {
  describe("empty memo", () => {
    it("accepts empty string for any memo type", () => {
      expect(() =>
        validateFederationMemo("", FederationMemoType.Text),
      ).not.toThrow();
      expect(() =>
        validateFederationMemo("", FederationMemoType.Id),
      ).not.toThrow();
      expect(() =>
        validateFederationMemo("", FederationMemoType.Hash),
      ).not.toThrow();
      expect(() => validateFederationMemo("", "unknown")).not.toThrow();
      expect(() => validateFederationMemo("", "")).not.toThrow();
    });
  });

  describe("text memo", () => {
    it("accepts a short ASCII string", () => {
      expect(() =>
        validateFederationMemo("hello", FederationMemoType.Text),
      ).not.toThrow();
    });

    it("accepts a string at exactly the 28-byte boundary", () => {
      expect(() =>
        validateFederationMemo("a".repeat(28), FederationMemoType.Text),
      ).not.toThrow();
    });

    it("rejects a string exceeding 28 bytes", () => {
      expect(() =>
        validateFederationMemo("a".repeat(29), FederationMemoType.Text),
      ).toThrow("exceeds 28 bytes");
    });

    it("measures byte length, not character length (multibyte chars)", () => {
      // Each '€' is 3 bytes in UTF-8; 10 × 3 = 30 bytes > 28
      expect(() =>
        validateFederationMemo("€".repeat(10), FederationMemoType.Text),
      ).toThrow("exceeds 28 bytes");
      // 9 × '€' = 27 bytes — should pass
      expect(() =>
        validateFederationMemo("€".repeat(9), FederationMemoType.Text),
      ).not.toThrow();
    });
  });

  describe("id memo", () => {
    it("accepts a valid non-negative integer string", () => {
      expect(() =>
        validateFederationMemo("0", FederationMemoType.Id),
      ).not.toThrow();
      expect(() =>
        validateFederationMemo("12345", FederationMemoType.Id),
      ).not.toThrow();
    });

    it("accepts the maximum uint64 value", () => {
      expect(() =>
        validateFederationMemo("18446744073709551615", FederationMemoType.Id),
      ).not.toThrow();
    });

    it("rejects non-integer strings", () => {
      expect(() =>
        validateFederationMemo("not-a-number", FederationMemoType.Id),
      ).toThrow("non-negative integer");
      expect(() =>
        validateFederationMemo("1.5", FederationMemoType.Id),
      ).toThrow("non-negative integer");
      expect(() => validateFederationMemo("-1", FederationMemoType.Id)).toThrow(
        "non-negative integer",
      );
    });

    it("rejects values exceeding uint64 max", () => {
      expect(() =>
        validateFederationMemo("18446744073709551616", FederationMemoType.Id),
      ).toThrow("exceeds maximum uint64 value");
    });
  });

  describe("hash memo", () => {
    const VALID_64_HEX = "a".repeat(64);

    it("accepts a 64-character hex string", () => {
      expect(() =>
        validateFederationMemo(VALID_64_HEX, FederationMemoType.Hash),
      ).not.toThrow();
    });

    it("accepts mixed-case hex", () => {
      const mixed = "aAbBcCdDeEfF" + "0".repeat(52);
      expect(() =>
        validateFederationMemo(mixed, FederationMemoType.Hash),
      ).not.toThrow();
    });

    it("rejects a hex string that is too short", () => {
      expect(() =>
        validateFederationMemo("a".repeat(63), FederationMemoType.Hash),
      ).toThrow("64-character hex string");
    });

    it("rejects a hex string that is too long", () => {
      expect(() =>
        validateFederationMemo("a".repeat(65), FederationMemoType.Hash),
      ).toThrow("64-character hex string");
    });

    it("rejects non-hex characters", () => {
      expect(() =>
        validateFederationMemo("z".repeat(64), FederationMemoType.Hash),
      ).toThrow("64-character hex string");
    });
  });

  describe("unknown memo type", () => {
    it("does not throw for an unknown type (pass-through)", () => {
      expect(() =>
        validateFederationMemo("anything", "totally_unknown"),
      ).not.toThrow();
    });

    it("does not throw for an empty type string", () => {
      expect(() => validateFederationMemo("anything", "")).not.toThrow();
    });
  });
});

// --- buildMemoFromFederation ---

describe("buildMemoFromFederation", () => {
  describe("text memo", () => {
    it("returns Memo.text for type 'text'", () => {
      const memo = buildMemoFromFederation(
        "payment-ref",
        FederationMemoType.Text,
      );
      expect(memo).toEqual(Memo.text("payment-ref"));
    });

    it("defaults to Memo.text for an unknown type", () => {
      const memo = buildMemoFromFederation("fallback", "weird_type");
      expect(memo).toEqual(Memo.text("fallback"));
    });

    it("throws when the text value exceeds 28 bytes", () => {
      expect(() =>
        buildMemoFromFederation("a".repeat(29), FederationMemoType.Text),
      ).toThrow("exceeds 28 bytes");
    });
  });

  describe("id memo", () => {
    it("returns Memo.id for type 'id'", () => {
      const memo = buildMemoFromFederation("12345", FederationMemoType.Id);
      expect(memo).toEqual(Memo.id("12345"));
    });

    it("throws for a non-integer id", () => {
      expect(() =>
        buildMemoFromFederation("abc", FederationMemoType.Id),
      ).toThrow("non-negative integer");
    });

    it("throws for an id exceeding uint64 max", () => {
      expect(() =>
        buildMemoFromFederation("18446744073709551616", FederationMemoType.Id),
      ).toThrow("exceeds maximum uint64 value");
    });
  });

  describe("hash memo", () => {
    const VALID_HEX = "deadbeef".repeat(8); // 64 hex chars

    it("returns Memo.hash for type 'hash'", () => {
      const memo = buildMemoFromFederation(VALID_HEX, FederationMemoType.Hash);
      expect(memo).toEqual(Memo.hash(VALID_HEX));
    });

    it("throws for an invalid hash value", () => {
      expect(() =>
        buildMemoFromFederation("not-hex", FederationMemoType.Hash),
      ).toThrow("64-character hex string");
    });
  });
});
