/**
 * Decodes invoke-host-function operations from their XDR to extract the
 * target contract, invoked function, and (for payment-like ops) the
 * counterparty address. Also the drop-in point for contract → protocol
 * resolution once /protocols carries contract ids.
 */

import { Address, Operation, xdr } from "stellar-sdk";

import { V2Operation } from "@shared/api/types/backend-api";
import { isSameAccount } from "helpers/stellar";
import { getArgsForTokenInvocation } from "popup/helpers/soroban";
import { ProtocolInfo } from "popup/views/AccountHistory/model";

export interface ContractCallInfo {
  contractId: string;
  functionName: string | null;
  /**
   * The token-movement parties, decoded via getArgsForTokenInvocation:
   * transfer(from, to, ..) sets both; mint(to, ..) sets only transferTo (a
   * mint has no sender). Null for every other function. Either side may be a
   * muxed (M...) address — CAP-67 SEP-41 transfers put the muxed form in the
   * ScAddress arg itself — and it is kept verbatim here: comparisons against
   * the wallet's G key must normalize (isSameAccount), while display wants
   * the muxed form the user actually targeted.
   */
  transferFrom: string | null;
  transferTo: string | null;
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

    let transferFrom: string | null = null;
    let transferTo: string | null = null;
    if (functionName === "transfer" || functionName === "mint") {
      // Own try/catch, deliberately: getArgsForTokenInvocation throws on
      // malformed args, and losing the parties should not also lose the
      // contractId/functionName already decoded above (the outer catch would
      // return null for the whole ContractCallInfo).
      try {
        const parties = getArgsForTokenInvocation(
          functionName,
          invocation.args(),
        );
        // the helper returns "" (not null) for an absent party
        transferFrom = parties.from || null;
        transferTo = parties.to || null;
      } catch {
        // malformed args — keep contractId/functionName, drop the parties
      }
    }

    return { contractId, functionName, transferFrom, transferTo };
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
        // Received → counterparty is the op source; sent → the destination.
        // isSameAccount, not ===: the destination can be a muxed (M...) form
        // of the wallet's own G key, and a bare comparison would return the
        // user's own muxed address as the counterparty. The returned string
        // keeps its muxed form — display wants what the sender targeted.
        if (isSameAccount(destination, publicKey)) {
          return typed.source ?? null;
        }
        return destination;
      }
      case "createAccount":
        return isSameAccount(typed.destination, publicKey)
          ? (typed.source ?? null)
          : typed.destination;
      case "accountMerge":
        return isSameAccount(typed.destination, publicKey)
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
