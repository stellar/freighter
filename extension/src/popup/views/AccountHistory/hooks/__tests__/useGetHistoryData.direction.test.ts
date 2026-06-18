import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  MuxedAccount,
  Networks,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
} from "stellar-sdk";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getBaseAccount } from "helpers/stellar";

import { getRowDataByOpType } from "../useGetHistoryData";

// Icon resolution for non-XLM assets would hit the network; stub it so the
// Soroban branches never make a real request. The XLM / balance-change paths
// short-circuit to the bundled logo and never call this.
jest.mock("@shared/api/helpers/getIconUrlFromIssuer", () => ({
  getIconUrlFromIssuer: jest.fn().mockResolvedValue(""),
}));

const networkDetails = MAINNET_NETWORK_DETAILS; // networkPassphrase === Networks.PUBLIC

// ---------------------------------------------------------------------------
// Helpers — all values derived from real keypairs / real SDK encoders so the
// tests exercise genuine StrKey/MuxedAccount decoding, never hardcoded strings.
// ---------------------------------------------------------------------------

/** A fresh base (G...) account. */
const gAddress = () => Keypair.random().publicKey();

/** Build the muxed (M...) form of a base G account with a given id. */
const muxedOf = (baseG: string, id: string) =>
  new MuxedAccount(new Account(baseG, "0"), id).accountId();

