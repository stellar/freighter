import { Memo } from "stellar-sdk";
import {
  validateFederationMemo,
  buildMemoFromFederation,
  FederationMemoType,
} from "../federationMemo";

jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));

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
    // 32 zero-bytes encoded as base64 (43 chars + 1 padding '=')
    const VALID_B64 = "A".repeat(43) + "=";

    it("accepts a valid base64-encoded 32-byte hash", () => {
      expect(() =>
        validateFederationMemo(VALID_B64, FederationMemoType.Hash),
      ).not.toThrow();
    });

    it("rejects a string that decodes to fewer than 32 bytes", () => {
      expect(() =>
        validateFederationMemo("AAAA", FederationMemoType.Hash),
      ).toThrow("base64-encoded 32-byte value");
    });

    it("rejects a string that decodes to more than 32 bytes", () => {
      // 33 zero-bytes in base64 = 44 chars + padding
      const tooLong = "A".repeat(44) + "==";
      expect(() =>
        validateFederationMemo(tooLong, FederationMemoType.Hash),
      ).toThrow("base64-encoded 32-byte value");
    });

    it("rejects a non-base64 string of the wrong length", () => {
      expect(() =>
        validateFederationMemo(
          "not-valid-base64-string!!!",
          FederationMemoType.Hash,
        ),
      ).toThrow("base64-encoded 32-byte value");
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
      ).toThrow("Failed to resolve federated address");
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
      ).toThrow("Failed to resolve federated address");
    });

    it("throws for an id exceeding uint64 max", () => {
      expect(() =>
        buildMemoFromFederation("18446744073709551616", FederationMemoType.Id),
      ).toThrow("Failed to resolve federated address");
    });
  });

  describe("hash memo", () => {
    // 32 zero-bytes encoded as base64 per SEP-0002
    const VALID_B64 = "A".repeat(43) + "=";

    it("returns Memo.hash for type 'hash'", () => {
      const memo = buildMemoFromFederation(VALID_B64, FederationMemoType.Hash);
      expect(memo).toEqual(Memo.hash(Buffer.from(VALID_B64, "base64")));
    });

    it("throws for an invalid hash value", () => {
      expect(() =>
        buildMemoFromFederation("not-valid", FederationMemoType.Hash),
      ).toThrow("Failed to resolve federated address");
    });
  });
});
