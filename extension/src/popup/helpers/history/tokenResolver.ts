/**
 * Resolves the token contract addresses (C...) referenced by a page of v2
 * history state changes into display data, batched and cached.
 *
 * Resolution order per token id:
 *  1. the network's native SAC → XLM, 7 decimals
 *  2. the account's own balances (classic SACs derived via Asset.contractId)
 *  3. curated token lists — code/decimals/icon, no network call
 *  4. token details (getTokenDetails) — symbol/name/decimals
 *  5. fallback: truncated contract id, UNKNOWN decimals, no icon
 *
 * `decimals: null` means "we could not determine the scale". It is not a
 * synonym for 7: the v2 payload gives amounts as smallest-unit integers with no
 * decimals field, so scaling by a guessed 7 renders a SEP-41 token with 18
 * decimals 10^11 times too large. Callers must render no amount instead —
 * see mapBalanceChanges and classify's signedAmount.
 *
 * `publicKey` is required because the token-details endpoint validates it and
 * 400s on an empty string, which silently sent every token to the fallback.
 *
 * The mappers are synchronous — call buildTokenContext() once per page before
 * mapping, then hand the returned map to mapV2Transaction.
 */

import { Asset } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import {
  AssetListReponseItem,
  AssetListResponse,
} from "@shared/constants/soroban/asset-list";
import { getTokenDetails } from "@shared/api/internal";
import { getIconFromTokenLists } from "@shared/api/helpers/getIconFromTokenList";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { AccountBalances } from "helpers/hooks/useGetBalances";

import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { CLASSIC_ASSET_DECIMALS } from "popup/helpers/soroban";
import { ResolvedToken } from "popup/views/AccountHistory/model";

export type TokenContext = Map<string, ResolvedToken>;

const truncateContractId = (contractId: string) =>
  `${contractId.slice(0, 4)}…${contractId.slice(-4)}`;

/** What a token id resolves to when nothing knows it: name it, don't scale it. */
const unresolvedToken = (contractId: string): ResolvedToken => ({
  code: truncateContractId(contractId),
  contractId,
  issuer: null,
  icon: null,
  decimals: null,
});

/**
 * Find a token id in the enabled curated lists. `contract` on a list entry is
 * best-effort (see AssetListReponseItem), and entries carry `decimals`, which is
 * why this reads the record directly instead of going through
 * getIconFromTokenLists — that helper only returns an icon, and only for records
 * that have one.
 */
const findInTokenLists = (
  contractId: string,
  assetsListsData: AssetListResponse[],
): AssetListReponseItem | null => {
  for (const list of assetsListsData) {
    for (const record of list.assets ?? []) {
      if (record.contract?.toUpperCase() === contractId.toUpperCase()) {
        return record;
      }
    }
  }
  return null;
};

/** Index the account's classic balances by their SAC contract address */
const indexBalancesByContractId = (
  balances: AccountBalances | undefined,
  networkPassphrase: string,
): TokenContext => {
  const byContract: TokenContext = new Map();
  if (!balances?.balances) {
    return byContract;
  }

  for (const balance of Object.values(balances.balances)) {
    const token = "token" in balance ? balance.token : null;
    if (!token || !("code" in token)) {
      continue;
    }

    // Soroban tokens carry their contract id directly
    const directContractId =
      "contractId" in balance && typeof balance.contractId === "string"
        ? balance.contractId
        : null;

    const issuerKey =
      "issuer" in token && token.issuer && "key" in token.issuer
        ? token.issuer.key
        : null;

    let contractId = directContractId;
    if (!contractId && issuerKey) {
      try {
        contractId = new Asset(token.code, issuerKey).contractId(
          networkPassphrase,
        );
      } catch {
        contractId = null;
      }
    }
    if (!contractId) {
      continue;
    }

    // Reuse the icons already fetched for the account's balances (keyed by
    // canonical code:issuer) so held tokens like USDC render their logo
    // instead of the lettered fallback.
    const icon =
      balances?.icons?.[
        getCanonicalFromAsset(token.code, issuerKey ?? undefined)
      ] ?? null;

    const balanceDecimals =
      "decimals" in balance && typeof balance.decimals === "number"
        ? balance.decimals
        : null;

    byContract.set(contractId, {
      code: token.code,
      contractId,
      issuer: issuerKey,
      icon,
      // A classic asset reached here via Asset.contractId, so 7 is true by
      // definition. A Soroban balance carries its own decimals; if it somehow
      // arrives without them we don't know the scale.
      decimals:
        balanceDecimals ?? (directContractId ? null : CLASSIC_ASSET_DECIMALS),
    });
  }

  return byContract;
};

