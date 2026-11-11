import { Buffer } from "buffer";
import { entropyToMnemonic, validateMnemonic, wordlists } from "bip39";
import { isValidImportMnemonic, normalizeMnemonic } from "../mnemonic";

describe("normalizeMnemonic", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeMnemonic("  Abandon\n abandon\tABOUT  ")).toBe(
      "abandon abandon about",
    );
  });
});

describe("isValidImportMnemonic", () => {
  const twelve =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  const twentyFour = `${"abandon ".repeat(23)}art`;
  it("accepts a valid 12-word phrase", () =>
    expect(isValidImportMnemonic(twelve)).toBe(true));
  it("accepts a valid 24-word phrase", () =>
    expect(isValidImportMnemonic(twentyFour)).toBe(true));
  it("accepts a messy valid phrase", () =>
    expect(isValidImportMnemonic(`\n${twelve.toUpperCase()}  `)).toBe(true));
  it("refuses 15 words even if the checksum passes", () => {
    const fifteen = entropyToMnemonic(Buffer.alloc(20));
    expect(fifteen.split(" ")).toHaveLength(15);
    expect(validateMnemonic(fifteen, wordlists.english)).toBe(true);
    expect(isValidImportMnemonic(fifteen)).toBe(false);
  });
  it("refuses a bad checksum", () =>
    expect(isValidImportMnemonic(twelve.replace(/about$/, "abandon"))).toBe(
      false,
    ));
  it("refuses a word not in the list", () =>
    expect(isValidImportMnemonic(twelve.replace(/^abandon/, "tomato1"))).toBe(
      false,
    ));
  it("refuses an empty string", () =>
    expect(isValidImportMnemonic("")).toBe(false));
});
