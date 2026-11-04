import { Horizon, StrKey } from "stellar-sdk";

import { getSwapQuotes } from "@shared/api/helpers/getSwapQuotes";
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

export interface SwapQuoteResult {
  /** null = no route. */
  route: SwapQuoteRoute | null;
  /** The full backend response; null on custom networks (Horizon). */
  quotes: SwapQuotesResponse | null;
}

// The client still builds a classic path payment itself, so only the classic
// route is usable, even when another source quotes better.
export const pickSwapRoute = (quotes: SwapQuotesResponse) =>
  quotes.routes.find((route) => route.source === "classic");

const toBackendAsset = (canonical: string) => {
  if (isNativeAssetId(canonical)) {
    return "XLM";
  }
  const issuer = canonical.split(":")[1];
  return issuer && StrKey.isValidContract(issuer) ? issuer : canonical;
};

const fromBackendAsset = (asset: string) => {
  const [code, issuer] = asset.split(":");
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
export const getSwapQuote = async ({
  mode,
  amount,
  sourceAsset,
  destAsset,
  networkDetails,
  publicKey,
}: {
  mode: SwapQuoteMode;
  amount: string;
  sourceAsset: string;
  destAsset: string;
  networkDetails: NetworkDetails;
  publicKey: string;
}): Promise<SwapQuoteResult> => {
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
    return { route: routeFromHorizon(record), quotes: null };
  }

  const quotes = await getSwapQuotes({
    network: networkDetails.network,
    account: publicKey,
    mode,
    fromAsset: toBackendAsset(sourceAsset),
    toAsset: toBackendAsset(destAsset),
    amount: cleanAmount(amount),
  });
  const route = pickSwapRoute(quotes);
  return { route: route ? routeFromBackend(route) : null, quotes };
};
