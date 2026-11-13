import { Keypair } from "stellar-sdk";

import { parseImportSecret } from "popup/helpers/parseImportSecret";

const PHRASE_12 =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const PHRASE_24 =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";

describe("parseImportSecret", () => {
  it("classifies a 12-word phrase", () => {
    expect(parseImportSecret(PHRASE_12)).toEqual({
      type: "phrase",
      mnemonic: PHRASE_12,
    });
  });

  it("classifies a 24-word phrase", () => {
    expect(parseImportSecret(PHRASE_24)).toEqual({
      type: "phrase",
      mnemonic: PHRASE_24,
    });
  });

  it("normalizes case and whitespace in a phrase", () => {
    const messy = `  ABANDON  abandon\n${PHRASE_12.split(" ")
      .slice(2)
      .join("   ")
      .toUpperCase()}  `;
    expect(parseImportSecret(messy)).toEqual({
      type: "phrase",
      mnemonic: PHRASE_12,
    });
  });

  it("classifies a secret key with surrounding whitespace", () => {
    const secret = Keypair.random().secret();
    expect(parseImportSecret(`  ${secret}\n`)).toEqual({
      type: "secret_key",
      secretKey: secret,
    });
  });

  it("rejects a public key", () => {
    expect(parseImportSecret(Keypair.random().publicKey())).toEqual({
      type: "invalid",
    });
  });

  it("rejects a truncated secret key", () => {
    const secret = Keypair.random().secret();
    expect(parseImportSecret(secret.slice(0, -1))).toEqual({ type: "invalid" });
  });

  it("rejects a phrase with a bad checksum", () => {
    const words = PHRASE_12.split(" ");
    words[11] = "abandon";
    expect(parseImportSecret(words.join(" "))).toEqual({ type: "invalid" });
  });

  it("rejects a 13-word phrase", () => {
    expect(parseImportSecret(`${PHRASE_12} about`)).toEqual({
      type: "invalid",
    });
  });

  it("rejects empty and whitespace-only input", () => {
    expect(parseImportSecret("")).toEqual({ type: "invalid" });
    expect(parseImportSecret("   ")).toEqual({ type: "invalid" });
  });
});
