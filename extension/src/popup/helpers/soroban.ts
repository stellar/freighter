import * as SorobanClient from "soroban-client";
import { BigNumber } from "bignumber.js";

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

  const total = (balance?.total as any) as BigNumber; // TODO

  return total.toString();
};

export const contractIdAttrToHex = (byteArray: number[]) =>
  Array.prototype.map
    .call(byteArray, function decodeBytes(byte) {
      // eslint-disable-next-line
      return ("0" + (byte & 0xff).toString(16)).slice(-2);
    })
    .join("");

export const getXferArgs = (args: any[]): Record<string, string> => {
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
    return {};
  }

  // TODO: Tx Envelope types are not caught up for Soroban yet
  const txEnvelope = SorobanClient.TransactionBuilder.fromXDR(
    operation.transaction_attr.envelope_xdr,
    networkDetails.networkPassphrase,
  ) as any;
  const op = txEnvelope._operations[0]; // only one op per tx in Soroban right now
  const txAuth = op.auth[0];
  if (!txAuth) {
    return {};
  }

  const attrs = txAuth._attributes.rootInvocation._attributes;
  const { amount } = getXferArgs(attrs.args);

  return {
    fnName: new TextDecoder().decode(attrs.functionName),
    contractId: contractIdAttrToHex(attrs.contractId),
    amount,
  };
};
