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

import { isContractId } from "@shared/api/helpers/soroban";
import { getAssetFromCanonical } from "@shared/helpers/stellar";

/** What the review shows, read from the transaction rather than the quote. */
export interface DecodedSwapTx {
  sendAmount: string;
  /** Classic only; a Soroban swap's minimum is checked by the backend. */
  minReceived?: string;
  /** XLM. For a Soroban swap, inclusion plus resource fee. */
  fee: string;
  /** Soroban swaps only, XLM. */
  resourceFee?: string;
  addsTrustline: boolean;
}

// XLM fees, and classic assets in a path payment.
const CLASSIC_DECIMALS = 7;

// The changeTrust default; the backend builds with txnbuild.MaxTrustlineLimit.
const MAX_TRUSTLINE_LIMIT = "922337203685.4775807";

interface SwapToken {
  /** Unset for a Soroban-only token. */
  classic?: Asset;
  contract: string;
}

const toSwapToken = (
  canonical: string,
  networkPassphrase: string,
): SwapToken => {
  const asset = getAssetFromCanonical(canonical);
  if (asset instanceof Asset) {
    return { classic: asset, contract: asset.contractId(networkPassphrase) };
  }
  if (!isContractId(asset.issuer)) {
    throw new Error(`Swap: unsupported asset ${canonical}`);
  }
  return { contract: asset.issuer };
};

const fromUnits = (value: string | bigint | number, decimals: number) =>
  new BigNumber(value.toString()).shiftedBy(-decimals).toFixed();

const fromStroops = (value: string | bigint | number) =>
  fromUnits(value, CLASSIC_DECIMALS);

const mismatch = (what: string) =>
  new Error(`Swap transaction does not match the request: ${what}`);

const atLeastMinOut = (amount: BigNumber, minOut: string) => {
  if (!amount.gte(minOut)) {
    throw mismatch("minimum received");
  }
};

const decodeClassic = (
  tx: Transaction,
  account: string,
  { classic: from }: SwapToken,
  { classic: to }: SwapToken,
  amount: string,
  minOut: string,
): DecodedSwapTx => {
  if (!from || !to) {
    throw mismatch("path payment");
  }
  const ops = tx.operations;
  const payment = ops[ops.length - 1];
  const changeTrust = ops.length === 2 ? ops[0] : null;
  if (
    ops.length < 1 ||
    ops.length > 2 ||
    payment.type !== "pathPaymentStrictSend"
  ) {
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
      !changeTrust.line.equals(to) ||
      changeTrust.limit !== MAX_TRUSTLINE_LIMIT)
  ) {
    throw mismatch("trustline");
  }
  if (!new BigNumber(payment.sendAmount).eq(amount)) {
    throw mismatch("amount");
  }
  atLeastMinOut(new BigNumber(payment.destMin), minOut);
  return {
    sendAmount: new BigNumber(payment.sendAmount).toFixed(),
    minReceived: new BigNumber(payment.destMin).toFixed(),
    fee: fromStroops(tx.fee),
    addsTrustline: !!changeTrust,
  };
};

const contractFnName = (fn: xdr.InvokeContractArgs) =>
  fn.functionName.toString();

// The SEP-41/SAC calls an account authorizes for itself, besides a transfer
// of the sold token and a trust on the bought one. Anything else the account
// authorizes (the aggregator's own calls) is source-specific and left to the
// backend.
const UNEXPECTED_TOKEN_CALLS = [
  "approve",
  "burn",
  "transfer_from",
  "burn_from",
];

const contractCalls = (
  invocation: xdr.SorobanAuthorizedInvocation,
): xdr.InvokeContractArgs[] => {
  const fn = invocation.function;
  const own =
    fn.type === "sorobanAuthorizedFunctionTypeContractFn"
      ? [fn.contractFn]
      : [];
  return own.concat(...invocation.subInvocations.map(contractCalls));
};

// Any source's Soroban swap: what it sells is what the auth tree lets the
// account transfer of the sold token, so a new backend source needs no client
// change. Its minimum is enforced by the backend's checks, not read here.
const decodeSoroban = (
  tx: Transaction,
  account: string,
  { contract: fromContract }: SwapToken,
  { contract: toContract }: SwapToken,
  amount: string,
  sourceDecimals: number,
): DecodedSwapTx => {
  const op = tx.operations[0] as Operation.InvokeHostFunction;
  if (op.func.type !== "hostFunctionTypeInvokeContract") {
    throw mismatch("host function");
  }

  let sent = new BigNumber(0);
  let addsTrustline = false;
  (op.auth ?? [])
    .flatMap(({ rootInvocation }) => contractCalls(rootInvocation))
    .forEach((fn) => {
      const contract = Address.fromScAddress(fn.contractAddress).toString();
      const name = contractFnName(fn);
      const firstArg = fn.args.length ? scValToNative(fn.args[0]) : undefined;
      if (firstArg !== account) {
        return;
      }
      if (name === "transfer") {
        const amount: unknown = scValToNative(fn.args[2]);
        if (
          contract !== fromContract ||
          typeof amount !== "bigint" ||
          amount < BigInt(0)
        ) {
          throw mismatch("transfer");
        }
        sent = sent.plus(amount.toString());
      } else if (name === "trust") {
        if (contract !== toContract) {
          throw mismatch("trustline");
        }
        addsTrustline = true;
      } else if (UNEXPECTED_TOKEN_CALLS.includes(name)) {
        throw mismatch(name);
      }
    });
  if (!sent.gt(0) || !sent.shiftedBy(-sourceDecimals).eq(amount)) {
    throw mismatch("amount");
  }

  const env = tx.toEnvelope();
  const ext = env.type === "envelopeTypeTx" ? env.v1.tx.ext : null;
  const resourceFee =
    ext?.type === "sorobanData" ? ext.sorobanData.resourceFee : undefined;
  return {
    sendAmount: fromUnits(sent.toFixed(), sourceDecimals),
    fee: fromStroops(tx.fee),
    ...(resourceFee !== undefined
      ? { resourceFee: fromStroops(resourceFee.toString()) }
      : {}),
    addsTrustline,
  };
};

/**
 * Reads the review values out of a swap transaction built for `account`. A
 * classic path payment (optionally after its changeTrust) must swap
 * `sourceAsset` into `destAsset` and pay `account`; a single Soroban contract
 * call from any source is read from what its auth tree lets `account` move.
 */
export const decodeSwapTx = ({
  transactionXdr,
  networkPassphrase,
  account,
  sourceAsset,
  destAsset,
  amount,
  minOut,
  sourceDecimals,
}: {
  transactionXdr: string;
  networkPassphrase: string;
  account: string;
  sourceAsset: string;
  destAsset: string;
  /** The amount sent to `/swap/tx`; the transaction must sell exactly it. */
  amount: string;
  /** The floor the build was asked for; a lower classic minimum is refused. */
  minOut: string;
  /** The sold token's decimals: 7 for classic assets. */
  sourceDecimals: number;
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
  const from = toSwapToken(sourceAsset, networkPassphrase);
  const to = toSwapToken(destAsset, networkPassphrase);
  if (
    tx.operations.length === 1 &&
    tx.operations[0].type === "invokeHostFunction"
  ) {
    return decodeSoroban(tx, account, from, to, amount, sourceDecimals);
  }
  return decodeClassic(tx, account, from, to, amount, minOut);
};
