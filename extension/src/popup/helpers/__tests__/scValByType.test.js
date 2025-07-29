import { Address, xdr, StrKey } from "stellar-sdk";
import yaml from "js-yaml";

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
  it("should render booleans as strings", () => {
    const bool = xdr.ScVal.scvBool(true);
    const parsedBool = scValByType(bool);
    expect(parsedBool).toEqual(true);
  });
  it("should render bytes as a a hex string", () => {
    const bytesBuffer = Buffer.from([0x00, 0x01]);
    const bytes = xdr.ScVal.scvBytes(bytesBuffer);
    const parsedBytes = scValByType(bytes);
    expect(parsedBytes).toEqual("0001");
  });
  it("should render an error as a string, including the contract code and name", () => {
    const contractErrorCode = 1;
    const contractError = xdr.ScError.sceContract(contractErrorCode);
    const scvContractError = xdr.ScVal.scvError(contractError);
    const parsedContractError = scValByType(scvContractError);
    expect(parsedContractError).toEqual(contractErrorCode);

    const scErrorCode = xdr.ScErrorCode.scecArithDomain();
    const wasmError = xdr.ScError.sceWasmVm(scErrorCode);
    const scvWasmError = xdr.ScVal.scvError(wasmError);
    const parsedWasmError = scValByType(scvWasmError);
    expect(parsedWasmError).toEqual(scErrorCode);
  });
  it("should render number types as strings", () => {
    const num = 1;
    const scvInt64 = xdr.ScVal.scvI64(new xdr.Int64(num));
    const parsedInt = scValByType(scvInt64);
    expect(parsedInt).toEqual(num.toString());
  });
  it("should render ledger keys as strings", () => {
    const nonce = 1;
    const nonceKey = new xdr.ScNonceKey({ nonce });
    const ledgerKey = xdr.ScVal.scvLedgerKeyNonce(nonceKey);
    const parsedLedgerKey = scValByType(ledgerKey);
    expect(parsedLedgerKey).toEqual(nonce.toString());

    const ledgerKeyContractInstance = xdr.ScVal.scvLedgerKeyContractInstance();
    const parsedInstance = scValByType(ledgerKeyContractInstance);
    expect(parsedInstance).toEqual(undefined);
  });
  it("should render maps and vectors as JSON strings", () => {
    const key = "key";
    const value = 1;
    const xdrMap = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvString(key),
        val: xdr.ScVal.scvU64(new xdr.Uint64(value)),
      }),
    ]);
    const parsedMap = scValByType(xdrMap);
    expect(parsedMap).toEqual(
      JSON.stringify(
        { [key]: value.toString() },
        (_, val) => (typeof val === "bigint" ? val.toString() : val),
        2,
      ),
    );
  });
  it("should render strings and symbols as strings", () => {
    const str = "arbitrary string";
    const scvString = xdr.ScVal.scvString(str);
    const parsedString = scValByType(scvString);
    expect(parsedString).toEqual(str);

    const scvSym = xdr.ScVal.scvSymbol(str);
    const parsedSymbol = scValByType(scvSym);
    expect(parsedSymbol).toEqual(str);
  });
  it("should render void as null", () => {
    const scvNull = xdr.ScVal.scvVoid();
    const parsedVoid = scValByType(scvNull);
    expect(parsedVoid).toEqual(null);
  });
});
