import { Account } from "@shared/api/types";
import { findAccountById, findAccountByPublicKey } from "../account";

const ACCOUNTS: Account[] = [
  {
    id: "0.11",
    sourceId: "phrase-1",
    publicKey: "GA",
    name: "A",
    imported: false,
  },
  { id: "0.22", sourceId: "key-1", publicKey: "GB", name: "B", imported: true },
  // The same key imported twice: two keystores, one public key.
  { id: "0.33", sourceId: "key-1", publicKey: "GB", name: "C", imported: true },
];

describe("findAccountByPublicKey", () => {
  it("returns the account with that public key", () => {
    expect(findAccountByPublicKey(ACCOUNTS, "GA")).toBe(ACCOUNTS[0]);
  });

  it("returns the first match when two accounts share a public key", () => {
    expect(findAccountByPublicKey(ACCOUNTS, "GB")).toBe(ACCOUNTS[1]);
  });

  it("throws for an unknown public key instead of falling back", () => {
    expect(() => findAccountByPublicKey(ACCOUNTS, "GZ")).toThrow(/no account/i);
  });

  it("throws when the matched account has no id", () => {
    const legacy = [
      { publicKey: "GA", name: "A", imported: false },
    ] as Account[];
    expect(() => findAccountByPublicKey(legacy, "GA")).toThrow(/no id/i);
  });
});

describe("findAccountById", () => {
  it("returns the account with that id", () => {
    expect(findAccountById(ACCOUNTS, "0.33")).toBe(ACCOUNTS[2]);
  });

  it("throws for an unknown id instead of falling back", () => {
    expect(() => findAccountById(ACCOUNTS, "0.99")).toThrow(/no account/i);
  });
});
