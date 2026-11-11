import BigNumber from "bignumber.js";
import { Horizon, StrKey } from "stellar-sdk";

import {
  getSwapQuotes,
  SwapQuotesError,
} from "@shared/api/helpers/getSwapQuotes";
import {
  SwapQuoteMode,
  SwapQuotesResponse,
  SwapRoute,
} from "@shared/api/types/backend-api";
import { NetworkDetails } from "@shared/constants/stellar";
import { isNativeAssetId } from "@shared/helpers/assetIdentity";
import {
  getCanonicalFromAsset,
  isCustomNetwork,
  splitCanonical,
} from "@shared/helpers/stellar";
import { cleanAmount } from "popup/helpers/formatters";
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

export const toBackendAsset = (canonical: string) => {
  if (isNativeAssetId(canonical)) {
    return "XLM";
  }
  const { issuer } = splitCanonical(canonical);
  return StrKey.isValidContract(issuer) ? issuer : canonical;
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
