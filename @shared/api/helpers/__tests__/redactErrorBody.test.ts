import { redactErrorBody } from "../redactErrorBody";

const PUBLIC_KEY = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KJ5JS6ZJ7DHNTGKFEUJ";
const SECRET_KEY = "SBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KJ5JS6ZJ7DHNTGKFEUJ";

describe("redactErrorBody", () => {
  it("redacts a G-address nested anywhere in the body", () => {
    const result = redactErrorBody({
      error: "not found",
      data: [{ address: PUBLIC_KEY, is_funded: false }],
    });

    expect(result).toContain("G***");
    expect(result).not.toContain(PUBLIC_KEY);
  });

  it("redacts a secret seed with a distinguishable prefix", () => {
    // The prefix survives so triage can tell a publicKey leak (benign) from a
    // secret-seed leak (critical) without seeing the value itself.
    const result = redactErrorBody({ message: `bad key ${SECRET_KEY}` });

    expect(result).toContain("S***");
    expect(result).not.toContain(SECRET_KEY);
  });

  it("keeps the diagnostic detail for an ordinary error body", () => {
    expect(redactErrorBody({ message: "boom", statusCode: 500 })).toBe(
      '{"message":"boom","statusCode":500}',
    );
  });

  it("truncates an oversized body with the shared sentinel", () => {
    const result = redactErrorBody({ message: "x".repeat(1000) });

    expect(result).toHaveLength(200 + "…[truncated]".length);
    expect(result.endsWith("…[truncated]")).toBe(true);
  });

  it("handles a body that JSON.stringify drops", () => {
    // JSON.stringify(undefined) returns undefined, not a string.
    expect(redactErrorBody(undefined)).toBe("undefined");
    expect(redactErrorBody(null)).toBe("null");
  });

  it("does not throw on an unserializable body", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(redactErrorBody(circular)).toBe("[unserializable body]");
  });
});
