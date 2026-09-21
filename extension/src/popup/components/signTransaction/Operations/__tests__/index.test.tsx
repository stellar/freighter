import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  OperationRecord,
  StrKey,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";

import { makeDummyStore } from "popup/__testHelpers__";
import { Operations } from "../index";

// setOptions never triggers the asset scanner, but mock it so the component's
// effect can never reach the network in the test environment.
jest.mock("popup/helpers/blockaid", () => ({
  scanAsset: jest.fn().mockResolvedValue(undefined),
}));

// A contract-call render looks up the contract spec to label its parameters.
// There is no network here, so fail the lookup — the component falls back to
// unlabelled positional parameters, which is what we are asserting on.
jest.mock("@shared/api/internal", () => ({
  getContractSpec: jest.fn().mockRejectedValue(new Error("no spec in tests")),
}));

// Build a setOptions transaction with the bundled SDK, serialize it to XDR and
// decode it back — the exact path Freighter uses to obtain the operation object
// it renders on the signing-approval screen. A present-but-zero Uint32 field
// (e.g. masterWeight: 0) decodes to the JS number 0.
// Valid ed25519 strkeys minted from fixed bytes — avoids curve math (and the
// crypto RNG, which is unavailable in this test environment).
const SOURCE_KEY = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 1));
const ADDED_SIGNER = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 7));

type SetOptionsOptions = Parameters<typeof Operation.setOptions>[0];

const decodeOperation = (operation: xdr.Operation) => {
  const account = new Account(SOURCE_KEY, "0");
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(operation)
    .setTimeout(0)
    .build();

  return TransactionBuilder.fromXdr(tx.toXdr(), Networks.TESTNET)
    .operations as Operation[];
};

const decodeSetOptions = (options: SetOptionsOptions) =>
  decodeOperation(Operation.setOptions(options));

const renderOps = (operations: Operation[]) =>
  render(
    <Provider store={makeDummyStore({})}>
      <Operations
        flaggedKeys={{}}
        isMemoRequired={false}
        operations={operations as unknown as OperationRecord[]}
      />
    </Provider>,
  );

// Read the value rendered next to a given operation-detail label.
const rowValue = (key: string) => {
  const keyEl = screen
    .getAllByTestId("OperationKeyVal__key")
    .find((el) => el.textContent === key);
  return keyEl?.parentElement
    ?.querySelector('[data-testid="OperationKeyVal__value"]')
    ?.textContent?.trim();
};

// Whether an operation-detail row with the given label was rendered at all.
const hasKey = (key: string) =>
  screen
    .getAllByTestId("OperationKeyVal__key")
    .some((el) => el.textContent === key);

const MASTER_KEY_WARNING = /disables your account's master key/i;

