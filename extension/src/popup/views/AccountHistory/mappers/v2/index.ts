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
  V2BalanceChange,
  V2StateChange,
} from "@shared/api/types/backend-api";
import {
  createMuxedAccount,
  isMuxedAccount,
  isSameAccount,
} from "helpers/stellar";
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
import { resolveProtocolAction } from "./protocolActions";

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
      case "ALLOWANCE":
        ids.add(change.token_id);
        break;
      // Trustlines and authorizations reference either a token or a liquidity
      // pool; only token ids resolve to token metadata.
      case "TRUSTLINE":
      case "BALANCE_AUTHORIZATION":
        if (change.token_id) {
          ids.add(change.token_id);
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

/**
 * Transaction result codes arrive as XDR enum names
 * ("TransactionResultCodeTxSuccess"), not the snake_case Horizon spelling —
 * freighter-backend-v2 passes wallet-backend's stored value straight through.
 * Fee-bump transactions report their inner result separately, so both success
 * codes count as success. The snake_case forms are accepted too because the
 * Horizon fallback (custom networks) synthesizes them.
 */
const SUCCESS_RESULT_CODES = new Set([
  "TransactionResultCodeTxSuccess",
  "TransactionResultCodeTxFeeBumpInnerSuccess",
  "tx_success",
  "tx_fee_bump_inner_success",
]);

export const mapV2Transaction = (
  tx: V2AccountTransaction,
  { tokens, publicKey, nativeTokenId }: MapV2Context,
): HistoryEntry => {
  const failed = !SUCCESS_RESULT_CODES.has(tx.result_code);

  const { rows, classification } = mapBalanceChanges(tx, tokens, nativeTokenId);
  const cards = mapStateChangeCards(tx.state_changes, tokens, publicKey);

  const contractCall =
    tx.operations.map(decodeContractCall).find((info) => info !== null) ?? null;
  const protocol = contractCall
    ? resolveProtocol(contractCall.contractId)
    : null;

  // The detail sheet labels the counterparty purely from entry.kind
  // ("received" → "From", "sent" → "To"), so this must resolve to the OTHER
  // party — and the comparisons must normalize muxed (M...) forms to their
  // base account, because the wallet only knows its own G key and a bare ===
  // would misread an incoming transfer to the user's own M-address as
  // outgoing, rendering "From: <the user's own address>".
  //
  // Incoming transfer → the sender; outgoing or third-party → the recipient;
  // mint to self → none (a mint has no sender — matches legacy, which renders
  // no counterparty row for mints). The resolved string keeps its muxed form:
  // display wants the address the user actually targeted.
  const resolveContractCounterparty = (): string | null => {
    if (!contractCall?.transferTo) {
      return null;
    }
    const { transferFrom, transferTo } = contractCall;
    if (isSameAccount(transferTo, publicKey)) {
      if (transferFrom && !isSameAccount(transferFrom, publicKey)) {
        return transferFrom;
      }
      return null;
    }
    return transferTo;
  };

  // CAP-67: a SEP-41 transfer's destination memo arrives distilled as
  // to_muxed_id on the BALANCE state change. When the counterparty we just
  // resolved is the transfer's *recipient* and decoded as a bare G address,
  // reconstruct the M-address the user actually targeted. Never applied when
  // the counterparty is the sender — to_muxed_id describes the destination
  // only. First consumer of the field.
  const upgradeToMuxed = (resolved: string | null): string | null => {
    if (
      !resolved ||
      resolved !== contractCall?.transferTo ||
      isMuxedAccount(resolved)
    ) {
      return resolved;
    }
    const toMuxedId = tx.state_changes.find(
      (change): change is V2BalanceChange =>
        change.variant === "BalanceChange" && Boolean(change.to_muxed_id),
    )?.to_muxed_id;
    if (!toMuxedId) {
      return resolved;
    }
    return createMuxedAccount(resolved, toMuxedId) ?? resolved;
  };

  const counterparty =
    upgradeToMuxed(resolveContractCounterparty()) ??
    tx.operations
      .map((op) => decodeCounterparty(op, publicKey))
      .find((address) => address !== null) ??
    null;

  const protocolAction = resolveProtocolAction(tx.state_changes);

  const presentation = buildPresentation({
    classification,
    cards,
    protocol,
    failed,
    operationTypes: tx.operations.map((op) => op.operation_type),
    protocolAction,
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
