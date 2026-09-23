import { Address, MuxedAccount, nativeToScVal, rpc, xdr } from "stellar-sdk";
import {
  TESTNET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import {
  createSoranReader,
  decodeSoranDestination,
  normalizeSoranName,
  resolveSoranName,
  verifySoranDestination,
  SORAN_TESTNET_LOOKUP,
} from "../soran";
import fixtures from "./fixtures/soran-destinations.json";

jest.mock("../localizationConfig", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

const value = (id: string) =>
  xdr.ScVal.fromXDR(
    fixtures.valid.find((item) => item.id === id)!.xdrBase64,
    "base64",
  );

describe("Soran destination conformance", () => {
  it.each(fixtures.valid)(
    "decodes $id without losing routing information",
    (fixture) => {
      const destination = decodeSoranDestination(
        xdr.ScVal.fromXDR(fixture.xdrBase64, "base64"),
      );
      if (fixture.expectedMuxed) {
        const muxed = MuxedAccount.fromAddress(destination.address, "0");
        expect(muxed.baseAccount().accountId()).toBe(
          fixture.expectedMuxed.account,
        );
        expect(muxed.id()).toBe(fixture.expectedMuxed.id);
        expect(destination.memo).toBe("");
        expect(destination.memoType).toBe("");
      } else {
        expect(destination).toEqual(fixture.expectedDestination);
      }
    },
  );
  it.each(fixtures.invalid)("rejects $id", (fixture) => {
    expect(() =>
      decodeSoranDestination(xdr.ScVal.fromXDR(fixture.xdrBase64, "base64")),
    ).toThrow();
  });
});

describe("Soran name normalization", () => {
  it.each([" Alice.Nova ", "ALICE.NOVA", "alice.nova"])(
    "normalizes %s",
    (input) => {
      expect(normalizeSoranName(input)).toBe("alice.nova");
    },
  );
  it.each([
    "alice",
    "alice..nova",
    "a.b.c",
    "-alice.nova",
    "alice-.nova",
    "alice._nova",
    "al ice.nova",
    "аlice.nova",
    "K.nova",
    "https://alice.nova",
    `${"a".repeat(64)}.nova`,
    "alice*example.com",
  ])("rejects %s", (input) => {
    expect(normalizeSoranName(input)).toBeNull();
  });
  it("accepts boundary label lengths and interior hyphens", () => {
    expect(normalizeSoranName(`a.${"b".repeat(63)}`)).not.toBeNull();
    expect(normalizeSoranName("a-b.nova")).toBe("a-b.nova");
  });
});

describe("direct Soroban reads", () => {
  const registry = "CCSORANDPQINYOYB5SVO45WJP2LBBYKC72HHUIRVXB4J6RUZKDAUW7G4";
  const success = (retval: xdr.ScVal) =>
    ({
      id: "read",
      latestLedger: 1,
      events: [],
      transactionData: {},
      minResourceFee: "0",
      result: { retval, auth: [] },
    }) as unknown as rpc.Api.SimulateTransactionResponse;
  let simulate: jest.SpyInstance;
  let send: jest.SpyInstance;
  beforeEach(() => {
    simulate = jest
      .spyOn(rpc.Server.prototype, "simulateTransaction")
      .mockImplementation(async (transaction) => {
        const operation = transaction.operations[0];
        if (
          operation.type !== "invokeHostFunction" ||
          operation.func.type !== "hostFunctionTypeInvokeContract"
        )
          throw new Error("unexpected operation");
        const args = operation.func.invokeContract;
        expect(Address.fromScAddress(args.contractAddress).toString()).toBe(
          SORAN_TESTNET_LOOKUP,
        );
        const method = args.functionName.toString();
        if (method === "registry")
          return success(new Address(registry).toScVal());
        if (method === "version" || method === "destination_version")
          return success(nativeToScVal(2, { type: "u32" }));
        expect(method).toBe("resolve_destination");
        expect(args.args).toEqual([
          nativeToScVal("alice.nova", { type: "string" }),
        ]);
        expect(transaction.signatures).toHaveLength(0);
        return success(value("direct-g-id-max"));
      });
    send = jest.spyOn(rpc.Server.prototype, "sendTransaction");
  });
  afterEach(() => jest.restoreAllMocks());
  it("reads the selected RPC without signing or submitting", async () => {
    const result = await resolveSoranName(
      " Alice.Nova ",
      TESTNET_NETWORK_DETAILS,
    );
    expect(result).toMatchObject({
      name: "alice.nova",
      memo: "18446744073709551615",
      memoType: "id",
    });
    expect(simulate).toHaveBeenCalledTimes(4);
    expect(simulate.mock.calls.every((call) => call[3] === false)).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects unsupported networks before any RPC call", async () => {
    await expect(
      resolveSoranName("alice.nova", MAINNET_NETWORK_DETAILS),
    ).rejects.toThrow("only available on Testnet");
    expect(simulate).not.toHaveBeenCalled();
  });
  it("requires an RPC URL", async () => {
    await expect(
      resolveSoranName("alice.nova", {
        ...TESTNET_NETWORK_DETAILS,
        sorobanRpcUrl: undefined,
      }),
    ).rejects.toThrow("RPC URL");
    expect(simulate).not.toHaveBeenCalled();
  });
  it("rejects an incorrect registry anchor", async () => {
    simulate.mockResolvedValueOnce(
      success(new Address(SORAN_TESTNET_LOOKUP).toScVal()),
    );
    await expect(
      resolveSoranName("alice.nova", TESTNET_NETWORK_DETAILS),
    ).rejects.toThrow("Unable to resolve");
    expect(simulate).toHaveBeenCalledTimes(3);
  });
  it.each([
    { error: "Error(Contract, #7)" },
    { error: "transport unavailable" },
    { restorePreamble: { minResourceFee: "100", transactionData: {} } },
  ])("fails closed on unavailable state: %j", async (result) => {
    simulate.mockResolvedValueOnce({
      ...success(value("direct-g-none")),
      ...result,
    });
    await expect(
      resolveSoranName("alice.nova", TESTNET_NETWORK_DETAILS),
    ).rejects.toThrow("Unable to resolve");
    expect(simulate).toHaveBeenCalledTimes(3);
  });
  it("rejects a required memo that was removed before sending", async () => {
    await expect(
      verifySoranDestination(
        "alice.nova",
        {
          address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
          memo: "",
          memoType: "",
        },
        TESTNET_NETWORK_DETAILS,
      ),
    ).rejects.toThrow("payment details changed");
  });
});

describe("Soran RPC transport timeout", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each(["resolve_destination", "primary_names"])(
    "aborts a stalled %s request after 20 seconds, not 20 milliseconds",
    async (method) => {
      // Make native timeout signals controllable by Jest's clock.
      jest.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
        const controller = new AbortController();
        setTimeout(
          () => controller.abort(new DOMException("Timed out", "TimeoutError")),
          milliseconds,
        );
        return controller.signal;
      });
      const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener("abort", () =>
              reject(options.signal?.reason),
            );
          }),
      );
      // Exercise the real SDK HTTP transport; only the network is stubbed.
      const read = createSoranReader(TESTNET_NETWORK_DETAILS);
      const rejected = jest.fn();
      const result = read(method).catch(rejected);
      await jest.advanceTimersByTimeAsync(19_999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(rejected).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      expect(rejected).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/timeout of 20000\s?ms exceeded/),
        }),
      );
      await result;
    },
  );
});
