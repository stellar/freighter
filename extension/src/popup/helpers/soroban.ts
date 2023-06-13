import BigNumber from "bignumber.js";
import * as SorobanClient from "soroban-client";

import { HorizonOperation, TokenBalances } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

interface RootInvocation {
  _attributes: {
    contractId: Buffer;
    functionName: Buffer;
    args: SorobanClient.xdr.ScVal[];
    subInvocations: SorobanClient.xdr.AuthorizedInvocation[];
  };
}

export enum SorobanTokenInterface {
  transfer = "transfer",
  mint = "mint",
}

// All assets on the classic side have 7 decimals
// https://developers.stellar.org/docs/fundamentals-and-concepts/stellar-data-structures/assets#amount-precision
export const CLASSIC_ASSET_DECIMALS = 7;

export const getAssetDecimals = (
  asset: string,
  balances: TokenBalances,
  isToken: boolean,
) => {
  if (isToken) {
    const contractId = asset.split(":")[1];
    const balance = balances.find(({ contractId: id }) => id === contractId);

    if (balance) {
      return Number(balance.decimals);
    }
  }

  return CLASSIC_ASSET_DECIMALS;
};

// Adopted from https://github.com/ethers-io/ethers.js/blob/master/packages/bignumber/src.ts/fixednumber.ts#L27
export const formatTokenAmount = (amount: BigNumber, decimals: number) => {
  let formatted = amount.shiftedBy(-decimals).toFixed(decimals).toString();

  // Trim trailing zeros
  while (formatted[formatted.length - 1] === "0") {
    formatted = formatted.substring(0, formatted.length - 1);
  }

  if (formatted.endsWith(".")) {
    formatted = formatted.substring(0, formatted.length - 1);
  }
  return formatted;
};

export const parseTokenAmount = (value: string, decimals: number) => {
  const comps = value.split(".");

  let whole = comps[0];
  let fraction = comps[1];
  if (!whole) {
    whole = "0";
  }
  if (!fraction) {
    fraction = "0";
  }

  // Trim trailing zeros
  while (fraction[fraction.length - 1] === "0") {
    fraction = fraction.substring(0, fraction.length - 1);
  }

  // If decimals is 0, we have an empty string for fraction
  if (fraction === "") {
    fraction = "0";
  }

  // Fully pad the string with zeros to get to value
  while (fraction.length < decimals) {
    fraction += "0";
  }

  const wholeValue = new BigNumber(whole);
  const fractionValue = new BigNumber(fraction);

  return wholeValue.shiftedBy(decimals).plus(fractionValue);
};

export const getTokenBalance = (
  tokenBalances: TokenBalances,
  contractId: string,
) => {
  const balance = tokenBalances.find(({ contractId: id }) => id === contractId);

  if (!balance) {
    throw new Error("Balance not found");
  }

  return formatTokenAmount(
    new BigNumber(balance.total),
    Number(balance.decimals),
  );
};

export const getOpArgs = (fnName: string, args: SorobanClient.xdr.ScVal[]) => {
  let amount;
  let from;
  let to;
  switch (fnName) {
    case SorobanTokenInterface.transfer:
      from = SorobanClient.StrKey.encodeEd25519PublicKey(
        args[0].address().accountId().ed25519(),
      );
      to = SorobanClient.StrKey.encodeEd25519PublicKey(
        args[1].address().accountId().ed25519(),
      );
      amount = args[2].i128().lo().low;
      break;
    case SorobanTokenInterface.mint:
      to = SorobanClient.StrKey.encodeEd25519PublicKey(
        args[0].address().accountId().ed25519(),
      );
      amount = args[1].i128().lo().low;
      break;
    default:
      amount = 0;
  }

  return { from, to, amount };
};

export const getAttrsFromSorobanOp = (
  operation: HorizonOperation,
  networkDetails: NetworkDetails,
) => {
  if (operation.type_i !== 24) {
    return null;
  }

  const txEnvelope = SorobanClient.TransactionBuilder.fromXDR(
    operation.transaction_attr.envelope_xdr,
    networkDetails.networkPassphrase,
  ) as SorobanClient.Transaction<
    SorobanClient.Memo<SorobanClient.MemoType>,
    SorobanClient.Operation.InvokeHostFunction[]
  >;

  const op = txEnvelope.operations[0].functions[0]; // only one op per tx in Soroban right now

  if (!op) {
    return null;
  }

  const txAuth = op.auth();

  if (!txAuth.length) {
    return null;
  }

  // TODO: figure out how to better work with the AuthorizedInvocation interface
  const {
    _attributes: attrs,
  } = (txAuth[0].rootInvocation() as unknown) as RootInvocation;

  const fnName = attrs.functionName.toString();

  if (
    fnName !== SorobanTokenInterface.transfer &&
    fnName !== SorobanTokenInterface.mint
  ) {
    return null;
  }

  const opArgs = getOpArgs(fnName, attrs.args);

  return {
    fnName,
    contractId: attrs.contractId.toString("hex"),
    ...opArgs,
  };
};