describe("Operations — setOptions field visibility", () => {
  it("decoder yields numeric 0 (falsy) for masterWeight/thresholds", () => {
    const [op] = decodeSetOptions({
      masterWeight: 0,
      lowThreshold: 0,
      medThreshold: 0,
      highThreshold: 0,
    }) as any[];

    expect(op.masterWeight).toBe(0);
    expect(op.lowThreshold).toBe(0);
    expect(op.medThreshold).toBe(0);
    expect(op.highThreshold).toBe(0);
  });

  it("renders masterWeight 0, zeroed thresholds, and a signer change, with a master-key warning", () => {
    renderOps(
      decodeSetOptions({
        masterWeight: 0,
        lowThreshold: 0,
        medThreshold: 0,
        highThreshold: 0,
        signer: { ed25519PublicKey: ADDED_SIGNER, weight: 1 },
      }),
    );

    expect(screen.getByText("Set Options")).toBeInTheDocument();
    expect(screen.getByText("Signer")).toBeInTheDocument();
    expect(rowValue("Master Weight")).toBe("0");
    expect(rowValue("High Threshold")).toBe("0");
    expect(rowValue("Medium Threshold")).toBe("0");
    expect(rowValue("Low Threshold")).toBe("0");
    expect(screen.getByText(MASTER_KEY_WARNING)).toBeInTheDocument();
  });

  it("renders masterWeight 0 on its own with the warning, never an empty operation", () => {
    renderOps(decodeSetOptions({ masterWeight: 0 }));

    expect(rowValue("Master Weight")).toBe("0");
    expect(screen.getByText(MASTER_KEY_WARNING)).toBeInTheDocument();
  });

  it("non-zero masterWeight/threshold render and do not warn", () => {
    renderOps(decodeSetOptions({ masterWeight: 2, highThreshold: 3 }));

    expect(rowValue("Master Weight")).toBe("2");
    expect(rowValue("High Threshold")).toBe("3");
    expect(screen.queryByText(MASTER_KEY_WARNING)).not.toBeInTheDocument();
  });

  it("HOME DOMAIN: clearing the home domain is surfaced as a status badge, not hidden", () => {
    renderOps(decodeSetOptions({ homeDomain: "" }));

    expect(rowValue("Home Domain")).toBe("Cleared");
    expect(screen.getByText("Cleared").closest(".Badge")).not.toBeNull();
  });

  it("FLAGS: a single-bit setFlags decodes to its label", () => {
    renderOps(decodeSetOptions({ setFlags: 1 }));

    expect(rowValue("Set Flags")).toBe("Authorization Required");
  });

  it("FLAGS: a combined setFlags bitmask decodes every set bit, not a blank value", () => {
    // REVOCABLE (2) | CLAWBACK (8) = 10. The SDK types setFlags as a single
    // AuthFlag, but the wire format is a bitmask — cast to exercise that.
    renderOps(decodeSetOptions({ setFlags: 10 as any }));

    expect(rowValue("Set Flags")).toBe(
      "Authorization Revocable, Authorization Clawback Enabled",
    );
  });

  it("FLAGS: a known bit combined with an unrecognized bit surfaces both", () => {
    // REQUIRED (1) | future-bit (16) = 17 — the unknown bit must not be hidden.
    renderOps(decodeSetOptions({ setFlags: 17 as any }));

    // The mocked t() does not interpolate, so {{bits}} stays literal here.
    expect(rowValue("Set Flags")).toBe(
      "Authorization Required, Unknown ({{bits}})",
    );
  });

  it("FLAGS: a combined clearFlags bitmask decodes every set bit", () => {
    // REQUIRED (1) | REVOCABLE (2) = 3
    renderOps(decodeSetOptions({ clearFlags: 3 as any }));

    expect(rowValue("Clear Flags")).toBe(
      "Authorization Required, Authorization Revocable",
    );
  });
});

describe("Operations — manageData value visibility", () => {
  it("renders a set value", () => {
    renderOps(
      decodeOperation(Operation.manageData({ name: "k", value: "hi" })),
    );

    expect(rowValue("Value")).toBe("hi");
  });

  it("renders the Value row for an empty value rather than hiding it", () => {
    renderOps(decodeOperation(Operation.manageData({ name: "k", value: "" })));

    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(rowValue("Value")).toBe("");
  });

  it("surfaces a deletion as a status badge when value is absent ", () => {
    renderOps(
      decodeOperation(Operation.manageData({ name: "k", value: null })),
    );

    expect(rowValue("Value")).toBe("Deleted");
    expect(screen.getByText("Deleted").closest(".Badge")).not.toBeNull();
  });
});

