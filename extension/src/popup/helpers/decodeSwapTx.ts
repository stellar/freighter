import BigNumber from "bignumber.js";
import {
  Address,
  Asset,
  FeeBumpTransaction,
  Operation,
  scValToNative,
  Transaction,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";

import { getAssetFromCanonical } from "@shared/helpers/stellar";

/** What the review shows, read from the transaction rather than the quote. */
export interface DecodedSwapTx {
  sendAmount: string;
  minReceived: string;
  /** XLM. For a Soroban swap, inclusion plus resource fee. */
  fee: string;
  /** Soroban swaps only, XLM. */
  resourceFee?: string;
  addsTrustline: boolean;
}

// Classic assets and their contracts both use 7 decimals. Soroban-only
// tokens are rejected below until the picker allows them (C3).
const CLASSIC_DECIMALS = 7;

const toClassicAsset = (canonical: string): Asset => {
  const asset = getAssetFromCanonical(canonical);
  if (!(asset instanceof Asset)) {
    throw new Error(`Swap: unsupported asset ${canonical}`);
  }
  return asset;
};

const fromStroops = (value: string | bigint | number) =>
  new BigNumber(value.toString()).shiftedBy(-CLASSIC_DECIMALS).toFixed();

const mismatch = (what: string) =>
  new Error(`Swap transaction does not match the request: ${what}`);

const decodeClassic = (
  tx: Transaction,
  account: string,
  from: Asset,
  to: Asset,
): DecodedSwapTx => {
  const ops = tx.operations;
  const payment = ops[ops.length - 1];
  const changeTrust = ops.length === 2 ? ops[0] : null;
  if (ops.length > 2 || payment.type !== "pathPaymentStrictSend") {
    throw mismatch("operations");
  }
  if (
    !payment.sendAsset.equals(from) ||
    !payment.destAsset.equals(to) ||
    payment.destination !== account
  ) {
    throw mismatch("path payment");
  }
  if (
    changeTrust &&
    (changeTrust.type !== "changeTrust" ||
      !(changeTrust.line instanceof Asset) ||
      !changeTrust.line.equals(to))
  ) {
    throw mismatch("trustline");
  }
  return {
    sendAmount: new BigNumber(payment.sendAmount).toFixed(),
    minReceived: new BigNumber(payment.destMin).toFixed(),
    fee: fromStroops(tx.fee),
    addsTrustline: !!changeTrust,
  };
};

const contractFnName = (fn: xdr.InvokeContractArgs) =>
  fn.functionName.toString();

// The LI.FI swap call is swap(params, receiver). params.args is the
// aggregator's (account, token_in, amount_in, token_out, min_out, …); the
// backend's lifi_checks.go reads the same fields.
const decodeLifi = (
  tx: Transaction,
  account: string,
  from: Asset,
  to: Asset,
  networkPassphrase: string,
): DecodedSwapTx => {
  const op = tx.operations[0] as Operation.InvokeHostFunction;
  if (op.func.type !== "hostFunctionTypeInvokeContract") {
    throw mismatch("host function");
  }
  const call = op.func.invokeContract;
  if (contractFnName(call) !== "swap" || call.args.length !== 2) {
    throw mismatch("swap call");
  }
  const params = scValToNative(call.args[0]);
  const receiver = scValToNative(call.args[1]);
  const fromContract = from.contractId(networkPassphrase);
  const toContract = to.contractId(networkPassphrase);
  const args: unknown[] = Array.isArray(params?.args) ? params.args : [];
  if (
    receiver !== account ||
    args[0] !== account ||
    params.token_in !== fromContract ||
    params.token_out !== toContract ||
    typeof args[2] !== "bigint" ||
    typeof params.min_amount_out !== "bigint"
  ) {
    throw mismatch("swap call");
  }

  const addsTrustline = (op.auth ?? []).some(({ rootInvocation }) =>
    rootInvocation.subInvocations.some(({ function: fn }) => {
      if (fn.type !== "sorobanAuthorizedFunctionTypeContractFn") {
        return false;
      }
      const inner = fn.contractFn;
      return (
        Address.fromScAddress(inner.contractAddress).toString() ===
          toContract &&
        contractFnName(inner) === "trust" &&
        inner.args.length === 1 &&
        scValToNative(inner.args[0]) === account
      );
    }),
  );

  const env = tx.toEnvelope();
  const ext = env.type === "envelopeTypeTx" ? env.v1.tx.ext : null;
  const resourceFee =
    ext?.type === "sorobanData" ? ext.sorobanData.resourceFee : undefined;
  return {
    sendAmount: fromStroops(args[2] as bigint),
    minReceived: fromStroops(params.min_amount_out),
    fee: fromStroops(tx.fee),
    ...(resourceFee !== undefined
      ? { resourceFee: fromStroops(resourceFee.toString()) }
      : {}),
    addsTrustline,
  };
};

/**
 * Reads the review values out of a swap transaction and refuses one that
 * does not swap `sourceAsset` into `destAsset` for `account` and pay `account`.
 * Recognises a classic path payment (optionally after its changeTrust) and the
 * LI.FI swap contract call.
 */
export const decodeSwapTx = ({
  transactionXdr,
  networkPassphrase,
  account,
  sourceAsset,
  destAsset,
}: {
  transactionXdr: string;
  networkPassphrase: string;
  account: string;
  sourceAsset: string;
  destAsset: string;
}): DecodedSwapTx => {
  const parsed = TransactionBuilder.fromXdr(transactionXdr, networkPassphrase);
  if (parsed instanceof FeeBumpTransaction) {
    throw mismatch("fee bump");
  }
  const tx = parsed;
  if (
    tx.source !== account ||
    tx.operations.some((op) => op.source && op.source !== account)
  ) {
    throw mismatch("source account");
  }
  const from = toClassicAsset(sourceAsset);
  const to = toClassicAsset(destAsset);
  if (
    tx.operations.length === 1 &&
    tx.operations[0].type === "invokeHostFunction"
  ) {
    return decodeLifi(tx, account, from, to, networkPassphrase);
  }
  return decodeClassic(tx, account, from, to);
};
