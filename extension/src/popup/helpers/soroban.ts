import * as SorobanClient from "soroban-client";
import { BigNumber } from "bignumber.js";

import { HorizonOperation, TokenBalances } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

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

export const getAttrsFromSorobanOp = (
  operation: HorizonOperation,
  networkDetails: NetworkDetails,
) => {
  if (operation.type_i !== 24) {
    return {};
  }

  const txEnvelope = SorobanClient.TransactionBuilder.fromXDR(
    operation.transaction_attr.envelope_xdr,
    networkDetails.networkPassphrase,
  ) as any;
  const op = txEnvelope._operations[0]; // only one op per tx in Soroban right now
  const txAuth = op.auth[0];
  if (!txAuth) {
    return {};
  }

  return {
    fnName: new TextDecoder().decode(
      txAuth._attributes.rootInvocation._attributes.functionName,
    ),
    contractId: contractIdAttrToHex(
      txAuth._attributes.rootInvocation._attributes.contractId,
    ),
  };
};
