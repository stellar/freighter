import BigNumber from "bignumber.js";
import {
  Address,
  Asset,
  Operation,
  TransactionBuilder,
  scValToNative,
  xdr,
} from "stellar-sdk";

import { AssetBalanceChange, HorizonOperation } from "@shared/api/types";
import { isNativeAssetId } from "@shared/helpers/assetIdentity";
import { BlendRequestType } from "@shared/helpers/soroban/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  SOROBAN_OPERATION_TYPES,
  addressToString,
} from "popup/helpers/soroban";

/**
 * What a row in a position's Activity list says happened.
 *
 * Kept open-ended: a row whose type no client knows yet still renders, through
 * the list's generic fallback, so a new protocol's events need no client
 * release to appear.
 */
export enum PositionActivityType {
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
}

/**
 * One event in a position's history, normalised across protocols.
 *
 * Shaped like the items a backend activity endpoint would return
 * (`GET /accounts/{address}/activity`), so moving the list off the interim
 * Horizon source changes only where items come from, not this type or the UI.
 */
export interface PositionActivityItem {
  /** Unique per row: one operation can carry several requests. */
  id: string;
  protocol: "blend";
  /** The position's contract: the pool, for Blend. */
  positionId: string;
  /** The token contract the event moved. */
  assetId: string;
  type: PositionActivityType | string;
  /** Integer amount in the token's smallest unit. */
  amount: string;
  /** ISO 8601. */
  occurredAt: string;
  txHash: string;
  /** USD value at the time of the event. The Horizon source has none. */
  usdValueAtEvent: number | null;
}

/** Blend pool entry points that take `(from, spender, to, requests)`. */
const BLEND_SUBMIT_FUNCTIONS = new Set(["submit", "submit_with_allowance"]);

/**
 * Request types that change what the account supplies, and nothing else:
 * borrows, repays and auction fills are not position activity here.
 */
const BLEND_REQUEST_ACTIVITY: Partial<Record<number, PositionActivityType>> = {
  [BlendRequestType.Supply]: PositionActivityType.DEPOSIT,
  [BlendRequestType.SupplyCollateral]: PositionActivityType.DEPOSIT,
  [BlendRequestType.Withdraw]: PositionActivityType.WITHDRAW,
  [BlendRequestType.WithdrawCollateral]: PositionActivityType.WITHDRAW,
};

/** Classic assets, and so every SAC, have 7 decimals. */
const CLASSIC_DECIMALS = 7;

interface BlendRequest {
  address: string;
  amount: bigint;
  request_type: number;
}

interface PoolInvocation {
  contractId: string;
  fnName: string;
  args: xdr.ScVal[];
}

/** The contract call an operation made, read from its transaction envelope. */
const getInvocation = (
  operation: HorizonOperation,
  networkDetails: NetworkDetails,
): PoolInvocation | null => {
  const envelopeXdr = operation.transaction_attr?.envelope_xdr;
  if (!envelopeXdr) {
    return null;
  }

  try {
    // For a fee bump, `operations` reads through to the inner transaction.
    const transaction = TransactionBuilder.fromXdr(
      envelopeXdr,
      networkDetails.networkPassphrase,
    );
    // A Soroban transaction carries exactly one operation.
    const hostFn = transaction.operations[0] as Operation.InvokeHostFunction;
    const func = hostFn?.func;
    if (!func || func.type !== "hostFunctionTypeInvokeContract") {
      return null;
    }

    const invoked = func.invokeContract;
    const fnName = invoked.functionName.asStringOrBytes();
    if (typeof fnName !== "string") {
      return null;
    }

    return {
      contractId: addressToString(invoked.contractAddress),
      fnName,
      args: invoked.args,
    };
  } catch {
    // One undecodable envelope must not cost the rest of the list.
    return null;
  }
};

/** The SAC address of the classic asset a balance change moved. */
const getBalanceChangeAssetId = (
  change: AssetBalanceChange,
  networkPassphrase: string,
) => {
  try {
    const asset = isNativeAssetId(change.asset_type)
      ? Asset.native()
      : new Asset(change.asset_code || "", change.asset_issuer || "");
    return asset.contractId(networkPassphrase);
  } catch {
    return null;
  }
};

/**
 * What the pool actually paid out for a withdraw, in the token's smallest
 * unit. A withdraw request can ask for more than the position holds ("withdraw
 * max"), and the pool caps it, so the request's amount can overstate. Only SAC
 * tokens leave a balance change; null means "use the request".
 */
const getWithdrawnAmount = ({
  operation,
  poolId,
  recipient,
  assetId,
  networkPassphrase,
}: {
  operation: HorizonOperation;
  poolId: string;
  recipient: string;
  assetId: string;
  networkPassphrase: string;
}) => {
  const change = (operation.asset_balance_changes || []).find(
    (candidate) =>
      candidate.from === poolId &&
      candidate.to === recipient &&
      getBalanceChangeAssetId(candidate, networkPassphrase) === assetId,
  );

  return change
    ? new BigNumber(change.amount).shiftedBy(CLASSIC_DECIMALS).toFixed(0)
    : null;
};

/**
 * INTERIM SOURCE. Decodes an account's deposits into and withdrawals from one
 * Blend pool out of its Horizon operations (the History tab's data).
 *
 * Limits, all of which a backend activity endpoint would lift:
 * - Only the operations History already has: the latest 100 of any kind.
 * - Only calls the account made itself (`from` is the account). Liquidations,
 *   and deposits routed through another contract, are not seen.
 * - Withdraw amounts come from the token transfer the pool made, which only
 *   SAC tokens report; for any other token the request's amount stands.
 * - No USD value at the time of the event.
 *
 * Newest first, as History is.
 */
export const getBlendActivityFromHistory = ({
  operations,
  poolId,
  publicKey,
  networkDetails,
}: {
  operations: HorizonOperation[];
  poolId: string;
  publicKey: string;
  networkDetails: NetworkDetails;
}): PositionActivityItem[] => {
  const items: PositionActivityItem[] = [];

  operations.forEach((operation) => {
    if (
      !SOROBAN_OPERATION_TYPES.includes(operation.type) ||
      operation.transaction_successful === false
    ) {
      return;
    }

    const invocation = getInvocation(operation, networkDetails);
    if (
      !invocation ||
      invocation.contractId !== poolId ||
      !BLEND_SUBMIT_FUNCTIONS.has(invocation.fnName)
    ) {
      return;
    }

    let requests: BlendRequest[];
    let recipient: string;
    try {
      const [fromArg, , toArg, requestsArg] = invocation.args;
      if (Address.fromScVal(fromArg).toString() !== publicKey) {
        return;
      }
      recipient = Address.fromScVal(toArg).toString();
      requests = scValToNative(requestsArg) as BlendRequest[];
    } catch {
      return;
    }

    requests.forEach((request, index) => {
      const type = BLEND_REQUEST_ACTIVITY[Number(request.request_type)];
      if (!type) {
        return;
      }

      const requested = request.amount.toString();
      const amount =
        type === PositionActivityType.WITHDRAW
          ? (getWithdrawnAmount({
              operation,
              poolId,
              recipient,
              assetId: request.address,
              networkPassphrase: networkDetails.networkPassphrase,
            }) ?? requested)
          : requested;

      items.push({
        id: `${operation.id}:${index}`,
        protocol: "blend",
        positionId: poolId,
        assetId: request.address,
        type,
        amount,
        occurredAt: operation.created_at,
        txHash: operation.transaction_hash,
        usdValueAtEvent: null,
      });
    });
  });

  return items;
};
