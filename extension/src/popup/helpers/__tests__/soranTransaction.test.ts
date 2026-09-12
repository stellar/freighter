import {
  Account,
  Address,
  Asset,
  Contract,
  Keypair,
  Memo,
  MuxedAccount,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  xdr,
} from "stellar-sdk";
import { TESTNET_NETWORK_DETAILS as network } from "@shared/constants/stellar";
import { assertSoranTransactionRoute } from "../soranTransaction";

const payer = Keypair.random().publicKey();
const recipient = Keypair.random().publicKey();
const other = Keypair.random().publicKey();
const muxed = new MuxedAccount(
  new Account(recipient, "0"),
  "18446744073709551615",
).accountId();
const contract = Asset.native().contractId(network.networkPassphrase);
const context = { publicKey: payer, asset: "native" };
const route = (address = recipient, memo = "", memoType = "") => ({
  address,
  memo,
  memoType,
});
const payment = (destination = recipient, source?: string) =>
  Operation.payment({
    destination,
    source,
    asset: Asset.native(),
    amount: "1",
  });
const build = (
  op = payment(),
  memo: Memo = Memo.none(),
  source = payer,
  extra?: xdr.Operation,
) => {
  const builder = new TransactionBuilder(new Account(source, "0"), {
    fee: "100",
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(op)
    .addMemo(memo)
    .setTimeout(0);
  if (extra) builder.addOperation(extra);
  return builder.build();
};
const transfer = (
  to = recipient,
  from = payer,
  id = contract,
  fn = "transfer",
  value = nativeToScVal(BigInt(10), { type: "i128" }),
) =>
  new Contract(id).call(
    fn,
    new Address(from).toScVal(),
    new Address(to).toScVal(),
    value,
  );

it.each([recipient, muxed])(
  "accepts a complete classic destination and derives the history hash: %s",
  (destination) => {
    const tx = build(payment(destination));
    expect(
      assertSoranTransactionRoute(
        tx.toXDR(),
        route(destination),
        network,
        context,
      ),
    ).toEqual({
      destination,
      memo: "",
      memoType: "none",
      networkPassphrase: network.networkPassphrase,
      transactionHash: Buffer.from(tx.hash()).toString("hex"),
    });
  },
);
it.each([
  ["text", "hello", Memo.text("hello"), Memo.text("other")],
  ["id", "18446744073709551615", Memo.id("18446744073709551615"), Memo.id("0")],
  [
    "hash",
    Buffer.alloc(32, 7).toString("base64"),
    Memo.hash(Buffer.alloc(32, 7)),
    Memo.hash(Buffer.alloc(32, 8)),
  ],
] as const)("preserves the exact %s memo", (type, value, memo, alteredMemo) => {
  expect(() =>
    assertSoranTransactionRoute(
      build(payment(), memo).toXDR(),
      route(recipient, value, type),
      network,
      context,
    ),
  ).not.toThrow();
  expect(() =>
    assertSoranTransactionRoute(
      build().toXDR(),
      route(recipient, value, type),
      network,
      context,
    ),
  ).toThrow(/does not match/);
  expect(() =>
    assertSoranTransactionRoute(
      build(payment(), alteredMemo).toXDR(),
      route(recipient, value, type),
      network,
      context,
    ),
  ).toThrow(/does not match/);
});
it.each([
  ["different recipient", () => build(payment(other))],
  ["different source", () => build(payment(), Memo.none(), other)],
  ["operation source override", () => build(payment(recipient, other))],
  [
    "additional operation",
    () => build(payment(), Memo.none(), payer, payment(other)),
  ],
  ["unexpected memo", () => build(payment(), Memo.text("extra"))],
  ["wrong memo type", () => build(payment(), Memo.text("123"))],
] as const)("rejects %s", (_, tx) => {
  expect(() =>
    assertSoranTransactionRoute(tx().toXDR(), route(), network, context),
  ).toThrow(/does not match/);
});
it("rejects a typed memo with the right value but wrong type", () => {
  expect(() =>
    assertSoranTransactionRoute(
      build(payment(), Memo.text("123")).toXDR(),
      route(recipient, "123", "id"),
      network,
      context,
    ),
  ).toThrow();
});
it("rejects muxed ID loss or substitution, including createAccount", () => {
  for (const op of [
    payment(recipient),
    payment(new MuxedAccount(new Account(recipient, "0"), "1").accountId()),
    Operation.createAccount({ destination: recipient, startingBalance: "10" }),
  ]) {
    expect(() =>
      assertSoranTransactionRoute(
        build(op).toXDR(),
        route(muxed),
        network,
        context,
      ),
    ).toThrow();
  }
  expect(() =>
    assertSoranTransactionRoute(
      build(
        Operation.createAccount({
          destination: recipient,
          startingBalance: "10",
        }),
      ).toXDR(),
      route(),
      network,
      context,
    ),
  ).not.toThrow();
});
it.each([recipient, muxed])(
  "accepts contract transfer preserving destination %s",
  (destination) => {
    expect(() =>
      assertSoranTransactionRoute(
        build(transfer(destination)).toXDR(),
        route(destination),
        network,
        context,
      ),
    ).not.toThrow();
  },
);
it.each([
  ["different destination", () => transfer(other)],
  ["different sender", () => transfer(recipient, other)],
  [
    "different contract",
    () =>
      transfer(
        recipient,
        payer,
        new Asset("USD", other).contractId(network.networkPassphrase),
      ),
  ],
  ["different method", () => transfer(recipient, payer, contract, "approve")],
  [
    "wrong amount type",
    () =>
      transfer(
        recipient,
        payer,
        contract,
        "transfer",
        nativeToScVal(10, { type: "u32" }),
      ),
  ],
] as const)("rejects contract %s", (_, op) => {
  expect(() =>
    assertSoranTransactionRoute(build(op()).toXDR(), route(), network, context),
  ).toThrow();
});
it("checks a collectible's contract, token ID, and full route", () => {
  const nftContext = {
    ...context,
    isCollectible: true,
    collectionAddress: contract,
    tokenId: 42,
  };
  const nft = (to: string, tokenId: number) =>
    build(
      transfer(
        to,
        payer,
        contract,
        "transfer",
        nativeToScVal(tokenId, { type: "u32" }),
      ),
    ).toXDR();
  expect(() =>
    assertSoranTransactionRoute(
      nft(recipient, 42),
      route(),
      network,
      nftContext,
    ),
  ).not.toThrow();
  expect(() =>
    assertSoranTransactionRoute(
      nft(recipient, 43),
      route(),
      network,
      nftContext,
    ),
  ).toThrow();
  expect(() =>
    assertSoranTransactionRoute(
      nft(muxed, 42),
      route(muxed),
      network,
      nftContext,
    ),
  ).toThrow();
});
it("rejects malformed envelopes and fee bumps", () => {
  expect(() =>
    assertSoranTransactionRoute("invalid", route(), network, context),
  ).toThrow(/does not match/);
  const bump = TransactionBuilder.buildFeeBumpTransaction(
    payer,
    "100",
    build(),
    network.networkPassphrase,
  );
  expect(() =>
    assertSoranTransactionRoute(bump.toXDR(), route(), network, context),
  ).toThrow();
});

describe.each(["TOKEN", "foo:bar", "foo:bar:baz"])(
  "contract token symbol %s",
  (symbol) => {
    const tokenContext = { ...context, asset: `${symbol}:${contract}` };

    it("accepts a transfer through the exact contract", () => {
      expect(() =>
        assertSoranTransactionRoute(
          build(transfer()).toXDR(),
          route(),
          network,
          tokenContext,
        ),
      ).not.toThrow();
    });

    it("rejects a transfer through a different contract", () => {
      const wrongContract = new Asset("USD", other).contractId(
        network.networkPassphrase,
      );
      expect(() =>
        assertSoranTransactionRoute(
          build(transfer(recipient, payer, wrongContract)).toXDR(),
          route(),
          network,
          tokenContext,
        ),
      ).toThrow(/does not match/);
    });

    it.each([
      ["payment", () => payment()],
      [
        "pathPaymentStrictSend",
        () =>
          Operation.pathPaymentStrictSend({
            sendAsset: Asset.native(),
            sendAmount: "1",
            destination: recipient,
            destAsset: Asset.native(),
            destMin: "1",
            path: [],
          }),
      ],
      [
        "pathPaymentStrictReceive",
        () =>
          Operation.pathPaymentStrictReceive({
            sendAsset: Asset.native(),
            sendMax: "1",
            destination: recipient,
            destAsset: Asset.native(),
            destAmount: "1",
            path: [],
          }),
      ],
      [
        "createAccount",
        () =>
          Operation.createAccount({
            destination: recipient,
            startingBalance: "1",
          }),
      ],
    ] as const)(
      "rejects substitution with %s to the same recipient",
      (_, operation) => {
        expect(() =>
          assertSoranTransactionRoute(
            build(operation()).toXDR(),
            route(),
            network,
            tokenContext,
          ),
        ).toThrow(/does not match/);
      },
    );
  },
);

describe("binding the signed transaction to the reviewed transaction", () => {
  const usd = new Asset("USD", other);
  const pathParams = {
    sendAsset: Asset.native(),
    sendAmount: "1",
    destination: recipient,
    destAsset: usd,
    destMin: "0.9",
    path: [new Asset("EUR", other)],
  };
  const pathPayment = () => Operation.pathPaymentStrictSend(pathParams);

  it.each([
    ["payment", () => payment()],
    ["path payment", pathPayment],
    [
      "account creation",
      () =>
        Operation.createAccount({
          destination: recipient,
          startingBalance: "1",
        }),
    ],
    ["contract transfer", () => transfer()],
  ] as const)(
    "allows only signature additions to a reviewed %s",
    (_, operation) => {
      const tx = build(operation());
      tx.sign(Keypair.random());
      const reviewedXdr = tx.toXDR();
      tx.sign(Keypair.random());

      expect(
        assertSoranTransactionRoute(
          tx.toXDR(),
          route(),
          network,
          context,
          reviewedXdr,
        ).transactionHash,
      ).toBe(Buffer.from(tx.hash()).toString("hex"));
    },
  );

  it.each([
    [
      "amount",
      () =>
        Operation.payment({
          destination: recipient,
          asset: Asset.native(),
          amount: "2",
        }),
    ],
    [
      "asset",
      () =>
        Operation.payment({
          destination: recipient,
          asset: usd,
          amount: "1",
        }),
    ],
    [
      "operation type to account creation",
      () =>
        Operation.createAccount({
          destination: recipient,
          startingBalance: "1",
        }),
    ],
    ["operation type to a path payment", pathPayment],
    ["operation type to a contract transfer", () => transfer()],
  ] as const)("rejects changing the reviewed payment's %s", (_, operation) => {
    expect(() =>
      assertSoranTransactionRoute(
        build(operation()).toXDR(),
        route(),
        network,
        context,
        build().toXDR(),
      ),
    ).toThrow(/does not match/);
  });

  it.each([
    ["send amount", { sendAmount: "2" }],
    ["send asset", { sendAsset: usd }],
    ["destination asset", { destAsset: Asset.native() }],
    ["minimum received amount", { destMin: "0.1" }],
    ["path", { path: [] as Asset[] }],
  ] as const)(
    "rejects changing the reviewed path payment's %s",
    (_, changes) => {
      expect(() =>
        assertSoranTransactionRoute(
          build(
            Operation.pathPaymentStrictSend({ ...pathParams, ...changes }),
          ).toXDR(),
          route(),
          network,
          context,
          build(pathPayment()).toXDR(),
        ),
      ).toThrow(/does not match/);
    },
  );

  it.each([
    ["fee", "200", "0"],
    ["sequence", "100", "1"],
  ] as const)(
    "rejects changing the reviewed transaction's %s",
    (_, fee, sequence) => {
      const changed = new TransactionBuilder(new Account(payer, sequence), {
        fee,
        networkPassphrase: network.networkPassphrase,
      })
        .addOperation(payment())
        .setTimeout(0)
        .build();
      expect(() =>
        assertSoranTransactionRoute(
          changed.toXDR(),
          route(),
          network,
          context,
          build().toXDR(),
        ),
      ).toThrow(/does not match/);
    },
  );

  it("rejects a changed memo even when it matches the current route", () => {
    expect(() =>
      assertSoranTransactionRoute(
        build(payment(), Memo.text("changed")).toXDR(),
        route(recipient, "changed", "text"),
        network,
        context,
        build().toXDR(),
      ),
    ).toThrow(/does not match/);
  });

  it("rejects changing a contract transfer to another positive amount", () => {
    expect(() =>
      assertSoranTransactionRoute(
        build(
          transfer(
            recipient,
            payer,
            contract,
            "transfer",
            nativeToScVal(BigInt(20), { type: "i128" }),
          ),
        ).toXDR(),
        route(),
        network,
        context,
        build(transfer()).toXDR(),
      ),
    ).toThrow(/does not match/);
  });

  it.each([
    ["empty", (): string => ""],
    ["malformed", (): string => "invalid"],
    [
      "fee bump",
      () =>
        TransactionBuilder.buildFeeBumpTransaction(
          payer,
          "100",
          build(),
          network.networkPassphrase,
        ).toXDR(),
    ],
  ] as const)("rejects a supplied %s reviewed transaction", (_, reference) => {
    expect(() =>
      assertSoranTransactionRoute(
        build().toXDR(),
        route(),
        network,
        context,
        reference(),
      ),
    ).toThrow(/does not match/);
  });

  it("rejects strict-receive payments even without a reviewed reference", () => {
    const strictReceive = Operation.pathPaymentStrictReceive({
      sendAsset: Asset.native(),
      sendMax: "1",
      destination: recipient,
      destAsset: usd,
      destAmount: "0.9",
      path: [],
    });
    expect(() =>
      assertSoranTransactionRoute(
        build(strictReceive).toXDR(),
        route(),
        network,
        context,
      ),
    ).toThrow(/does not match/);
  });
});