describe("Operations — setTrustLineFlags visibility", () => {
  const TRUSTOR = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 3));
  const ASSET = new Asset(
    "USDC",
    StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 9)),
  );

  const decodeSetTrustLineFlags = (flags: {
    authorized?: boolean;
    authorizedToMaintainLiabilities?: boolean;
    clawbackEnabled?: boolean;
  }) =>
    decodeOperation(
      Operation.setTrustLineFlags({ trustor: TRUSTOR, asset: ASSET, flags }),
    );

  it("renders a flag being enabled", () => {
    renderOps(decodeSetTrustLineFlags({ authorized: true }));

    expect(rowValue("Authorized")).toBe("Enabled");
  });

  it("renders a flag being cleared (set to false), not hidden", () => {
    renderOps(decodeSetTrustLineFlags({ authorized: false }));

    expect(rowValue("Authorized")).toBe("Disabled");
  });

  it("does not render a flag that is left unchanged", () => {
    renderOps(decodeSetTrustLineFlags({ clawbackEnabled: false }));

    expect(
      screen
        .getAllByTestId("OperationKeyVal__key")
        .some((el) => el.textContent === "Authorized"),
    ).toBe(false);
    expect(rowValue("Clawback Enabled")).toBe("Disabled");
  });

  it("renders the asset issuer alongside the asset code", () => {
    renderOps(decodeSetTrustLineFlags({ authorized: true }));

    expect(rowValue("Asset Code")).toBe("USDC");
    expect(hasKey("Asset Issuer")).toBe(true);
  });
});

describe("Operations — clawback asset identity", () => {
  const FROM = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 5));
  const ASSET = new Asset(
    "USDC",
    StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 9)),
  );

  it("renders the asset issuer alongside the asset code", () => {
    renderOps(
      decodeOperation(
        Operation.clawback({ asset: ASSET, amount: "100", from: FROM }),
      ),
    );

    expect(rowValue("Asset Code")).toBe("USDC");
    expect(hasKey("Asset Issuer")).toBe(true);
  });
});

describe("Operations — Soroban contract-call parameters", () => {
  const CONTRACT = StrKey.encodeContract(Buffer.alloc(32, 3));

  const invokeContract = (args: xdr.ScVal[], functionName = "configure") =>
    decodeOperation(
      Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: new Address(CONTRACT).toScAddress(),
            functionName: Buffer.from(functionName),
            args,
          }),
        ),
        auth: [],
      }),
    );

  const mapEntry = (key: xdr.ScVal, val: xdr.ScVal) =>
    new xdr.ScMapEntry({ key, val });

  it("renders every entry of a struct-keyed map, not just the last one", async () => {
    const structKey = (id: number) =>
      xdr.ScVal.scvMap([
        mapEntry(xdr.ScVal.scvSymbol("id"), xdr.ScVal.scvU32(id)),
      ]);
    const mapArg = xdr.ScVal.scvMap(
      [0, 1, 2, 3].map((id) =>
        mapEntry(structKey(id), xdr.ScVal.scvString(`v${id}`)),
      ),
    );

    renderOps(invokeContract([mapArg]));

    const params = await screen.findByTestId("OperationParameters");
    // Decoding this map to a JS object collapsed all four signed entries into
    // a single `[object Object]` key.
    expect(params.textContent).toContain('{ id: 0 }: "v0"');
    expect(params.textContent).toContain('{ id: 1 }: "v1"');
    expect(params.textContent).toContain('{ id: 2 }: "v2"');
    expect(params.textContent).toContain('{ id: 3 }: "v3"');
    expect(params.textContent).not.toContain("[object Object]");
  });

  it("renders both entries of a map whose keys collide as strings", async () => {
    const mapArg = xdr.ScVal.scvMap([
      mapEntry(xdr.ScVal.scvU64(BigInt(1)), xdr.ScVal.scvString("from-u64")),
      mapEntry(xdr.ScVal.scvString("1"), xdr.ScVal.scvString("from-string")),
    ]);

    renderOps(invokeContract([mapArg]));

    const params = await screen.findByTestId("OperationParameters");
    expect(params.textContent).toContain('1: "from-u64"');
    expect(params.textContent).toContain('"1": "from-string"');
  });

  it("renders a non-UTF-8 string argument as labelled hex", async () => {
    const stringArg = xdr.ScVal.scvString(
      new Uint8Array([...Buffer.from("alice"), 0xff]),
    );

    renderOps(invokeContract([stringArg]));

    const params = await screen.findByTestId("OperationParameters");
    expect(params.textContent).toContain("string(0x616c696365ff)");
    expect(params.textContent).not.toContain("�");
  });
});
