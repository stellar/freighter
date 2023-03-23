import * as SorobanClient from "soroban-client";

import { HorizonOperation, TokenBalances } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

export enum SorobanTokenInterface {
  xfer = "xfer",
}

export const getTokenBalance = (
  tokenBalances: TokenBalances,
  contractId: string,
) => {
  const balance = tokenBalances.find(({ contractId: id }) => id === contractId);

  if (!balance) {
    throw new Error("Balance not found");
  }

  return balance.total.toString();
};

export const contractIdAttrToHex = (byteArray: Buffer) =>
  byteArray.reduce(
    (prev, curr) =>
      // eslint-disable-next-line
      prev + ("0" + (curr & 0xff).toString(16)).slice(-2),
    "",
  );

export const getXferArgs = (args: SorobanClient.xdr.ScVal[]): Record<string, string|number> => {
  // xfer(to, from, amount)
  const amount = args[2];
  const value = amount.value() as SorobanClient.xdr.ScObject
  return {
    amount: value.i128().lo().low,
  };
};

interface RootInvocation {
  _attributes: {
    contractId: Buffer;
    functionName: Buffer;
    args: SorobanClient.xdr.ScVal[];
    subInvocations: SorobanClient.xdr.AuthorizedInvocation[];
  }
}

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
  ) as SorobanClient.Transaction<SorobanClient.Memo<SorobanClient.MemoType>, SorobanClient.Operation.InvokeHostFunction[]>;

  const op = txEnvelope.operations[0]; // only one op per tx in Soroban right now

  if (!op) {
    return null;
  }

  const txAuth = op.auth[0];
  if (!txAuth) {
    return null;
  }

  // TODO: figure out how to better work with the AuthorizedInvocation interface
  const { _attributes: attrs } = txAuth.rootInvocation() as unknown as RootInvocation
  const { amount } = getXferArgs(attrs.args);

  return {
    fnName: new TextDecoder().decode(attrs.functionName),
    contractId: contractIdAttrToHex(attrs.contractId),
    amount,
  };
};
