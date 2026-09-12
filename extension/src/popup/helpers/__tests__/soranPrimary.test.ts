import {
  Account,
  Address,
  MuxedAccount,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "stellar-sdk";
import {
  TESTNET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import {
  decodeSoranPrimaryBatch,
  encodeSoranIdentity,
  getSoranPrimaryName,
  readSoranPrimaryNames,
} from "../soranPrimary";

jest.mock("../localizationConfig", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));
const G = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const muxed = (id: string) =>
  new MuxedAccount(new Account(G, "0"), id).accountId();
const sym = (tag: string) => nativeToScVal(tag, { type: "symbol" });
const item = (tag: string, ...args: xdr.ScVal[]) =>
  nativeToScVal([sym(tag), ...args]);
const named = (name: string) =>
  item("Name", nativeToScVal(name, { type: "string" }));
const batch = (results: xdr.ScVal[]) =>
  nativeToScVal(
    {
      ledger: nativeToScVal(100, { type: "u32" }),
      results: nativeToScVal(results),
      timestamp: nativeToScVal(BigInt(1000), { type: "u64" }),
    },
    {
      type: {
        ledger: ["symbol", null],
        results: ["symbol", null],
        timestamp: ["symbol", null],
      },
    },
  );
const success = (retval: xdr.ScVal) =>
  ({
    id: "read",
    latestLedger: 1,
    events: [],
    transactionData: {},
    minResourceFee: "0",
    result: { retval, auth: [] },
  }) as unknown as rpc.Api.SimulateTransactionResponse;

it("encodes G and the full uint64 muxed identity distinctly", () => {
  expect(scValToNative(encodeSoranIdentity(G))).toEqual(["Direct", G]);
  expect(
    scValToNative(encodeSoranIdentity(muxed("18446744073709551615"))),
  ).toEqual(["Muxed", { account: G, id: BigInt("18446744073709551615") }]);
  expect(() => encodeSoranIdentity("bad")).toThrow();
});

it("preserves ordered names, absence, and unknown per-item failures", () => {
  expect(
    decodeSoranPrimaryBatch(
      batch([
        named("alice.anynamespace"),
        item("None"),
        item("Failed", nativeToScVal(999, { type: "u32" })),
      ]),
      3,
    ),
  ).toEqual([
    {
      status: "name",
      name: "alice.anynamespace",
      ledger: 100,
      timestamp: "1000",
    },
    { status: "none", ledger: 100, timestamp: "1000" },
    { status: "failed", code: 999 },
  ]);
});
it.each([
  item("Name", nativeToScVal("Alice.nova", { type: "string" })),
  item("Name", nativeToScVal("аlice.nova", { type: "string" })),
  item("Name", sym("alice.nova")),
  item("None", sym("extra")),
  item("Failed", nativeToScVal(0, { type: "u32" })),
  item("Failed", nativeToScVal(5, { type: "u64" })),
  nativeToScVal(null),
  item("Unknown"),
])("rejects malformed result %#", (value) => {
  expect(() => decodeSoranPrimaryBatch(batch([value]), 1)).toThrow();
});
it("rejects partial result counts", () => {
  expect(() => decodeSoranPrimaryBatch(batch([item("None")]), 2)).toThrow();
});

describe("Universal Lookup batches", () => {
  let simulate: jest.SpyInstance;
  let primary: jest.Mock;
  let capability: number;
  beforeEach(() => {
    capability = 3;
    primary = jest.fn((identities: unknown[]) =>
      success(batch(identities.map(() => named("alice.nova")))),
    );
    simulate = jest
      .spyOn(rpc.Server.prototype, "simulateTransaction")
      .mockImplementation(async (transaction) => {
        expect(transaction.signatures).toHaveLength(0);
        const op = transaction.operations[0];
        if (
          op.type !== "invokeHostFunction" ||
          op.func.type !== "hostFunctionTypeInvokeContract"
        )
          throw new Error("bad invocation");
        const invocation = op.func.invokeContract;
        const method = invocation.functionName.toString();
        if (method === "registry")
          return success(
            new Address(
              "CCSORANDPQINYOYB5SVO45WJP2LBBYKC72HHUIRVXB4J6RUZKDAUW7G4",
            ).toScVal(),
          );
        if (method === "primary_names")
          return primary(scValToNative(invocation.args[0]));
        const value =
          method === "batch_read_version"
            ? capability
            : method === "primary_batch_limit"
              ? 16
              : method === "muxed_identity_version"
                ? 1
                : 2;
        return success(nativeToScVal(value, { type: "u32" }));
      });
  });
  afterEach(() => jest.restoreAllMocks());
  it("uses the deployed batch limit and only unsigned simulations", async () => {
    const send = jest.spyOn(rpc.Server.prototype, "sendTransaction");
    expect(
      await readSoranPrimaryNames(Array(17).fill(G), TESTNET_NETWORK_DETAILS),
    ).toHaveLength(17);
    expect(primary.mock.calls.map(([rows]) => rows.length)).toEqual([16, 1]);
    expect(simulate.mock.calls.every((args) => args[3] === false)).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });
  it("halves only leading host budget errors", async () => {
    primary.mockImplementation((rows) =>
      rows.length > 1
        ? { error: "HostError: Error(Budget, ExceededLimit)\nEvent log..." }
        : success(batch([item("None")])),
    );
    expect(
      (
        await readSoranPrimaryNames(
          [G, muxed("1"), muxed("2")],
          TESTNET_NETWORK_DETAILS,
        )
      ).map((r) => r.status),
    ).toEqual(["none", "none", "none"]);
    expect(primary.mock.calls.map(([rows]) => rows.length)).toEqual([
      3, 2, 1, 1, 1,
    ]);
  });
  it.each([
    { error: "HostError: Error(Contract, #12)\nBudget, ExceededLimit" },
    { error: "transport unavailable" },
    { error: "HostError: Error(Budget, ExceededLimit)" },
  ])("preserves singleton/top-level failures", async (error) => {
    primary.mockReturnValue(error);
    expect(await readSoranPrimaryNames([G], TESTNET_NETWORK_DETAILS)).toEqual([
      { status: "failed" },
    ]);
    expect(primary).toHaveBeenCalledTimes(1);
  });
  it("rejects unsupported networks and capabilities", async () => {
    await expect(
      readSoranPrimaryNames([G], MAINNET_NETWORK_DETAILS),
    ).rejects.toThrow();
    expect(simulate).not.toHaveBeenCalled();
    capability = 1;
    await expect(
      readSoranPrimaryNames([G], TESTNET_NETWORK_DETAILS),
    ).rejects.toThrow();
    expect(primary).not.toHaveBeenCalled();
  });
  it("coalesces duplicates and caches full identities separately", async () => {
    const network = {
      ...TESTNET_NETWORK_DETAILS,
      sorobanRpcUrl: "https://cache-test.invalid",
    };
    const a = getSoranPrimaryName(G, network);
    expect(getSoranPrimaryName(G, network)).toBe(a);
    const b = getSoranPrimaryName(muxed("42"), network);
    await Promise.all([a, b]);
    expect(primary).toHaveBeenCalledTimes(1);
    expect(primary.mock.calls[0][0]).toEqual([
      ["Direct", G],
      ["Muxed", { account: G, id: BigInt(42) }],
    ]);
    expect(await getSoranPrimaryName(G, network)).toMatchObject({
      status: "name",
    });
    expect(primary).toHaveBeenCalledTimes(1);
    await getSoranPrimaryName(G, {
      ...network,
      sorobanRpcUrl: "https://another-test.invalid",
    });
    expect(primary).toHaveBeenCalledTimes(2);
  });
});
