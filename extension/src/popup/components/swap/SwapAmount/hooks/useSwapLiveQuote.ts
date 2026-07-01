import { useEffect, useMemo, useRef, useState } from "react";
import { debounce } from "lodash";
import BigNumber from "bignumber.js";

import { NetworkDetails } from "@shared/constants/stellar";
import { AppDispatch } from "popup/App";
import { saveSwapBestPath } from "popup/ducks/transactionSubmission";
import { cleanAmount } from "popup/helpers/formatters";
import { getCanonicalFromAsset } from "helpers/stellar";
import { getAssetDecimals } from "popup/helpers/soroban";
import { horizonGetBestPath } from "popup/helpers/horizonGetBestPath";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { InputType } from "helpers/transaction";

import { useGetSwapAmountData } from "./useGetSwapAmountData";

type SwapAmountDataState = ReturnType<typeof useGetSwapAmountData>["state"];

// Debounce window for the live "You receive" quote while the user is typing.
const LIVE_QUOTE_DEBOUNCE_MS = 500;

interface UseSwapLiveQuoteParams {
  amount: string;
  amountUsd: string;
  asset: string;
  destinationAsset: string;
  inputType: InputType;
  isToken: boolean;
  destinationAmount: string;
  networkDetails: NetworkDetails;
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
 * from "no path exists". All path results flow through Redux (saveSwapBestPath).
 */
export const useSwapLiveQuote = ({
  amount,
  amountUsd,
  asset,
  destinationAsset,
  inputType,
  isToken,
  destinationAmount,
  networkDetails,
  isReviewingTx,
  swapAmountData,
  dispatch,
}: UseSwapLiveQuoteParams) => {
  const [isLiveQuoteLoading, setIsLiveQuoteLoading] = useState(false);

  const liveQuoteReqRef = useRef(0);
  const liveQuoteArgsRef = useRef({ asset, destinationAsset, networkDetails });
  liveQuoteArgsRef.current = { asset, destinationAsset, networkDetails };
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
        } = liveQuoteArgsRef.current;
        (async () => {
          try {
            const bestPath = await horizonGetBestPath({
              amount: quoteAmount,
              sourceAsset: src,
              destAsset: dst,
              networkDetails: net,
            });
            if (liveQuoteReqRef.current !== reqId || isReviewingRef.current) {
              return; // superseded by a newer quote, or frozen for review
            }
            // Stop signalling "loading" so the CTA can distinguish a missing
            // path from a pending one.
            setIsLiveQuoteLoading(false);
            if (!bestPath?.destination_amount) {
              dispatch(saveSwapBestPath({ path: [], destinationAmount: "0" }));
              return;
            }
            const path: string[] = [];
            bestPath.path.forEach((p) => {
              if (!p.asset_code && !p.asset_issuer) {
                path.push(p.asset_type);
              } else {
                path.push(getCanonicalFromAsset(p.asset_code, p.asset_issuer));
              }
            });
            dispatch(
              saveSwapBestPath({
                path,
                destinationAmount: bestPath.destination_amount,
              }),
            );
          } catch {
            if (liveQuoteReqRef.current !== reqId || isReviewingRef.current) {
              return;
            }
            setIsLiveQuoteLoading(false);
            // No path / network error: clear the stale received amount.
            dispatch(saveSwapBestPath({ path: [], destinationAmount: "0" }));
          }
        })();
      }, LIVE_QUOTE_DEBOUNCE_MS),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; reads the latest asset/destination/network via liveQuoteArgsRef so it stays stable across renders
    [],
  );

  useEffect(() => () => debouncedQuote.cancel(), [debouncedQuote]);

  useEffect(() => {
    if (
      swapAmountData.state !== RequestState.SUCCESS ||
      swapAmountData.data?.type !== AppDataType.RESOLVED ||
      !destinationAsset
    ) {
      return;
    }
    const livePrices = swapAmountData.data.tokenPrices;
    const liveSrcPrice = livePrices[asset]?.currentPrice;
    const liveDecimals = getAssetDecimals(
      asset,
      swapAmountData.data.userBalances,
      isToken,
    );
    const cryptoAmount =
      inputType === "fiat"
        ? liveSrcPrice
          ? new BigNumber(cleanAmount(amountUsd || "0"))
              .dividedBy(new BigNumber(liveSrcPrice))
              .decimalPlaces(liveDecimals)
              .toString()
          : "0"
        : cleanAmount(amount || "0");

    if (new BigNumber(cryptoAmount || "0").isGreaterThan(0)) {
      setIsLiveQuoteLoading(true);
      debouncedQuote(cryptoAmount);
    } else {
      // Source amount cleared: cancel any pending/in-flight quote and reset the
      // received amount so the card shows 0 (skip the dispatch if already 0).
      setIsLiveQuoteLoading(false);
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
    amountUsd,
    asset,
    destinationAsset,
    inputType,
    swapAmountData.state,
  ]);

  return { isLiveQuoteLoading };
};
