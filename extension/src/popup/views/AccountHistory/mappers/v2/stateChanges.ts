/**
 * Maps the non-BALANCE v2 state-change variants into StateChangeCardData for
 * the detail sheet, grouping same-verb changes into one card (signers,
 * trustlines, balance authorizations) and merging flag SET/CLEAR pairs —
 * matching the Figma card layouts.
 *
 * Each variant carries typed fields, so the switch reads them directly; the
 * old/new JSON-blob parsing the previous wire shape required is gone.
 */

import BigNumber from "bignumber.js";

import { V2StateChange } from "@shared/api/types/backend-api";
import { formatTokenAmount } from "popup/helpers/soroban";
import {
  getResolvedToken,
  TokenContext,
} from "popup/helpers/history/tokenResolver";
import {
  DataEntryItem,
  DataEntryVerb,
  SignerEntry,
  StateChangeCardData,
  TrustlineEntry,
} from "popup/views/AccountHistory/model";

/**
 * Trustline and balance-authorization changes carry either a token id or a
 * liquidity pool id. Pools have no token metadata to resolve, so the pool id
 * stands in as the code and getResolvedToken's unknown-token fallback applies.
 */
const resolveTrustlineToken = (
  tokens: TokenContext,
  change: { token_id?: string; liquidity_pool_id?: string },
) =>
  getResolvedToken(tokens, change.token_id ?? change.liquidity_pool_id ?? "");

