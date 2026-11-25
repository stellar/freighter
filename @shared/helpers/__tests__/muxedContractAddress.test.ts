import * as StellarSdk from "stellar-sdk";
import * as StellarSdkNext from "stellar-sdk-next";

// The SEP-23 test vector for a CAP-84 muxed contract address: the base
// contract below with mux id 0.
const MUXED_CONTRACT =
  "WA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAAAAAAWWC";
const BASE_CONTRACT =
  "CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUWDA";

describe.each([
  ["stellar-sdk", StellarSdk],
  ["stellar-sdk-next", StellarSdkNext],
])("muxed contract addresses with %s", (_name, Sdk) => {
  it("validates the W strkey", () => {
    expect(Sdk.StrKey.isValidMuxedContract(MUXED_CONTRACT)).toBe(true);
    expect(Sdk.StrKey.isValidMuxedContract(BASE_CONTRACT)).toBe(false);
  });

  it("round-trips through the muxed contract ScAddress arm", () => {
    const scAddress = new Sdk.Address(MUXED_CONTRACT).toScAddress();

    expect(scAddress.type).toBe("scAddressTypeMuxedContract");
    expect(Sdk.Address.fromScAddress(scAddress).toString()).toBe(
      MUXED_CONTRACT,
    );
  });

  it("round-trips through an ScVal", () => {
    const scVal = new Sdk.Address(MUXED_CONTRACT).toScVal();

    expect(Sdk.Address.fromScVal(scVal).toString()).toBe(MUXED_CONTRACT);
  });

  it("encodes the W strkey from its base contract and mux id", () => {
    expect(Sdk.encodeMuxedContractAddress(BASE_CONTRACT, "0")).toBe(
      MUXED_CONTRACT,
    );
    expect(Sdk.extractBaseAddress(MUXED_CONTRACT)).toBe(BASE_CONTRACT);
  });
});
