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

export const contractIdAttrToHex = (byteArray: number[]) =>
  byteArray.reduce(
    (prev, curr) =>
      // eslint-disable-next-line
      prev + ("0" + (curr & 0xff).toString(16)).slice(-2),
    "",
  );

interface AmountArg {
  _switch: {
    value: string;
  };
}

type TxEnvXferArgs = [Uint32Array, Uint32Array, AmountArg];

export const getXferArgs = (args: TxEnvXferArgs): Record<string, string> => {
  // xfer(to, from, amount)
  const amount = args[2];
  return {
    amount: amount._switch.value,
  };
};

export const getAttrsFromSorobanOp = (
  operation: HorizonOperation,
  networkDetails: NetworkDetails,
) => {
  if (operation.type_i !== 24) {
    return null;
  }

  // TODO: Tx Envelope types are not caught up for Soroban yet
  const txEnvelope = SorobanClient.TransactionBuilder.fromXDR(
    operation.transaction_attr.envelope_xdr,
    networkDetails.networkPassphrase,
  ) as Record<string, any>;
  const op = txEnvelope._operations[0]; // only one op per tx in Soroban right now

  if (!op) {
    return null;
  }

  const txAuth = op.auth[0];
  if (!txAuth) {
    return null;
  }

  const attrs = txAuth._attributes.rootInvocation._attributes;
  const { amount } = getXferArgs(attrs.args);

  return {
    fnName: new TextDecoder().decode(attrs.functionName),
    contractId: contractIdAttrToHex(attrs.contractId),
    amount,
  };
};
