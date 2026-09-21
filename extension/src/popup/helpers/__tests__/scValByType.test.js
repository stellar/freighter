import { Address, xdr, StrKey } from "stellar-sdk";
import yaml from "js-yaml";

import { scValByType } from "../soroban";

const ACCOUNT = "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB";
const CONTRACT = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";
const MUXED_ADDRESS =
  "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVAAAAAAAAAAAAAJLK";

const mapEntry = (key, val) => new xdr.ScMapEntry({ key, val });

const accountAddress = () =>
  xdr.ScAddress.scAddressTypeAccount(
    xdr.PublicKey.publicKeyTypeEd25519(StrKey.decodeEd25519PublicKey(ACCOUNT)),
  );

const contractAddress = () =>
  xdr.ScAddress.scAddressTypeContract(
    new xdr.ContractId(StrKey.decodeContract(CONTRACT)),
  );

/** "alice" with one trailing byte that cannot begin a UTF-8 sequence. */
const invalidUtf8 = (suffix) =>
  new Uint8Array([...Buffer.from("alice"), suffix]);

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
      new xdr.ContractId(StrKey.decodeContract(CONTRACT)),
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

    const scErrorCode = xdr.ScErrorCode.scecArithDomain;
    const wasmError = xdr.ScError.sceWasmVm(scErrorCode);
    const scvWasmError = xdr.ScVal.scvError(wasmError);
    const parsedWasmError = scValByType(scvWasmError);
    expect(parsedWasmError).toEqual(scErrorCode);
  });
  it("should render number types as strings", () => {
    const num = 1;
    const scvInt64 = xdr.ScVal.scvI64(BigInt(num));
    const parsedInt = scValByType(scvInt64);
    expect(parsedInt).toEqual(num.toString());
  });
  it("should render ledger keys as strings", () => {
    const nonce = 1;
    const nonceKey = new xdr.ScNonceKey({ nonce: BigInt(nonce) });
    const ledgerKey = xdr.ScVal.scvLedgerKeyNonce(nonceKey);
    const parsedLedgerKey = scValByType(ledgerKey);
    expect(parsedLedgerKey).toEqual(nonce.toString());

    const ledgerKeyContractInstance = xdr.ScVal.scvLedgerKeyContractInstance();
    const parsedInstance = scValByType(ledgerKeyContractInstance);
    expect(parsedInstance).toEqual(null);
  });
  // An SCMap is a list of signed entries, not a JS object. `scValToNative`
  // builds one with `Object.fromEntries`, which coerces every key through
  // `ToPropertyKey` and lets a later entry overwrite an earlier one, so a map
  // with N signed entries could render as one — silently, on the screen the
  // user approves from. These cases pin the entry count and the key type.
  describe("maps and vectors", () => {
    it("should render a map as a value literal", () => {
      const xdrMap = xdr.ScVal.scvMap([
        mapEntry(xdr.ScVal.scvString("key"), xdr.ScVal.scvU64(BigInt(1))),
      ]);
      expect(scValByType(xdrMap)).toEqual('{\n  "key": 1\n}');
    });

    it("should render a vector as a value literal", () => {
      const xdrVec = xdr.ScVal.scvVec([
        xdr.ScVal.scvU32(1),
        xdr.ScVal.scvString("two"),
      ]);
      expect(scValByType(xdrVec)).toEqual('[\n  1,\n  "two"\n]');
    });

    it("should render empty maps and vectors", () => {
      expect(scValByType(xdr.ScVal.scvMap([]))).toEqual("{}");
      expect(scValByType(xdr.ScVal.scvVec([]))).toEqual("[]");
    });

    it("should render every entry of a map with mixed-type keys", () => {
      const xdrMap = xdr.ScVal.scvMap([
        mapEntry(xdr.ScVal.scvU64(BigInt(1)), xdr.ScVal.scvString("from-u64")),
        mapEntry(xdr.ScVal.scvString("1"), xdr.ScVal.scvString("from-string")),
      ]);
      // Both entries survive, and the key types stay distinguishable: the u64
      // key is bare where the string key is quoted.
      expect(scValByType(xdrMap)).toEqual(
        '{\n  1: "from-u64",\n  "1": "from-string"\n}',
      );
    });

    it("should render every entry of a map with structured keys", () => {
      const structKey = (id) =>
        xdr.ScVal.scvMap([
          mapEntry(xdr.ScVal.scvSymbol("id"), xdr.ScVal.scvU32(id)),
        ]);
      const xdrMap = xdr.ScVal.scvMap(
        [0, 1, 2, 3].map((id) =>
          mapEntry(structKey(id), xdr.ScVal.scvString(`v${id}`)),
        ),
      );
      const rendered = scValByType(xdrMap);
      expect(rendered).toEqual(
        '{\n  { id: 0 }: "v0",\n  { id: 1 }: "v1",\n  { id: 2 }: "v2",\n  { id: 3 }: "v3"\n}',
      );
      expect(rendered).not.toContain("[object Object]");
    });

    it("should distinguish a symbol key from a string key", () => {
      const xdrMap = xdr.ScVal.scvMap([
        mapEntry(xdr.ScVal.scvSymbol("a"), xdr.ScVal.scvString("sym")),
        mapEntry(xdr.ScVal.scvString("a"), xdr.ScVal.scvString("str")),
      ]);
      expect(scValByType(xdrMap)).toEqual('{\n  a: "sym",\n  "a": "str"\n}');
    });

    it("should render every entry of an address-keyed map", () => {
      const xdrMap = xdr.ScVal.scvMap([
        mapEntry(xdr.ScVal.scvAddress(accountAddress()), xdr.ScVal.scvU32(0)),
        mapEntry(xdr.ScVal.scvAddress(contractAddress()), xdr.ScVal.scvU32(1)),
      ]);
      expect(scValByType(xdrMap)).toEqual(
        `{\n  ${ACCOUNT}: 0,\n  ${CONTRACT}: 1\n}`,
      );
    });

    it("should render every entry of a u32-keyed map", () => {
      const xdrMap = xdr.ScVal.scvMap(
        [0, 1, 2].map((id) =>
          mapEntry(xdr.ScVal.scvU32(id), xdr.ScVal.scvBool(true)),
        ),
      );
      expect(scValByType(xdrMap)).toEqual(
        "{\n  0: true,\n  1: true,\n  2: true\n}",
      );
    });

    it("should not collapse a map nested inside a vector", () => {
      const xdrVec = xdr.ScVal.scvVec([
        xdr.ScVal.scvMap([
          mapEntry(
            xdr.ScVal.scvU64(BigInt(1)),
            xdr.ScVal.scvString("from-u64"),
          ),
          mapEntry(
            xdr.ScVal.scvString("1"),
            xdr.ScVal.scvString("from-string"),
          ),
        ]),
      ]);
      expect(scValByType(xdrVec)).toEqual(
        '[\n  {\n    1: "from-u64",\n    "1": "from-string"\n  }\n]',
      );
    });

    it("should render bytes nested in a container as hex", () => {
      const xdrVec = xdr.ScVal.scvVec([
        xdr.ScVal.scvBytes(Buffer.from("deadbeef", "hex")),
      ]);
      // Not `{"type":"Buffer","data":[222,…]}`, which is what a JSON
      // stringification of the decoded value produces.
      expect(scValByType(xdrVec)).toEqual("[\n  0xdeadbeef\n]");
    });
  });

  // An SCString/SCSymbol is a byte string, not guaranteed text. A lenient
  // UTF-8 decode turns every invalid byte into U+FFFD, so two distinct signed
  // payloads render as one screen string. These cases pin the strict decode.
  describe("non-UTF-8 text", () => {
    it("should render an invalid-UTF-8 string as labelled hex", () => {
      expect(scValByType(xdr.ScVal.scvString(invalidUtf8(0xff)))).toEqual(
        "string(0x616c696365ff)",
      );
    });

    it("should render two distinct invalid-UTF-8 strings differently", () => {
      const first = scValByType(xdr.ScVal.scvString(invalidUtf8(0xff)));
      const second = scValByType(xdr.ScVal.scvString(invalidUtf8(0xfe)));
      expect(first).not.toEqual(second);
      expect(first).not.toContain("�");
      expect(second).not.toContain("�");
    });

    it("should render an invalid-UTF-8 symbol as labelled hex", () => {
      expect(scValByType(xdr.ScVal.scvSymbol(invalidUtf8(0xff)))).toEqual(
        "symbol(0x616c696365ff)",
      );
    });

    it("should render an invalid-UTF-8 executable tag as labelled hex", () => {
      const first = scValByType(xdr.ScVal.scvExecutableTag(invalidUtf8(0xff)));
      const second = scValByType(xdr.ScVal.scvExecutableTag(invalidUtf8(0xfe)));
      expect(first).toEqual("tag(0x616c696365ff)");
      expect(first).not.toEqual(second);
    });

    it("should render invalid-UTF-8 text nested in a container as labelled hex", () => {
      const xdrVec = xdr.ScVal.scvVec([xdr.ScVal.scvString(invalidUtf8(0xff))]);
      // Not `{"0":97,"1":108,…}`, which is what a JSON stringification of the
      // decoded bytes produces.
      expect(scValByType(xdrVec)).toEqual("[\n  string(0x616c696365ff)\n]");

      const xdrMap = xdr.ScVal.scvMap([
        mapEntry(
          xdr.ScVal.scvString(invalidUtf8(0xff)),
          xdr.ScVal.scvString(invalidUtf8(0xfe)),
        ),
      ]);
      expect(scValByType(xdrMap)).toEqual(
        "{\n  string(0x616c696365ff): string(0x616c696365fe)\n}",
      );
    });
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
  it("should render a CAP-85 executable tag as a string", () => {
    const tag = "v2";
    const scvTag = xdr.ScVal.scvExecutableTag(tag);
    const parsedTag = scValByType(scvTag);
    expect(parsedTag).toEqual(tag);
  });
});
