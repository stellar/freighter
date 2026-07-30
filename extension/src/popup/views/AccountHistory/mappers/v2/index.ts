/**
 * mapV2Transaction — the single entry point from a v2 AccountTransaction to
 * the normalized HistoryEntry the redesigned History UI renders.
 *
 * Usage per page:
 *   const tokens = await buildTokenContext({ tokenIds: collectTokenIds(page), ... });
 *   const entries = page.data.map((tx) => mapV2Transaction(tx, { tokens, publicKey, nativeTokenId }));
 */

import BigNumber from "bignumber.js";

import {
  V2AccountTransaction,
  V2StateChange,
} from "@shared/api/types/backend-api";
import {
  CLASSIC_ASSET_DECIMALS,
  formatTokenAmount,
} from "popup/helpers/soroban";
import { TokenContext } from "popup/helpers/history/tokenResolver";
import { HistoryEntry } from "popup/views/AccountHistory/model";
import { mapBalanceChanges } from "./balances";
import { mapStateChangeCards } from "./stateChanges";
import {
  decodeContractCall,
  decodeCounterparty,
  resolveProtocol,
} from "./contract";
import { buildPresentation } from "./classify";

export interface MapV2Context {
  tokens: TokenContext;
  /** the account whose history this is */
  publicKey: string;
  /** the network's native SAC contract id (fee heuristic); null skips the token match */
  nativeTokenId: string | null;
}

/** Every token contract id referenced by a page — feed to buildTokenContext */
export const collectTokenIds = (
  transactions: V2AccountTransaction[],
): string[] => {
  const ids = new Set<string>();
  const collect = (change: V2StateChange) => {
    switch (change.type) {
      case "BALANCE":
        ids.add(change.standard_balance_token_id);
        break;
      case "TRUSTLINE":
        if (change.trustline_token_id) {
          ids.add(change.trustline_token_id);
        }
        break;
      case "BALANCE_AUTHORIZATION":
        if (change.balance_auth_token_id) {
          ids.add(change.balance_auth_token_id);
        }
        break;
      default:
        break;
    }
  };
  for (const tx of transactions) {
    tx.state_changes.forEach(collect);
  }
  return [...ids];
};

export const mapV2Transaction = (
  tx: V2AccountTransaction,
  { tokens, publicKey, nativeTokenId }: MapV2Context,
): HistoryEntry => {
  const failed = tx.result_code !== "tx_success";

  const { rows, classification } = mapBalanceChanges(tx, tokens, nativeTokenId);
  const cards = mapStateChangeCards(tx.state_changes, tokens, publicKey);

  const contractCall =
    tx.operations.map(decodeContractCall).find((info) => info !== null) ?? null;
  const protocol = contractCall
    ? resolveProtocol(contractCall.contractId)
    : null;

  const counterparty =
    contractCall?.transferDestination ??
    tx.operations
      .map((op) => decodeCounterparty(op, publicKey))
      .find((address) => address !== null) ??
    null;

  const presentation = buildPresentation({
    classification,
    cards,
    contractCall,
    protocol,
    failed,
  });

  return {
    id: tx.hash,
    kind: presentation.kind,
    createdAt: tx.ledger_created_at,
    rowIcon: presentation.rowIcon,
    primaryText: presentation.primaryText,
    secondaryText: presentation.secondaryText,
    secondaryIcon: presentation.secondaryIcon,
    amounts: presentation.amounts,
    details: {
      title: presentation.title,
      status: failed ? "failed" : "success",
      fee: formatTokenAmount(
        new BigNumber(tx.fee_charged),
        CLASSIC_ASSET_DECIMALS,
      ),
      rate: classification.type === "swapped" ? classification.rate : null,
      contractId: contractCall?.contractId ?? null,
      functionName: contractCall?.functionName ?? null,
      protocol,
      counterparty,
      balanceChanges: rows,
      stateChangeCards: cards,
      operations: tx.operations.map((op) => ({
        id: op.id,
        type: op.operation_type,
        xdr: op.operation_xdr,
        successful: op.successful,
      })),
    },
  };
};
