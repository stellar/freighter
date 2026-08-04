/**
 * Normalized, transaction-centric history model — the single shape the
 * redesigned History UI renders from. Produced by mappers/v2 (backend v2
 * state-change payload) and mappers/horizon (custom-network fallback).
 *
 * Pure data only: no ReactNode, no formatting side effects — icons are
 * described by RowIconDescriptor and rendered by HistoryRowIcon.
 */

import { V2OperationType } from "@shared/api/types/backend-api";

/** A token referenced by a history entry, resolved to display data */
export interface ResolvedToken {
  code: string;
  /** SAC / SEP-41 contract address (C...) when known */
  contractId: string | null;
  /** Classic issuer (G...) when known; null for native */
  issuer: string | null;
  icon: string | null;
  decimals: number;
}

/** Distinct glyphs for the account-configuration (non-asset) operation types,
 *  so each config change shows an icon that matches its type in the design. */
export type SettingsGlyph =
  | "signer"
  | "threshold"
  | "data"
  | "domain"
  | "flag"
  | "allowance"
  | "claimable"
  | "generic";

/** Describes the leading icon of a list row / detail header */
export type RowIconDescriptor =
  /** 1 icon = single token, 2 = overlapping swap pair, 3+ = stacked with "+N" badge */
  | { type: "asset"; tokens: ResolvedToken[] }
  | { type: "protocol"; src: string; name: string }
  | { type: "contract" }
  | { type: "settings"; glyph: SettingsGlyph }
  | { type: "failed" }
  | { type: "account"; variant: "create" | "merge" };

export type HistoryEntryKind =
  | "sent"
  | "received"
  | "swapped"
  | "trustlineAdded"
  | "trustlineRemoved"
  | "accountCreated"
  | "accountMerged"
  | "contract"
  | "failed"
  | "other";

export interface BalanceChangeRow {
  token: ResolvedToken;
  /** decimal amount, unsigned (e.g. "40.4") */
  amount: string;
  direction: "credit" | "debit";
}

export interface SignerEntry {
  address: string;
  /** null when the signer is being added (no prior weight) */
  weightOld: number | null;
  /** null when the signer is being removed */
  weightNew: number | null;
}

export type DataEntryVerb = "added" | "updated" | "removed";

export interface DataEntryItem {
  key: string;
  /** base64-encoded raw values, shown in the DataEntrySheet */
  valueOldB64: string | null;
  valueNewB64: string | null;
}

/** A data-entry row the user tapped, expanded in the DataEntrySheet */
export interface DataEntrySelection {
  verb: DataEntryVerb;
  entry: DataEntryItem;
}

export interface TrustlineEntry {
  token: ResolvedToken;
  /** null when the trustline is being added */
  limitOld: string | null;
  /** null when the trustline is being removed */
  limitNew: string | null;
}

/** One rendered card in the detail sheet, discriminated on `kind` */
export type StateChangeCardData =
  | { kind: "accountCreated"; address: string; funder: string | null }
  | { kind: "accountMerged" }
  | {
      kind: "signers";
      verb: "added" | "updated" | "removed";
      entries: SignerEntry[];
    }
  | {
      kind: "thresholds";
      level: "low" | "medium" | "high";
      valueOld: string | null;
      valueNew: string | null;
    }
  /** Same-verb data entries share a card, one tappable key row each */
  | { kind: "dataEntry"; verb: DataEntryVerb; entries: DataEntryItem[] }
  | {
      kind: "homeDomain";
      verb: "set" | "updated" | "removed";
      domainOld: string | null;
      domainNew: string | null;
    }
  | { kind: "flags"; set: string[]; cleared: string[] }
  | {
      kind: "trustlines";
      verb: "created" | "updated" | "removed";
      entries: TrustlineEntry[];
    }
  | {
      kind: "balanceAuthorizations";
      authorized: boolean;
      tokens: ResolvedToken[];
    }
  /**
   * SEP-41 allowance approval. No Figma yet — rendered with the generic
   * key/value card layout pending design.
   */
  | {
      kind: "allowance";
      token: ResolvedToken;
      spender: string;
      /** decimal amount, formatted to the token's decimals */
      amount: string;
      expirationLedger: number;
    };

export interface HistoryOperation {
  id: string;
  type: V2OperationType;
  /** base64 xdr.Operation */
  xdr: string;
  successful: boolean;
}

export interface ProtocolInfo {
  name: string;
  domain: string;
  iconUrl: string;
}

export interface HistoryEntryDetails {
  /** e.g. "Swapped XLM to USDC", "Sent XLM", "Added trustline", "Contract" */
  title: string;
  status: "success" | "failed";
  /** decimal XLM, e.g. "0.0051234" */
  fee: string;
  /** swaps only: "1 XLM ≈ 1.01 USDC" */
  rate: string | null;
  /** invoke ops: target contract (C...) */
  contractId: string | null;
  /** invoke ops: invoked function name when decodable */
  functionName: string | null;
  /** resolved protocol treatment; null until /protocols carries contract ids */
  protocol: ProtocolInfo | null;
  /** counterparty (to/from) address when the entry has a single direction */
  counterparty: string | null;
  balanceChanges: BalanceChangeRow[];
  stateChangeCards: StateChangeCardData[];
  operations: HistoryOperation[];
}

/** One list row = one transaction */
export interface HistoryEntry {
  /** transaction hash */
  id: string;
  kind: HistoryEntryKind;
  /** RFC3339 */
  createdAt: string;
  rowIcon: RowIconDescriptor;
  /** "XLM" | "XLM to USDC" | "Aquarius" | "Contract" | ... */
  primaryText: string;
  /** verb ("Swapped") or domain ("aqua.com") */
  secondaryText: string;
  secondaryIcon:
    | "sent"
    | "received"
    | "swap"
    | "add"
    | "remove"
    | "globe"
    | "contract"
    | "failed"
    | "settings"
    | null;
  /**
   * Signed display amounts, credit first for swaps (["+40.40 USDC",
   * "-40 XLM"]); "multiple" when >2 distinct tokens moved; null for pure
   * config changes.
   */
  amounts:
    | { text: string; direction: "credit" | "debit" }[]
    | "multiple"
    | null;
  details: HistoryEntryDetails;
}
