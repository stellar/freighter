import { Address, xdr, StrKey } from "stellar-sdk";
import yaml from "js-yaml";

import { scValByType, scValToDisplayTokens } from "../soroban";

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

const WASM_HASH = Buffer.alloc(32, 7);
const WASM_HASH_HEX = WASM_HASH.toString("hex");

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
    expect(parsedBool).toEqual("true");

    // Returning the raw boolean made React render `false` as nothing at all,
    // so a signed `false` argument used to reach the screen as an empty row.
    expect(scValByType(xdr.ScVal.scvBool(false))).toEqual("false");
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
    expect(parsedContractError).toEqual(`${contractErrorCode}`);

    const scErrorCode = xdr.ScErrorCode.scecArithDomain;
    const wasmError = xdr.ScError.sceWasmVm(scErrorCode);
    const scvWasmError = xdr.ScVal.scvError(wasmError);
    const parsedWasmError = scValByType(scvWasmError);
    expect(parsedWasmError).toEqual(`${scErrorCode}`);
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
    expect(parsedInstance).toEqual("ledgerKeyContractInstance");
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
    it("should escape an invalid byte in a string", () => {
      expect(scValByType(xdr.ScVal.scvString(invalidUtf8(0xff)))).toEqual(
        "alice\\xff",
      );
    });

    // The hex form this used to emit could be spelled out by a string whose
    // text happened to read `string(0x...)` — one screen string standing for
    // two signed payloads, which is the defect, not the fix.
    it("should not let valid text impersonate an escaped byte string", () => {
      const binary = scValByType(xdr.ScVal.scvString(invalidUtf8(0xff)));
      const text = scValByType(xdr.ScVal.scvString("alice\\xff"));
      expect(text).toEqual("alice\\\\xff");
      expect(text).not.toEqual(binary);
    });

    // `toJson()`, the SDK's SEP-0051 form, hex-escapes every byte above
    // ASCII, which would render this as `caf\xc3\xa9 \xe2\x9c\x93`.
    it("should leave legible non-ASCII text alone", () => {
      expect(scValByType(xdr.ScVal.scvString("café ✓"))).toEqual("café ✓");
    });

    // Valid UTF-8 that cannot be seen: left as-is, a bidi override reorders
    // what is drawn without changing what is signed.
    it("should escape invisible and control codepoints", () => {
      expect(scValByType(xdr.ScVal.scvString("a\u202Eb"))).toEqual(
        "a\\u{202e}b",
      );
      expect(scValByType(xdr.ScVal.scvString("a\nb\u0007"))).toEqual(
        "a\\nb\\x07",
      );
    });

    it("should render two distinct invalid-UTF-8 strings differently", () => {
      const first = scValByType(xdr.ScVal.scvString(invalidUtf8(0xff)));
      const second = scValByType(xdr.ScVal.scvString(invalidUtf8(0xfe)));
      expect(first).not.toEqual(second);
      expect(first).not.toContain("�");
      expect(second).not.toContain("�");
    });

    it("should escape an invalid byte in a symbol", () => {
      expect(scValByType(xdr.ScVal.scvSymbol(invalidUtf8(0xff)))).toEqual(
        "alice\\xff",
      );
    });

    it("should escape an invalid byte in an executable tag", () => {
      const first = scValByType(xdr.ScVal.scvExecutableTag(invalidUtf8(0xff)));
      const second = scValByType(xdr.ScVal.scvExecutableTag(invalidUtf8(0xfe)));
      expect(first).toEqual("alice\\xff");
      expect(first).not.toEqual(second);
    });

    it("should escape invalid-UTF-8 text nested in a container", () => {
      const xdrVec = xdr.ScVal.scvVec([xdr.ScVal.scvString(invalidUtf8(0xff))]);
      // Not `{"0":97,"1":108,…}`, which is what a JSON stringification of the
      // decoded bytes produces.
      expect(scValByType(xdrVec)).toEqual('[\n  "alice\\xff"\n]');

      const xdrMap = xdr.ScVal.scvMap([
        mapEntry(
          xdr.ScVal.scvString(invalidUtf8(0xff)),
          xdr.ScVal.scvString(invalidUtf8(0xfe)),
        ),
      ]);
      expect(scValByType(xdrMap)).toEqual('{\n  "alice\\xff": "alice\\xfe"\n}');
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
  it("should render void", () => {
    const scvNull = xdr.ScVal.scvVoid();
    const parsedVoid = scValByType(scvNull);
    expect(parsedVoid).toEqual("void");
  });

  // Every one of these used to return a non-string that React drops, so the
  // parameter row rendered empty on the screen the user approves from.
  it("should never render a signed value as an empty row", () => {
    const sacInstance = xdr.ScVal.scvContractInstance(
      new xdr.ScContractInstance({
        executable: xdr.ContractExecutable.contractExecutableStellarAsset(),
        storage: [],
      }),
    );
    for (const scVal of [
      xdr.ScVal.scvBool(false),
      xdr.ScVal.scvVoid(),
      xdr.ScVal.scvLedgerKeyContractInstance(),
      sacInstance,
    ]) {
      expect(typeof scValByType(scVal)).toEqual("string");
      expect(scValByType(scVal)).not.toEqual("");
    }
  });

  // An instance is told apart from another instance by its storage map and,
  // for a CAP-85 external reference, by whose code it points at. Naming the
  // executable arm alone dropped both.
  describe("contract instances", () => {
    const instance = (executable, storage) =>
      xdr.ScVal.scvContractInstance(
        new xdr.ScContractInstance({ executable, storage }),
      );
    const wasm = () =>
      xdr.ContractExecutable.contractExecutableWasm(new xdr.Hash(WASM_HASH));

    it("should render the storage map, not just the executable", () => {
      const rendered = scValByType(
        instance(wasm(), [
          mapEntry(xdr.ScVal.scvSymbol("admin"), xdr.ScVal.scvU32(1)),
        ]),
      );
      expect(rendered).toContain("admin: 1");
      expect(rendered).toContain(`wasm(0x${WASM_HASH_HEX})`);
    });

    it("should tell two instances sharing an executable apart", () => {
      const first = scValByType(
        instance(wasm(), [
          mapEntry(xdr.ScVal.scvSymbol("admin"), xdr.ScVal.scvU32(1)),
        ]),
      );
      const second = scValByType(
        instance(wasm(), [
          mapEntry(xdr.ScVal.scvSymbol("admin"), xdr.ScVal.scvU32(2)),
        ]),
      );
      expect(first).not.toEqual(second);
    });

    // `storage` is an optional pointer: absent storage and empty storage are
    // two different signed values.
    it("should distinguish absent storage from empty storage", () => {
      expect(scValByType(instance(wasm(), null))).not.toEqual(
        scValByType(instance(wasm(), [])),
      );
    });

    it("should render the external reference's owner and tag", () => {
      const rendered = scValByType(
        instance(
          xdr.ContractExecutable.contractExecutableExternalRef(
            new xdr.ContractExecutableExternalRef({
              executableOwner: contractAddress(),
              tag: Buffer.from("v2"),
            }),
          ),
          null,
        ),
      );
      expect(rendered).toContain(CONTRACT);
      expect(rendered).toContain("tag: v2");
    });

    // An instance can appear as a map key, and a key has to stay one line so
    // that one signed entry is always exactly one row.
    it("should stay on one line as a map key", () => {
      const rendered = scValByType(
        xdr.ScVal.scvMap([
          mapEntry(
            instance(wasm(), [
              mapEntry(xdr.ScVal.scvSymbol("admin"), xdr.ScVal.scvU32(1)),
            ]),
            xdr.ScVal.scvU32(9),
          ),
        ]),
      );
      expect(rendered.split("\n")).toHaveLength(3);
    });
  });

  // The signing screen offers each scalar's type on demand rather than
  // spelling it out inline, so every scalar has to carry its arm.
  describe("display tokens", () => {
    it("should tag every scalar with its SCVal arm at any depth", () => {
      const tokens = scValToDisplayTokens(
        xdr.ScVal.scvMap([
          mapEntry(
            xdr.ScVal.scvSymbol("one"),
            xdr.ScVal.scvVec([
              xdr.ScVal.scvU64(BigInt(1)),
              xdr.ScVal.scvString("1"),
            ]),
          ),
        ]),
      );
      expect(
        tokens
          .filter((token) => token.kind === "value")
          .map((token) => [token.text, token.scValType]),
      ).toEqual([
        ["one", "scvSymbol"],
        ["1", "scvU64"],
        ['"1"', "scvString"],
      ]);
    });

    // The tokens are what the screen renders and the join is what the
    // clipboard gets; this is what stops the two drifting apart.
    it("should join back to exactly the string form", () => {
      const scVal = xdr.ScVal.scvMap([
        mapEntry(xdr.ScVal.scvSymbol("amount"), xdr.ScVal.scvU32(100)),
      ]);
      expect(
        scValToDisplayTokens(scVal)
          .map((token) => token.text)
          .join(""),
      ).toEqual(scValByType(scVal));
    });
  });
  it("should render a CAP-85 executable tag as a string", () => {
    const tag = "v2";
    const scvTag = xdr.ScVal.scvExecutableTag(tag);
    const parsedTag = scValByType(scvTag);
    expect(parsedTag).toEqual(tag);
  });
});
