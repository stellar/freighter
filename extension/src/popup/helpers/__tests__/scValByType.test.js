import { Address, xdr, StrKey } from "stellar-sdk";
import { scValByType } from "../soroban";

const ACCOUNT = "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB";
const CONTRACT = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";
const MUXED_ADDRESS =
  "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVAAAAAAAAAAAAAJLK";

describe("scValByType", () => {
  it("should render addresses as strings", () => {
    const scAddressAccount = xdr.ScAddress.scAddressTypeAccount(
      xdr.PublicKey.publicKeyTypeEd25519(
        StrKey.decodeEd25519PublicKey(ACCOUNT),
      ),
    );
    const accountAddress = xdr.ScVal.scvAddress(scAddressAccount);
    const parsedAccountAddress = scValByType(accountAddress);
    expect(parsedAccountAddress).toEqual(ACCOUNT);

    const scAddressContract = xdr.ScAddress.scAddressTypeContract(
      StrKey.decodeContract(CONTRACT),
    );
    const contractAddress = xdr.ScVal.scvAddress(scAddressContract);
    const parsedContractAddress = scValByType(contractAddress);
    expect(parsedContractAddress).toEqual(CONTRACT);
  });
  it("should render booleans as strings", () => {});
  it("should render bytes as an array of numbers", () => {});
  it("should render a contract instance as the wasm hash string", () => {});
  it("should render an error as a string, including the contract code and name", () => {});
  it("should render number types as strings", () => {});
  it("should render ledger keys as strings", () => {});
  it("should render maps and vectors as JSON strings", () => {});
  it("should render strings and symbols as strings", () => {});
  it("should render void as null", () => {});
});
