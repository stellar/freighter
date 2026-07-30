/**
 * Maps the 8 non-BALANCE v2 state-change categories into StateChangeCardData
 * for the detail sheet, grouping same-verb changes into one card (signers,
 * trustlines, balance authorizations) and merging flag SET/CLEAR pairs —
 * matching the Figma card layouts.
 *
 * Old/new values arrive as JSON strings (see @shared/api/types/backend-api.ts
 * encodings) and are parsed defensively — a malformed value degrades to nulls
 * rather than dropping the card.
 */

import { V2StateChange } from "@shared/api/types/backend-api";
import {
  getResolvedToken,
  TokenContext,
} from "popup/helpers/history/tokenResolver";
import {
  SignerEntry,
  StateChangeCardData,
  TrustlineEntry,
} from "popup/views/AccountHistory/model";

type OldNew<T> = { old: T | null; new: T | null };

const parseOldNew = <T>(raw: string | undefined | null): OldNew<T> => {
  if (!raw) {
    return { old: null, new: null };
  }
  try {
    const parsed = JSON.parse(raw) as { old?: T | null; new?: T | null };
    return { old: parsed.old ?? null, new: parsed.new ?? null };
  } catch {
    return { old: null, new: null };
  }
};

/** {"<key>": {"old": ..., "new": ...}} → [key, {old, new}] */
const parseKeyValue = (
  raw: string,
): { key: string; values: OldNew<string> } | null => {
  try {
    const parsed = JSON.parse(raw) as Record<
      string,
      { old?: string | null; new?: string | null }
    >;
    const [key] = Object.keys(parsed);
    if (!key) {
      return null;
    }
    const values = parsed[key] ?? {};
    return {
      key,
      values: { old: values.old ?? null, new: values.new ?? null },
    };
  } catch {
    return null;
  }
};

const verbFromOldNew = (
  values: OldNew<string>,
): "added" | "updated" | "removed" => {
  if (values.old && values.new) {
    return "updated";
  }
  return values.new ? "added" : "removed";
};

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
  const authorizedTokens: ReturnType<typeof getResolvedToken>[] = [];
  const unauthorizedTokens: ReturnType<typeof getResolvedToken>[] = [];
  const flagsSet: string[] = [];
  const flagsCleared: string[] = [];

  for (const change of changes) {
    switch (change.type) {
      case "BALANCE":
        break;

      case "ACCOUNT": {
        if (change.reason === "CREATE") {
          cards.push({
            kind: "accountCreated",
            address: publicKey,
            funder: change.funder_address ?? null,
          });
        } else {
          cards.push({ kind: "accountMerged" });
        }
        break;
      }

      case "SIGNER": {
        const weights = parseOldNew<number>(change.signer_weights);
        const verb =
          change.reason === "ADD"
            ? "added"
            : change.reason === "REMOVE"
              ? "removed"
              : "updated";
        const entries = signersByVerb.get(verb) ?? [];
        entries.push({
          address: change.signer_address ?? "",
          weightOld: weights.old,
          weightNew: weights.new,
        });
        signersByVerb.set(verb, entries);
        break;
      }

      case "SIGNATURE_THRESHOLD": {
        const values = parseOldNew<string>(change.thresholds);
        cards.push({
          kind: "thresholds",
          level:
            change.reason === "LOW"
              ? "low"
              : change.reason === "HIGH"
                ? "high"
                : "medium",
          valueOld: values.old,
          valueNew: values.new,
        });
        break;
      }

      case "METADATA": {
        const entry = parseKeyValue(change.metadata_key_value);
        if (!entry) {
          break;
        }
        if (change.reason === "HOME_DOMAIN") {
          cards.push({
            kind: "homeDomain",
            verb:
              entry.values.old && entry.values.new
                ? "updated"
                : entry.values.new
                  ? "set"
                  : "removed",
            domainOld: entry.values.old,
            domainNew: entry.values.new,
          });
        } else {
          cards.push({
            kind: "dataEntry",
            verb: verbFromOldNew(entry.values),
            key: entry.key,
            valueOldB64: entry.values.old,
            valueNewB64: entry.values.new,
          });
        }
        break;
      }

      case "FLAGS": {
        if (change.reason === "SET") {
          flagsSet.push(...change.flags);
        } else {
          flagsCleared.push(...change.flags);
        }
        break;
      }

      case "TRUSTLINE": {
        const limit = parseOldNew<string>(change.limit);
        const verb =
          change.reason === "CREATE"
            ? "created"
            : change.reason === "REMOVE"
              ? "removed"
              : "updated";
        const entries = trustlinesByVerb.get(verb) ?? [];
        entries.push({
          token: getResolvedToken(tokens, change.trustline_token_id ?? ""),
          limitOld: limit.old,
          limitNew: limit.new,
        });
        trustlinesByVerb.set(verb, entries);
        break;
      }

      case "BALANCE_AUTHORIZATION": {
        const token = getResolvedToken(
          tokens,
          change.balance_auth_token_id ?? "",
        );
        if (change.reason === "SET") {
          authorizedTokens.push(token);
        } else {
          unauthorizedTokens.push(token);
        }
        break;
      }

      case "RESERVES": {
        cards.push({
          kind: "reserves",
          verb: change.reason === "SPONSOR" ? "sponsored" : "unsponsored",
          sponsor: change.sponsor_address ?? null,
          sponsored: change.sponsored_address ?? null,
          detail:
            change.sponsored_trustline ??
            change.sponsored_data ??
            change.claimable_balance_id ??
            change.liquidity_pool_id ??
            null,
        });
        break;
      }

      default:
        break;
    }
  }

  // Grouped cards in the Figma's display order: signers, trustlines,
  // authorizations, flags
  for (const verb of ["added", "updated", "removed"] as const) {
    const entries = signersByVerb.get(verb);
    if (entries) {
      cards.push({ kind: "signers", verb, entries });
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
