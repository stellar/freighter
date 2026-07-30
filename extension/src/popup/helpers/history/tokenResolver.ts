/**
 * Resolves the token contract addresses (C...) referenced by a page of v2
 * history state changes into display data, batched and cached.
 *
 * Resolution order per token id:
 *  1. the network's native SAC → XLM
 *  2. the account's own balances (classic SACs derived via Asset.contractId)
 *  3. curated token lists (getIconFromTokenLists)
 *  4. on-chain token details (getTokenDetails) — symbol/name/decimals
 *  5. fallback: truncated contract id, 7 decimals, no icon
 *
 * The mappers are synchronous — call buildTokenContext() once per page before
 * mapping, then hand the returned map to mapV2Transaction.
 */

import { Asset } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { getTokenDetails } from "@shared/api/internal";
import { getIconFromTokenLists } from "@shared/api/helpers/getIconFromTokenList";
import { AccountBalances } from "helpers/hooks/useGetBalances";

import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { CLASSIC_ASSET_DECIMALS } from "popup/helpers/soroban";
import { ResolvedToken } from "popup/views/AccountHistory/model";

export type TokenContext = Map<string, ResolvedToken>;

const truncateContractId = (contractId: string) =>
  `${contractId.slice(0, 4)}…${contractId.slice(-4)}`;

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

    byContract.set(contractId, {
      code: token.code,
      contractId,
      issuer: issuerKey,
      icon: null,
      decimals:
        "decimals" in balance && typeof balance.decimals === "number"
          ? balance.decimals
          : CLASSIC_ASSET_DECIMALS,
    });
  }

  return byContract;
};

interface BuildTokenContextParams {
  tokenIds: string[];
  networkDetails: NetworkDetails;
  balances?: AccountBalances;
  assetsListsData?: AssetListResponse[];
  /** injectable for tests */
  getTokenDetailsFn?: typeof getTokenDetails;
}

export const buildTokenContext = async ({
  tokenIds,
  networkDetails,
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

      // 3/4. token lists + on-chain details
      try {
        const details = await getTokenDetailsFn({
          contractId: tokenId,
          publicKey: "",
          networkDetails,
        });
        if (details) {
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
            decimals: details.decimals ?? CLASSIC_ASSET_DECIMALS,
          });
          return;
        }
      } catch {
        // fall through to the fallback entry below
      }

      // 5. fallback
      context.set(tokenId, {
        code: truncateContractId(tokenId),
        contractId: tokenId,
        issuer: null,
        icon: null,
        decimals: CLASSIC_ASSET_DECIMALS,
      });
    }),
  );

  return context;
};

/** Safe lookup with the same fallback shape buildTokenContext produces */
export const getResolvedToken = (
  context: TokenContext,
  tokenId: string,
): ResolvedToken =>
  context.get(tokenId) ?? {
    code: truncateContractId(tokenId),
    contractId: tokenId,
    issuer: null,
    icon: null,
    decimals: CLASSIC_ASSET_DECIMALS,
  };
