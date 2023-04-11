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
  xfer = "xfer",
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

export const contractIdAttrToHex = (byteArray: Buffer) =>
  byteArray.reduce(
    (prev, curr) =>
      // eslint-disable-next-line
      prev + ("0" + (curr & 0xff).toString(16)).slice(-2),
    "",
  );

export const getXferArgs = (
  args: SorobanClient.xdr.ScVal[],
): Record<string, string | number> => {
  // xfer(to, from, amount)
  const amount = args[2];
  const value = amount.i128().lo().low;
  return {
    amount: value,
  };
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

  const op = txEnvelope.operations[0]; // only one op per tx in Soroban right now

  if (!op) {
    return null;
  }

  const txAuth = op.auth[0];
  if (!txAuth) {
    return null;
  }

  // TODO: figure out how to better work with the AuthorizedInvocation interface
  const {
    _attributes: attrs,
  } = (txAuth.rootInvocation() as unknown) as RootInvocation;
  const { amount } = getXferArgs(attrs.args);

  return {
    fnName: new TextDecoder().decode(attrs.functionName),
    contractId: contractIdAttrToHex(attrs.contractId),
    amount,
  };
};