export const mapStateChangeCards = (
  changes: V2StateChange[],
  tokens: TokenContext,
  publicKey: string,
): StateChangeCardData[] => {
  const cards: StateChangeCardData[] = [];

  const signersByVerb = new Map<
    "added" | "updated" | "removed",
    SignerEntry[]
  >();
  const trustlinesByVerb = new Map<
    "created" | "updated" | "removed",
    TrustlineEntry[]
  >();
  const dataEntriesByVerb = new Map<DataEntryVerb, DataEntryItem[]>();
  const authorizedTokens: ReturnType<typeof getResolvedToken>[] = [];
  const unauthorizedTokens: ReturnType<typeof getResolvedToken>[] = [];
  const flagsSet: string[] = [];
  const flagsCleared: string[] = [];

  const addSigner = (
    verb: "added" | "updated" | "removed",
    entry: SignerEntry,
  ) => {
    const entries = signersByVerb.get(verb) ?? [];
    entries.push(entry);
    signersByVerb.set(verb, entries);
  };

  const addDataEntry = (verb: DataEntryVerb, entry: DataEntryItem) => {
    const entries = dataEntriesByVerb.get(verb) ?? [];
    entries.push(entry);
    dataEntriesByVerb.set(verb, entries);
  };

  const addTrustline = (
    verb: "created" | "updated" | "removed",
    entry: TrustlineEntry,
  ) => {
    const entries = trustlinesByVerb.get(verb) ?? [];
    entries.push(entry);
    trustlinesByVerb.set(verb, entries);
  };

  for (const change of changes) {
    switch (change.variant) {
      // Balance movements render as amount rows, not cards — see balances.ts
      case "BalanceChange":
        break;

      case "AccountCreatedChange":
        cards.push({
          kind: "accountCreated",
          address: publicKey,
          funder: change.creator_address,
        });
        break;

      case "AccountMergedChange":
        cards.push({ kind: "accountMerged" });
        break;

      case "SignerAddedChange":
        addSigner("added", {
          address: change.signer_address,
          weightOld: null,
          weightNew: change.new_weight,
        });
        break;

      case "SignerUpdatedChange":
        addSigner("updated", {
          address: change.signer_address,
          weightOld: change.old_weight,
          weightNew: change.new_weight,
        });
        break;

      case "SignerRemovedChange":
        addSigner("removed", {
          address: change.signer_address,
          weightOld: change.old_weight ?? null,
          weightNew: null,
        });
        break;

      case "ThresholdChange":
        cards.push({
          kind: "thresholds",
          level:
            change.threshold === "LOW"
              ? "low"
              : change.threshold === "HIGH"
                ? "high"
                : "medium",
          valueOld:
            change.old_threshold !== undefined
              ? String(change.old_threshold)
              : null,
          valueNew: String(change.new_threshold),
        });
        break;

      case "AccountFlagsChange":
        if (change.reason === "SET") {
          flagsSet.push(...change.flags);
        } else {
          flagsCleared.push(...change.flags);
        }
        break;

      case "HomeDomainSetChange":
        cards.push({
          kind: "homeDomain",
          verb: "set",
          domainOld: null,
          domainNew: change.home_domain,
        });
        break;

      case "HomeDomainUpdatedChange":
        cards.push({
          kind: "homeDomain",
          verb: "updated",
          domainOld: change.old_home_domain,
          domainNew: change.new_home_domain,
        });
        break;

      case "HomeDomainClearedChange":
        cards.push({
          kind: "homeDomain",
          verb: "removed",
          domainOld: change.old_home_domain,
          domainNew: null,
        });
        break;

      case "DataEntryAddedChange":
        addDataEntry("added", {
          key: change.name,
          valueOldB64: null,
          valueNewB64: change.value,
        });
        break;

      case "DataEntryUpdatedChange":
        addDataEntry("updated", {
          key: change.name,
          valueOldB64: change.old_value,
          valueNewB64: change.new_value,
        });
        break;

      case "DataEntryRemovedChange":
        addDataEntry("removed", {
          key: change.name,
          valueOldB64: change.old_value,
          valueNewB64: null,
        });
        break;

      case "AllowanceChange": {
        const token = getResolvedToken(tokens, change.token_id);
        cards.push({
          kind: "allowance",
          token,
          spender: change.spender,
          amount:
            token.decimals === null
              ? null
              : formatTokenAmount(new BigNumber(change.amount), token.decimals),
          expirationLedger: change.expiration_ledger,
        });
        break;
      }

      case "TrustlineAddedChange":
        addTrustline("created", {
          token: resolveTrustlineToken(tokens, change),
          limitOld: null,
          limitNew: change.limit,
        });
        break;

      case "TrustlineUpdatedChange":
        addTrustline("updated", {
          token: resolveTrustlineToken(tokens, change),
          limitOld: change.old_limit,
          limitNew: change.new_limit,
        });
        break;

      case "TrustlineRemovedChange":
        addTrustline("removed", {
          token: resolveTrustlineToken(tokens, change),
          limitOld: null,
          limitNew: null,
        });
        break;

      case "BalanceAuthorizationChange": {
        const token = resolveTrustlineToken(tokens, change);
        if (change.reason === "SET") {
          authorizedTokens.push(token);
        } else {
          unauthorizedTokens.push(token);
        }
        break;
      }

      default:
        break;
    }
  }

  // Grouped cards in the Figma's display order: signers, data entries,
  // trustlines, authorizations, flags
  for (const verb of ["added", "updated", "removed"] as const) {
    const entries = signersByVerb.get(verb);
    if (entries) {
      cards.push({ kind: "signers", verb, entries });
    }
  }
  for (const verb of ["added", "updated", "removed"] as const) {
    const entries = dataEntriesByVerb.get(verb);
    if (entries) {
      cards.push({ kind: "dataEntry", verb, entries });
    }
  }
  for (const verb of ["created", "updated", "removed"] as const) {
    const entries = trustlinesByVerb.get(verb);
    if (entries) {
      cards.push({ kind: "trustlines", verb, entries });
    }
  }
  if (authorizedTokens.length) {
    cards.push({
      kind: "balanceAuthorizations",
      authorized: true,
      tokens: authorizedTokens,
    });
  }
  if (unauthorizedTokens.length) {
    cards.push({
      kind: "balanceAuthorizations",
      authorized: false,
      tokens: unauthorizedTokens,
    });
  }
  if (flagsSet.length || flagsCleared.length) {
    cards.push({ kind: "flags", set: flagsSet, cleared: flagsCleared });
  }

  return cards;
};
