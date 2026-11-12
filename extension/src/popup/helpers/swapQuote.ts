import BigNumber from "bignumber.js";
import { Horizon } from "stellar-sdk";

import {
  getSwapQuotes,
  SwapQuotesError,
} from "@shared/api/helpers/getSwapQuotes";
import {
  SwapQuoteMode,
  SwapQuotesResponse,
  SwapRoute,
} from "@shared/api/types/backend-api";
import { AssetType } from "@shared/api/types/account-balance";
import { NetworkDetails } from "@shared/constants/stellar";
import { isNativeAssetId } from "@shared/helpers/assetIdentity";
import {
  getCanonicalFromAsset,
  isCustomNetwork,
  splitCanonical,
} from "@shared/helpers/stellar";
import { findAssetBalance } from "popup/helpers/balance";
import { cleanAmount } from "popup/helpers/formatters";
import { isContractId } from "popup/helpers/soroban";
import {
  horizonGetBestPath,
  horizonGetBestReceivePath,
} from "popup/helpers/horizonGetBestPath";

export interface SwapQuoteRoute {
  sourceAmount: string;
  destinationAmount: string;
  /** Intermediate assets, canonical form, for the path payment. */
  path: string[];
}

/** The request a quote answered; a stored quote is only reused for an equal key. */
export interface SwapQuoteKey {
  account: string;
  network: string;
  networkUrl: string;
  mode: SwapQuoteMode;
  sourceAsset: string;
  destAsset: string;
  amount: string;
}

export interface SwapQuoteResult {
  /** null = no route. */
  route: SwapQuoteRoute | null;
  /** The full backend response; null on custom networks (Horizon). */
  quotes: SwapQuotesResponse | null;
  key: SwapQuoteKey;
}

interface SwapQuoteParams {
  mode: SwapQuoteMode;
  amount: string;
  sourceAsset: string;
  destAsset: string;
  networkDetails: NetworkDetails;
  publicKey: string;
}

export const getSwapQuoteKey = ({
  mode,
  amount,
  sourceAsset,
  destAsset,
  networkDetails,
  publicKey,
}: SwapQuoteParams): SwapQuoteKey => ({
  account: publicKey,
  network: networkDetails.network,
  networkUrl: networkDetails.networkUrl,
  mode,
  sourceAsset,
  destAsset,
  // The backend accepts only plain decimals: no "5.", ".5" or exponent.
  amount: new BigNumber(cleanAmount(amount)).toFixed(),
});

export const isSameSwapQuoteKey = (
  a: SwapQuoteKey | null | undefined,
  b: SwapQuoteKey,
) =>
  !!a &&
  a.account === b.account &&
  a.network === b.network &&
  a.networkUrl === b.networkUrl &&
  a.mode === b.mode &&
  a.sourceAsset === b.sourceAsset &&
  a.destAsset === b.destAsset &&
  new BigNumber(a.amount).isEqualTo(b.amount);

// Classic reasons that mean the source is down rather than that the pair has
// no route.
const CLASSIC_OUTAGE_REASONS = ["error", "timeout", "rate_limited"];

// The backend ranks routes best first.
export const pickSwapRoute = (
  quotes: SwapQuotesResponse,
): SwapRoute | undefined => quotes.routes[0];

const isContractToken = (canonical: string) =>
  isContractId(splitCanonical(canonical).issuer);

/**
 * What makes two swap tokens the same token. A contract token's code differs
 * between sources (the contract's symbol on a held balance, stellar.expert's
 * code on a search row), so its contract ID alone identifies it.
 */
export const swapIdentityKey = (canonical: string) =>
  isContractToken(canonical) ? splitCanonical(canonical).issuer : canonical;

export const toBackendAsset = (canonical: string) => {
  if (isNativeAssetId(canonical)) {
    return "XLM";
  }
  return isContractToken(canonical)
    ? splitCanonical(canonical).issuer
    : canonical;
};

/** A held contract token's decimals; undefined for anything else. */
export const getHeldTokenDecimals = (
  canonical: string,
  balances: AssetType[],
): number | undefined => {
  if (!isContractToken(canonical)) {
    return undefined;
  }
  const held = findAssetBalance(balances, splitCanonical(canonical));
  return held && "decimals" in held ? Number(held.decimals) : undefined;
};

const fromBackendAsset = (asset: string) => {
  const { code, issuer } = splitCanonical(asset);
  return getCanonicalFromAsset(code, issuer);
};

const routeFromBackend = (route: SwapRoute): SwapQuoteRoute | null => {
  const hops = route.paths[0]?.hops;
  if (!hops?.length) {
    return null;
  }
  return {
    sourceAmount: route.fromAmount,
    destinationAmount: route.toAmount,
    path: hops.slice(1).map((hop) => fromBackendAsset(hop.from)),
  };
};

const routeFromHorizon = (
  record?: Horizon.ServerApi.PaymentPathRecord,
): SwapQuoteRoute | null => {
  if (!record?.destination_amount) {
    return null;
  }
  return {
    sourceAmount: record.source_amount,
    destinationAmount: record.destination_amount,
    path: record.path.map((p) =>
      !p.asset_code && !p.asset_issuer
        ? p.asset_type
        : getCanonicalFromAsset(p.asset_code, p.asset_issuer),
    ),
  };
};

/**
 * `amount` is sold in "send" mode and received in "receive" mode. Custom
 * networks use Horizon directly because the backend can't reach them.
 */
export const getSwapQuote = async (
  params: SwapQuoteParams,
): Promise<SwapQuoteResult> => {
  const { mode, sourceAsset, destAsset, networkDetails, publicKey } = params;
  const key = getSwapQuoteKey(params);
  const { amount } = key;
  if (isCustomNetwork(networkDetails)) {
    // Contract tokens route only through the backend's Soroban sources.
    if (isContractToken(sourceAsset) || isContractToken(destAsset)) {
      return { route: null, quotes: null, key };
    }
    const record =
      mode === "send"
        ? await horizonGetBestPath({
            amount,
            sourceAsset,
            destAsset,
            networkDetails,
          })
        : await horizonGetBestReceivePath({
            destinationAmount: amount,
            sourceAsset,
            destAsset,
            networkDetails,
          });
    return { route: routeFromHorizon(record), quotes: null, key };
  }

  const quotes = await getSwapQuotes({
    network: networkDetails.network,
    account: publicKey,
    mode,
    fromAsset: toBackendAsset(sourceAsset),
    toAsset: toBackendAsset(destAsset),
    amount,
  });
  const route = pickSwapRoute(quotes);
  if (!route) {
    const outage = quotes.unavailable.find(
      (u) =>
        u.source === "classic" && CLASSIC_OUTAGE_REASONS.includes(u.reason),
    );
    if (outage) {
      throw new SwapQuotesError(
        "unavailable",
        `Swap quotes: classic source ${outage.reason}`,
      );
    }
  }
  return { route: route ? routeFromBackend(route) : null, quotes, key };
};
