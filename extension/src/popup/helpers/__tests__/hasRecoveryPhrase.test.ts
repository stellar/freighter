import { SecretSource, SecretSourceType } from "@shared/api/types";
import { hasRecoveryPhrase } from "../hasRecoveryPhrase";

const phrase: SecretSource = {
  id: "p",
  type: SecretSourceType.PHRASE,
  label: "Seed Phrase 1",
  createdAt: 1,
};
const secretKey: SecretSource = {
  id: "k",
  type: SecretSourceType.SECRET_KEY,
  label: "Secret Key 1",
  createdAt: 2,
};

describe("hasRecoveryPhrase", () => {
  it("is true for an empty list", () => {
    expect(hasRecoveryPhrase([])).toBe(true);
  });
  it("is true with a phrase", () => {
    expect(hasRecoveryPhrase([phrase])).toBe(true);
  });
  it("is false with only a secret key", () => {
    expect(hasRecoveryPhrase([secretKey])).toBe(false);
  });
  it("is true with a secret key and a phrase", () => {
    expect(hasRecoveryPhrase([secretKey, phrase])).toBe(true);
  });
});