interface BuildTokenContextParams {
  tokenIds: string[];
  networkDetails: NetworkDetails;
  /** the active account; the token-details endpoint rejects an empty pub_key */
  publicKey: string;
  balances?: AccountBalances;
  assetsListsData?: AssetListResponse[];
  /** injectable for tests */
  getTokenDetailsFn?: typeof getTokenDetails;
}

export const buildTokenContext = async ({
  tokenIds,
  networkDetails,
  publicKey,
  balances,
  assetsListsData = [],
  getTokenDetailsFn = getTokenDetails,
}: BuildTokenContextParams): Promise<TokenContext> => {
  const context: TokenContext = new Map();
  const uniqueIds = [...new Set(tokenIds)];

  const nativeContract = getNativeContractDetails(networkDetails).contract;
  const balancesByContract = indexBalancesByContractId(
    balances,
    networkDetails.networkPassphrase,
  );

  await Promise.all(
    uniqueIds.map(async (tokenId) => {
      // 1. native SAC
      if (tokenId === nativeContract) {
        context.set(tokenId, {
          code: "XLM",
          contractId: tokenId,
          issuer: null,
          icon: null,
          decimals: CLASSIC_ASSET_DECIMALS,
        });
        return;
      }

      // 2. account balances
      const fromBalances = balancesByContract.get(tokenId);
      if (fromBalances) {
        context.set(tokenId, fromBalances);
        return;
      }

      // 3. curated token lists — code, decimals and icon with no network call
      const listed = findInTokenLists(tokenId, assetsListsData);
      if (listed && typeof listed.decimals === "number") {
        // for its icon → background cache side effect
        await getIconFromTokenLists({
          contractId: tokenId,
          code: listed.code,
          assetsListsData,
        }).catch(() => null);
        context.set(tokenId, {
          code: listed.code,
          contractId: tokenId,
          issuer: null,
          icon: listed.icon || null,
          decimals: listed.decimals,
        });
        return;
      }

      // 4. token details. getTokenDetails swallows its own errors and returns
      // null, so both branches land on the fallback below.
      try {
        const details = await getTokenDetailsFn({
          contractId: tokenId,
          publicKey,
          networkDetails,
        });
        if (details && typeof details.decimals === "number") {
          const listMatch = await getIconFromTokenLists({
            contractId: tokenId,
            code: details.symbol,
            assetsListsData,
          }).catch(() => null);
          context.set(tokenId, {
            code: details.symbol,
            contractId: tokenId,
            issuer: null,
            icon: listMatch?.icon || null,
            decimals: details.decimals,
          });
          return;
        }
        if (details) {
          // symbol without decimals: name the token, but don't scale amounts
          context.set(tokenId, {
            ...unresolvedToken(tokenId),
            code: details.symbol,
          });
          return;
        }
      } catch {
        // fall through to the fallback entry below
      }

      // 5. unresolved
      context.set(tokenId, unresolvedToken(tokenId));
    }),
  );

  return context;
};

/** Safe lookup with the same fallback shape buildTokenContext produces */
export const getResolvedToken = (
  context: TokenContext,
  tokenId: string,
): ResolvedToken => context.get(tokenId) ?? unresolvedToken(tokenId);