const buildNativePaymentOp = (args: {
  to?: string;
  toMuxed?: string;
  from?: string;
  type?: string;
}) =>
  ({
    account: args.to ?? "",
    amount: "100.0000000",
    asset_type: "native",
    created_at: "2024-01-01T00:00:00Z",
    id: "op-1",
    to: args.to,
    to_muxed: args.toMuxed,
    from: args.from,
    type: args.type ?? "payment",
    type_i: 1,
    transaction_successful: true,
    isPayment: true,
    transaction_attr: {
      operation_count: 1,
      fee_charged: "100",
      memo: undefined,
      envelope_xdr: "",
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

/**
 * Build a REAL invoke_host_function envelope XDR for a SAC `transfer(from, to,
 * amount)` call. Used so `getAttrsFromSorobanHorizonOp` (which parses the XDR
 * and throws on anything invalid) succeeds for the balance-change op. The
 * contract-arg addresses are necessarily G/C (Soroban Address cannot encode an
 * M-address); the muxed address under test lives in `asset_balance_changes`.
 */
const buildTransferEnvelopeXdr = (fromG: string, toG: string) => {
  const source = new Account(gAddress(), "0");
  const contractId = StrKey.encodeContract(Buffer.alloc(32, 7));
  const contract = new Contract(contractId);
  const op = contract.call(
    "transfer",
    new Address(fromG).toScVal(),
    new Address(toG).toScVal(),
    nativeToScVal(BigInt(5), { type: "i128" }),
  );
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.PUBLIC,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();
  return tx.toEnvelope().toXDR("base64");
};

const buildBalanceChangeOp = (
  envelopeXdr: string,
  changes: Array<{ from: string; to: string; amount?: string }>,
) =>
  ({
    account: "",
    created_at: "2024-01-01T00:00:00Z",
    id: "op-bc",
    type: "invoke_host_function",
    type_i: 24,
    transaction_successful: true,
    transaction_attr: {
      operation_count: 1,
      fee_charged: "100",
      memo: undefined,
      envelope_xdr: envelopeXdr,
    },
    asset_balance_changes: changes.map((c) => ({
      asset_type: "native",
      type: "transfer",
      from: c.from,
      to: c.to,
      amount: c.amount ?? "5.0000000",
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

const run = (
  publicKey: string,
  op: unknown,
  fetchTokenDetails: jest.Mock = jest.fn(),
) =>
  getRowDataByOpType(
    publicKey,
    [], // balances
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    op as any,
    networkDetails,
    {}, // icons
    fetchTokenDetails,
    {}, // homeDomains
    new Map(), // collectibleLookup
    [], // cachedTokenLists
  );

// ===========================================================================
// 1. Classic payment direction (the proven #2841 bug + edge cases)
// ===========================================================================
describe("getRowDataByOpType — classic payment direction (#2841)", () => {
  it("received at the user's MUXED address is Received (and still displays M-address)", async () => {
    const me = gAddress();
    const op = buildNativePaymentOp({
      to: me, // Horizon base G
      toMuxed: muxedOf(me, "98765"), // M...
      from: gAddress(),
    });
    const row = await run(me, op);
    expect(row.metadata.isReceiving).toBe(true);
    expect(row.metadata.to).toBe(op.to_muxed);
  });

  it("works for ANY muxed id (not a hardcoded match)", async () => {
    const me = gAddress();
    for (const id of ["0", "1", "42", "18446744073709551615"]) {
      const op = buildNativePaymentOp({
        to: me,
        toMuxed: muxedOf(me, id),
        from: gAddress(),
      });
      const row = await run(me, op);
      expect(row.metadata.isReceiving).toBe(true);
    }
  });

  it("ordinary (non-muxed) received payment is Received", async () => {
    const me = gAddress();
    const op = buildNativePaymentOp({ to: me, from: gAddress() });
    expect((await run(me, op)).metadata.isReceiving).toBe(true);
  });

  it("payment to SOMEONE ELSE'S muxed address is Sent", async () => {
    const me = gAddress();
    const other = gAddress();
    const op = buildNativePaymentOp({
      to: other,
      toMuxed: muxedOf(other, "5"),
      from: me,
    });
    expect((await run(me, op)).metadata.isReceiving).toBe(false);
  });

  it("payment to someone else's plain G address is Sent", async () => {
    const me = gAddress();
    const op = buildNativePaymentOp({ to: gAddress(), from: me });
    expect((await run(me, op)).metadata.isReceiving).toBe(false);
  });

  it("self-payment to the user's OWN muxed address is Sent (self guard)", async () => {
    const me = gAddress();
    const op = buildNativePaymentOp({
      to: me,
      toMuxed: muxedOf(me, "7"),
      from: me, // I sent it to my own muxed sub-account
    });
    expect((await run(me, op)).metadata.isReceiving).toBe(false);
  });

  it("handles a muxed value in `to` itself (no separate to_muxed)", async () => {
    const me = gAddress();
    const op = buildNativePaymentOp({
      to: muxedOf(me, "3"), // M... lands directly in `to`
      from: gAddress(),
    });
    expect((await run(me, op)).metadata.isReceiving).toBe(true);
  });

  it("does not throw on a malformed destination (treated as Sent)", async () => {
    const me = gAddress();
    const op = buildNativePaymentOp({
      to: "NOT_A_REAL_ADDRESS",
      from: gAddress(),
    });
    const row = await run(me, op);
    expect(row.metadata.isReceiving).toBe(false);
  });

  it("does not throw on empty to/from (treated as Sent)", async () => {
    const me = gAddress();
    const op = buildNativePaymentOp({ to: "", from: "" });
    const row = await run(me, op);
    expect(row.metadata.isReceiving).toBe(false);
  });

  it("classifies path payments the same way", async () => {
    const me = gAddress();
    const op = buildNativePaymentOp({
      to: me,
      toMuxed: muxedOf(me, "9"),
      from: gAddress(),
      type: "path_payment_strict_receive",
    });
    expect((await run(me, op)).metadata.isReceiving).toBe(true);
  });
});

// ===========================================================================
// 2. Soroban asset_balance_changes direction (real invoke XDR + real muxed)
// ===========================================================================
describe("getRowDataByOpType — asset_balance_changes direction (#2841)", () => {
  it("credit to the user's MUXED address is Received", async () => {
    const me = gAddress();
    const other = gAddress();
    const envelopeXdr = buildTransferEnvelopeXdr(other, me);
    const op = buildBalanceChangeOp(envelopeXdr, [
      { from: other, to: muxedOf(me, "123") },
    ]);
    const row = await run(me, op);
    expect(row.metadata.isReceiving).toBe(true);
  });

  it("debit from the user's MUXED address is Sent", async () => {
    const me = gAddress();
    const other = gAddress();
    const envelopeXdr = buildTransferEnvelopeXdr(me, other);
    const op = buildBalanceChangeOp(envelopeXdr, [
      { from: muxedOf(me, "55"), to: other },
    ]);
    const row = await run(me, op);
    expect(row.metadata.isReceiving).toBe(false);
  });

  it("does not throw when a change targets a contract (C...) address", async () => {
    const me = gAddress();
    const contractId = StrKey.encodeContract(Buffer.alloc(32, 9));
    const envelopeXdr = buildTransferEnvelopeXdr(me, gAddress());
    const op = buildBalanceChangeOp(envelopeXdr, [
      { from: me, to: contractId },
    ]);
    const row = await run(me, op);
    expect(row.metadata.isReceiving).toBe(false);
  });
});

// ===========================================================================
// 3. Shared decode mechanism is REAL (anti-stub): getBaseAccount
// ===========================================================================
describe("getBaseAccount — real muxed decode underpinning the fix", () => {
  it("resolves M... to its true base G... for many random accounts/ids", () => {
    for (let i = 0; i < 10; i++) {
      const base = gAddress();
      const id = String(Math.floor(Math.random() * 1e9));
      expect(getBaseAccount(muxedOf(base, id))).toBe(base);
    }
  });

  it("two different muxed ids over the same base resolve to that base", () => {
    const base = gAddress();
    expect(getBaseAccount(muxedOf(base, "1"))).toBe(base);
    expect(getBaseAccount(muxedOf(base, "2"))).toBe(base);
    // ...and a muxed of a DIFFERENT base does not resolve to it
    expect(getBaseAccount(muxedOf(gAddress(), "1"))).not.toBe(base);
  });

  it("passes plain G... and contract C... addresses through unchanged", () => {
    const g = gAddress();
    const c = StrKey.encodeContract(Buffer.alloc(32, 3));
    expect(getBaseAccount(g)).toBe(g);
    expect(getBaseAccount(c)).toBe(c);
  });
});
