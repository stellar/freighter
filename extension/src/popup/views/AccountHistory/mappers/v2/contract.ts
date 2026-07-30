/**
 * Decodes invoke-host-function operations from their XDR to extract the
 * target contract, invoked function, and (for payment-like ops) the
 * counterparty address. Also the drop-in point for contract → protocol
 * resolution once /protocols carries contract ids.
 */

import { Address, Operation, xdr } from "stellar-sdk";

import { V2Operation } from "@shared/api/types/backend-api";
import { ProtocolInfo } from "popup/views/AccountHistory/model";

export interface ContractCallInfo {
  contractId: string;
  functionName: string | null;
  /** SEP-41 transfer destination when the invoked fn is transfer(from, to, amount) */
  transferDestination: string | null;
}

const decodeOp = (operationXdr: string): xdr.Operation | null => {
  try {
    return xdr.Operation.fromXDR(operationXdr, "base64");
  } catch {
    return null;
  }
};

export const decodeContractCall = (
  op: V2Operation,
): ContractCallInfo | null => {
  if (op.operation_type !== "INVOKE_HOST_FUNCTION") {
    return null;
  }
  const decoded = decodeOp(op.operation_xdr);
  if (!decoded) {
    return null;
  }

  try {
    const hostFn = decoded.body().invokeHostFunctionOp().hostFunction();
    if (hostFn.switch().name !== "hostFunctionTypeInvokeContract") {
      return null;
    }
    const invocation = hostFn.invokeContract();
    const contractId = Address.fromScAddress(
      invocation.contractAddress(),
    ).toString();
    const functionName = invocation.functionName().toString();

    let transferDestination: string | null = null;
    if (functionName === "transfer") {
      const toArg = invocation.args()[1];
      if (toArg?.switch().name === "scvAddress") {
        transferDestination = Address.fromScAddress(toArg.address()).toString();
      }
    }

    return { contractId, functionName, transferDestination };
  } catch {
    return null;
  }
};

/**
 * Extracts the counterparty (to/from) for classic payment-like operations
 * using the SDK's typed decoder.
 */
export const decodeCounterparty = (
  op: V2Operation,
  publicKey: string,
): string | null => {
  const decoded = decodeOp(op.operation_xdr);
  if (!decoded) {
    return null;
  }
  try {
    const typed = Operation.fromXDRObject(decoded);
    switch (typed.type) {
      case "payment":
      case "pathPaymentStrictSend":
      case "pathPaymentStrictReceive": {
        const destination = typed.destination;
        // Received → counterparty is the op source; sent → the destination
        if (destination === publicKey) {
          return typed.source ?? null;
        }
        return destination;
      }
      case "createAccount":
        return typed.destination === publicKey
          ? (typed.source ?? null)
          : typed.destination;
      case "accountMerge":
        return typed.destination === publicKey
          ? (typed.source ?? null)
          : typed.destination;
      default:
        return null;
    }
  } catch {
    return null;
  }
};

/**
 * Contract → protocol resolution. Returns null until the backend /protocols
 * config carries contract ids (backend follow-up) — at which point this
 * becomes a lookup over getDiscoverData() entries and every caller lights up
 * with the protocol treatment (logo + name + domain).
 */
export const resolveProtocol = (_contractId: string): ProtocolInfo | null =>
  null;
