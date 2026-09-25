import BigNumber from "bignumber.js";
import {
  Account,
  Asset,
  Keypair,
  MuxedAccount,
  Networks,
  Operation,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import {
  getTransactionInfo,
  truncatedPublicKey,
  truncateString,
  stroopToXlm,
  xlmToStroop,
  encodeSep53Message,
  isSameAccount,
  toSignatureBuffer,
  getTrustlineChangesForAccount,
} from "../stellar";
import * as urls from "../urls";

describe("truncatedPublicKey", () => {
  it("truncates keys", () => {
    expect(
      truncatedPublicKey(
        "GAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWU7B3",
      ),
    ).toBe("GAJV…U7B3");
  });
  it("returns empty on no input", () => {
    expect(truncatedPublicKey("")).toBe("");
  });
});

describe("truncateString", () => {
  it("truncates using the correct default character count", () => {
    const defaultCount = 4;
    const str = truncateString(
      "GAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWU7B3",
    );
    const [firstHalf, secondHalf] = str.split("…");
    expect(firstHalf.length).toBe(defaultCount);
    expect(secondHalf.length).toBe(defaultCount);
  });

  it("truncates using the correct custom character count", () => {
    const count = 5;
    const str = truncateString(
      "GAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWU7B3",
      count,
    );
    const [firstHalf, secondHalf] = str.split("…");
    expect(firstHalf.length).toBe(count);
    expect(secondHalf.length).toBe(count);
  });
});

describe("getTransactionInfo", () => {
  it("detects https domain", () => {
    jest.spyOn(urls, "parsedSearchParam").mockReturnValue({
      accountToSign: "",
      url: "https://stellar.org",
      transaction: { _networkPassphrase: "foo" },
      transactionXdr: "",
      flaggedKeys: { test: { tags: [""] } },
      tab: {},
      uuid: "test-uuid",
    });
    const info = getTransactionInfo("foo");
    if (!("blob" in info) && !("entry" in info)) {
      expect(info.isHttpsDomain).toBe(true);
    }
  });
  it("detects non-https domain", () => {
    jest.spyOn(urls, "parsedSearchParam").mockReturnValue({
      accountToSign: "",
      url: "http://stellar.org",
      transaction: { _networkPassphrase: "foo" },
      transactionXdr: "",
      flaggedKeys: { test: { tags: [""] } },
      tab: {},
      uuid: "test-uuid",
    });
    const info = getTransactionInfo("foo");
    if (!("blob" in info) && !("entry" in info)) {
      expect(info.isHttpsDomain).toBe(false);
    }
  });
});

describe("stroopToXlm", () => {
  test("should convert a raw string representing stroops into the equivalent value in lumens", () => {
    const stroops = "10000001";
    const lumens = stroopToXlm(stroops);

    expect(lumens).toEqual(new BigNumber(Number(stroops) / 1e7));
  });

  test("should convert a raw number representing stroops into the equivalent value in lumens", () => {
    const stroops = 10000001;
    const lumens = stroopToXlm(stroops);

    expect(lumens).toEqual(new BigNumber(Number(stroops) / 1e7));
  });

  test("should convert a BigNumber representing stroops into the equivalent value in lumens", () => {
    const stroops = new BigNumber("10000001");
    const lumens = stroopToXlm(stroops);

    expect(lumens).toEqual(stroops.dividedBy(1e7));
  });
});

describe("xlmToStroop", () => {
  test("should convert a raw string representing a value in lumens to its equivalent value in stroops", () => {
    const lumens = "11";
    const stroops = xlmToStroop(lumens);

    expect(stroops).toEqual(new BigNumber(Math.round(Number(lumens) * 1e7)));
  });

  test("should convert a BigNumber representing a value in lumens to its equivalent value in stroops", () => {
    const lumens = new BigNumber("11");
    const stroops = xlmToStroop(lumens);

    expect(stroops).toEqual(lumens.times(1e7));
  });
});

describe("isSameAccount", () => {
  // GAJV... and its muxed forms (memo ids 1 and 12345) share the same base account
  const BASE_G = "GAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWU7B3";
  const MUXED_1 =
    "MAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWUAAAAAAAAAAAAGPZI";
  const MUXED_12345 =
    "MAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWUAAAAAAAAABQHFISM";
  const OTHER_G = "GBE5XHPAMKKVHJJB6CWOFXIIAWKEJ7SSUNUMYFISYR47HOKIJ6JRA43Y";
  const CONTRACT_ID =
    "CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526";

  it("returns true for two identical base (G...) addresses", () => {
    expect(isSameAccount(BASE_G, BASE_G)).toBe(true);
  });

  it("returns true when a muxed (M...) address resolves to the base (G...) account", () => {
    expect(isSameAccount(MUXED_1, BASE_G)).toBe(true);
    expect(isSameAccount(BASE_G, MUXED_1)).toBe(true);
  });

  it("returns true for two muxed addresses sharing the same base account", () => {
    expect(isSameAccount(MUXED_1, MUXED_12345)).toBe(true);
  });

  it("returns false for different base accounts", () => {
    expect(isSameAccount(BASE_G, OTHER_G)).toBe(false);
  });

  it("returns false when comparing a contract id against a G address", () => {
    expect(isSameAccount(CONTRACT_ID, BASE_G)).toBe(false);
  });

  it("returns false for empty or nullish inputs", () => {
    expect(isSameAccount("", BASE_G)).toBe(false);
    expect(isSameAccount(BASE_G, "")).toBe(false);
    expect(isSameAccount(undefined, BASE_G)).toBe(false);
    expect(isSameAccount(BASE_G, undefined)).toBe(false);
    expect(isSameAccount("", "")).toBe(false);
  });
});

describe("encodeSep53Message", () => {
  test("should encode a simple ascii message", () => {
    const message = "Hello, World!";
    const expected = "1S61nAa7UQ0GWZf/kwdwaO7QpIbCAhW14C4asNLr6l8=";
    expect(xdr.encodeBytes(encodeSep53Message(message), "base64")).toEqual(
      expected,
    );
  });
});

describe("toSignatureBuffer", () => {
  const signature = Buffer.from("a-signature-from-a-device");

  test("should pass a Buffer through untouched", () => {
    expect(toSignatureBuffer(signature)).toBe(signature);
  });

  test("should decode a base64 signature from a hardware wallet", () => {
    expect(toSignatureBuffer(signature.toString("base64"))).toEqual(signature);
  });

  test("should round-trip back to the same base64 either way", () => {
    const base64 = signature.toString("base64");
    expect(toSignatureBuffer(base64).toString("base64")).toEqual(base64);
    expect(toSignatureBuffer(signature).toString("base64")).toEqual(base64);
  });
});

describe("getTrustlineChangesForAccount", () => {
  const selected = Keypair.random().publicKey();
  const other = Keypair.random().publicKey();
  const issuer = Keypair.random().publicKey();
  const aqua = new Asset("AQUA", issuer);
  const usdc = new Asset("USDC", issuer);

  const buildTx = (source: string, ops: xdr.Operation[]) => {
    const builder = new TransactionBuilder(new Account(source, "1"), {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    });
    ops.forEach((op) => builder.addOperation(op));
    return builder.setTimeout(0).build();
  };

  it("uses the tx source when the op has no source", () => {
    const tx = buildTx(selected, [Operation.changeTrust({ asset: aqua })]);
    expect(getTrustlineChangesForAccount(tx, selected)).toHaveLength(1);
    expect(getTrustlineChangesForAccount(tx, other)).toHaveLength(0);
  });

  it("drops the trustline changes of other accounts", () => {
    const tx = buildTx(selected, [
      Operation.changeTrust({ asset: aqua }),
      Operation.changeTrust({ asset: aqua, source: other }),
      Operation.payment({
        destination: other,
        asset: Asset.native(),
        amount: "1",
      }),
    ]);
    const changes = getTrustlineChangesForAccount(tx, selected);
    expect(changes).toHaveLength(1);
    expect(changes[0].source).toBeUndefined();

    const otherChanges = getTrustlineChangesForAccount(tx, other);
    expect(otherChanges).toHaveLength(1);
    expect(otherChanges[0].source).toBe(other);
  });

  it("uses the op source when it differs from the tx source", () => {
    const tx = buildTx(other, [
      Operation.changeTrust({ asset: aqua }),
      Operation.changeTrust({ asset: usdc, source: selected }),
    ]);
    const changes = getTrustlineChangesForAccount(tx, selected);
    expect(changes).toHaveLength(1);
    expect((changes[0].line as Asset).code).toBe("USDC");
  });

  it("matches a muxed op source to its base account", () => {
    const muxed = new MuxedAccount(new Account(selected, "1"), "7").accountId();
    const tx = buildTx(other, [
      Operation.changeTrust({ asset: aqua, source: muxed }),
    ]);
    expect(getTrustlineChangesForAccount(tx, selected)).toHaveLength(1);
  });

  it("reads the inner transaction of a fee bump", () => {
    const inner = buildTx(selected, [
      Operation.changeTrust({ asset: aqua }),
      Operation.changeTrust({ asset: usdc, source: other }),
    ]);
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      Keypair.random(),
      "200",
      inner,
      Networks.TESTNET,
    );
    const changes = getTrustlineChangesForAccount(feeBump, selected);
    expect(changes).toHaveLength(1);
    expect((changes[0].line as Asset).code).toBe("AQUA");
  });
});
