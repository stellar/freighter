import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { debounce } from "lodash";
import BigNumber from "bignumber.js";

import { NetworkDetails } from "@shared/constants/stellar";
import { AppDispatch } from "popup/App";
import { saveSwapBestPath } from "popup/ducks/transactionSubmission";
import { SwapQuotesError } from "@shared/api/helpers/getSwapQuotes";
import { cleanAmount } from "popup/helpers/formatters";
import { getSwapQuote, getSwapQuoteKey } from "popup/helpers/swapQuote";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";

import { useGetSwapAmountData } from "./useGetSwapAmountData";

type SwapAmountDataState = ReturnType<typeof useGetSwapAmountData>["state"];

// Debounce window for the live "You receive" quote while the user is typing.
const LIVE_QUOTE_DEBOUNCE_MS = 500;

interface UseSwapLiveQuoteParams {
  amount: string;
  asset: string;
  destinationAsset: string;
  destinationAmount: string;
  networkDetails: NetworkDetails;
  publicKey: string;
  isReviewingTx: boolean;
  swapAmountData: SwapAmountDataState;
  dispatch: AppDispatch;
}

/**
 * Live quote: debounce the source amount and fetch the best path so the "You
 * receive" amount updates as the user types. A lightweight path-only lookup (no
 * XDR build / Blockaid scan / quote-expiry surfacing) — the full simulation runs
 * at review time. A monotonic request id discards out-of-order responses;
 * failures reset the displayed amount to 0 so a stale quote never lingers. Reads
 * the latest asset/destination/network/destinationAmount/isReviewing via refs so
 * the debounced callback stays stable and quote results don't re-trigger the
 * effect (which would loop).
 *
 * Returns isLiveQuoteLoading so the CTA can tell "still loading a quote" apart
 * from "no path exists", and isSwapUnavailable when the backend can't quote at
 * all. All path results flow through Redux (saveSwapBestPath).
 */
export const useSwapLiveQuote = ({
  amount,
  asset,
  destinationAsset,
  destinationAmount,
  networkDetails,
  publicKey,
  isReviewingTx,
  swapAmountData,
  dispatch,
}: UseSwapLiveQuoteParams) => {
  const [isLiveQuoteLoading, setIsLiveQuoteLoading] = useState(false);
  const [isSwapUnavailable, setIsSwapUnavailable] = useState(false);

  const liveQuoteReqRef = useRef(0);
  const liveQuoteArgsRef = useRef({
    asset,
    destinationAsset,
    networkDetails,
    publicKey,
  });
  liveQuoteArgsRef.current = {
    asset,
    destinationAsset,
    networkDetails,
    publicKey,
  };
  const destinationAmountRef = useRef(destinationAmount);
  destinationAmountRef.current = destinationAmount;
  // Once the review sheet is open the quote is frozen — a late live quote must
  // not overwrite (or reset) the amount being reviewed.
  const isReviewingRef = useRef(isReviewingTx);
  isReviewingRef.current = isReviewingTx;

  const debouncedQuote = useMemo(
    () =>
      debounce((quoteAmount: string) => {
        const reqId = ++liveQuoteReqRef.current;
        const {
          asset: src,
          destinationAsset: dst,
          networkDetails: net,
          publicKey: account,
        } = liveQuoteArgsRef.current;
        const quoteParams = {
          mode: "send" as const,
          amount: quoteAmount,
          sourceAsset: src,
          destAsset: dst,
          networkDetails: net,
          publicKey: account,
        };
        (async () => {
          try {
            const { route, quotes, key } = await getSwapQuote(quoteParams);
            if (liveQuoteReqRef.current !== reqId || isReviewingRef.current) {
              return; // superseded by a newer quote, or frozen for review
            }
            // Stop signalling "loading" so the CTA can distinguish a missing
            // path from a pending one.
            setIsLiveQuoteLoading(false);
            setIsSwapUnavailable(false);
            dispatch(
              saveSwapBestPath({
                path: route?.path ?? [],
                destinationAmount: route?.destinationAmount ?? "0",
                quotes,
                key,
              }),
            );
          } catch (e) {
            if (liveQuoteReqRef.current !== reqId || isReviewingRef.current) {
              return;
            }
            setIsLiveQuoteLoading(false);
            setIsSwapUnavailable(
              e instanceof SwapQuotesError && e.kind === "unavailable",
            );
            // No path / bad input / network error: clear the stale amount.
            dispatch(
              saveSwapBestPath({
                path: [],
                destinationAmount: "0",
                key: getSwapQuoteKey(quoteParams),
              }),
            );
          }
        })();
      }, LIVE_QUOTE_DEBOUNCE_MS),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; reads the latest asset/destination/network via liveQuoteArgsRef so it stays stable across renders
    [],
  );

  const cancelLiveQuote = useCallback(() => {
    debouncedQuote.cancel();
    liveQuoteReqRef.current += 1;
  }, [debouncedQuote]);

  useEffect(
    () => () => {
      debouncedQuote.cancel();
      liveQuoteReqRef.current += 1;
    },
    [debouncedQuote],
  );

  useEffect(() => {
    if (
      swapAmountData.state !== RequestState.SUCCESS ||
      swapAmountData.data?.type !== AppDataType.RESOLVED ||
      !destinationAsset
    ) {
      return;
    }
    // The crypto amount is the source of truth in both display modes (the fiat
    // input keeps it in sync), so quote it directly.
    const cryptoAmount = cleanAmount(amount || "0");

    if (new BigNumber(cryptoAmount || "0").isGreaterThan(0)) {
      setIsLiveQuoteLoading(true);
      debouncedQuote(cryptoAmount);
    } else {
      // Source amount cleared: cancel any pending/in-flight quote and reset the
      // received amount so the card shows 0 (skip the dispatch if already 0).
      setIsLiveQuoteLoading(false);
      setIsSwapUnavailable(false);
      debouncedQuote.cancel();
      liveQuoteReqRef.current += 1;
      if (
        destinationAmountRef.current !== "0" &&
        destinationAmountRef.current !== ""
      ) {
        dispatch(saveSwapBestPath({ path: [], destinationAmount: "0" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debouncedQuote/dispatch are stable and destinationAmount is read via a ref, so quote results don't re-trigger this effect (which would loop)
  }, [
    amount,
    asset,
    destinationAsset,
    swapAmountData.state,
    publicKey,
    networkDetails.network,
    networkDetails.networkUrl,
  ]);

  return { isLiveQuoteLoading, isSwapUnavailable, cancelLiveQuote };
};
