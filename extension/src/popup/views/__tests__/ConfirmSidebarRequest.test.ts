// Test the isValidNextRoute validation logic used by ConfirmSidebarRequest
// to prevent open-redirect attacks via the `next` query parameter.
//
// The actual function lives inside the ConfirmSidebarRequest component as a
// local closure, so we duplicate it here to document and enforce the expected
// security behavior. If the implementation changes, these tests should be
// updated (or, ideally, the function should be extracted and imported).

const isValidNextRoute = (value: string) => {
  if (!value) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(value)) return false;
  return true;
};

describe("isValidNextRoute", () => {
  it("rejects an empty string", () => {
    expect(isValidNextRoute("")).toBe(false);
  });

  it("accepts a valid internal route with query params", () => {
    expect(isValidNextRoute("/sign-transaction?abc")).toBe(true);
  });

  it("rejects a protocol-relative URL (// prefix)", () => {
    expect(isValidNextRoute("//")).toBe(false);
  });

  it("rejects a protocol-relative redirect to an external host", () => {
    expect(isValidNextRoute("//evil.com")).toBe(false);
  });

  it("rejects an absolute http URL", () => {
    expect(isValidNextRoute("http://evil.com")).toBe(false);
  });

  it("rejects a javascript: URI", () => {
    expect(isValidNextRoute("javascript:alert(1)")).toBe(false);
  });

  it("rejects a data: URI", () => {
    expect(isValidNextRoute("data:text/html,<script>")).toBe(false);
  });

  it("accepts a bare slash as a valid route", () => {
    expect(isValidNextRoute("/")).toBe(true);
  });

  it("rejects a path without a leading slash", () => {
    expect(isValidNextRoute("sign-transaction")).toBe(false);
  });

  it("accepts encoded characters that start with / but not //", () => {
    expect(isValidNextRoute("/%2f%2fevil.com")).toBe(true);
  });
});
