import {
  getNextDefaultAccountName,
  normalizeAccountName,
} from "../accountName";

describe("getNextDefaultAccountName", () => {
  it("starts at Account 1 in an empty wallet", () => {
    expect(getNextDefaultAccountName([])).toBe("Account 1");
  });

  it("counts every account in the wallet", () => {
    expect(getNextDefaultAccountName(["Account 1", "Savings"])).toBe(
      "Account 3",
    );
  });

  it("skips names already in use", () => {
    expect(getNextDefaultAccountName(["Account 3", "Account 4"])).toBe(
      "Account 5",
    );
  });
});

describe("normalizeAccountName", () => {
  it("trims and caps the name", () => {
    expect(normalizeAccountName("  Savings  ")).toBe("Savings");
    expect(normalizeAccountName("x".repeat(30))).toBe("x".repeat(24));
  });

  it("returns null for an empty or missing name", () => {
    expect(normalizeAccountName("   ")).toBeNull();
    expect(normalizeAccountName(undefined)).toBeNull();
  });
});
