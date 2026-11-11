import { useEffect, useReducer, useRef, useState } from "react";
import { captureException } from "@sentry/browser";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import BigNumber from "bignumber.js";
import {
  Asset,
  BASE_FEE,
  Memo,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";

import { initialState, reducer } from "helpers/request";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  stroopToXlm,
  xlmToStroop,
} from "helpers/stellar";
import { computeDestMinWithSlippage } from "helpers/transaction";
import { buildChangeTrustOperation } from "popup/helpers/getManageAssetXDR";
import { getSdk, isCustomNetwork } from "@shared/helpers/stellar";

import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import {
  clearSwapQuoteKey,
  saveSimulation,
  saveSwapBestPath,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { useScanTx } from "popup/helpers/blockaid";
import { BlockAidScanTxResult, ErrorMessage } from "@shared/api/types";
import { SwapQuotesError } from "@shared/api/helpers/getSwapQuotes";
import { buildSwapTx, SwapTxError } from "@shared/api/helpers/buildSwapTx";
import { SwapQuotesResponse } from "@shared/api/types/backend-api";
import {
  getSwapQuote,
  getSwapQuoteKey,
  isSameSwapQuoteKey,
  pickSwapRoute,
  SwapQuoteKey,
  toBackendAsset,
} from "popup/helpers/swapQuote";
import { decodeSwapTx, DecodedSwapTx } from "popup/helpers/decodeSwapTx";
import { isQuoteExpiredError } from "popup/helpers/quoteExpiry";
import {
  CLASSIC_ASSET_DECIMALS,
  getDecimalsForAsset,
} from "popup/helpers/soroban";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";
import { AppDispatch } from "popup/App";

const scanUrlstub = "internal";

export const ERROR_TO_DISPLAY = {
  SWAPS_UNAVAILABLE: "Swaps are temporarily unavailable",
  NO_QUOTE: "No quote available",
  TOKEN_DETAILS_UNAVAILABLE:
    "Couldn't read this token's details. Please try again.",
  QUOTE_EXPIRED: "Quote has expired, please try again to get a new quote",
};

const UNKNOWN_ERROR_DISPLAY =
  "We had an issue retrieving your transaction details. Please try again.";

export const getSwapErrorMessage = (error: unknown): string => {
  const errorStr =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : null;
  if (errorStr && Object.values(ERROR_TO_DISPLAY).includes(errorStr)) {
    return errorStr;
  }
  return UNKNOWN_ERROR_DISPLAY;
};

interface SimulationParams {
  sourceAsset: ReturnType<typeof getAssetFromCanonical>;
  destAsset: ReturnType<typeof getAssetFromCanonical>;
  amount: string;
  allowedSlippage: string;
  path: string[];
  transactionFee: string;
  transactionTimeout: number;
  memo?: string;
  // Derived from balances by the caller (a swap is a self path-payment, so the
  // sender needs the destination trustline). Keyed off holdings rather than
  // the pick-time snapshot so defaulted/deep-linked destinations — which never
  // went through the picker — build the changeTrust op too.
  destRequiresTrustline: boolean;
  /** From the held balance; otherwise read on chain at build time. */
  sourceDecimals?: number;
  destDecimals?: number;
}

export interface SimulateTxData {
  transactionXdr: string;
  dstAmountPriceUsd: string;
  scanResult?: BlockAidScanTxResult | null;
  destMin?: string;
  /** What review shows, read from transactionXdr. */
  decoded?: DecodedSwapTx;
  // FeesPane's Soroban breakdown, in XLM.
  inclusionFee?: string;
  resourceFee?: string;
}

export const MIN_PER_OP_FEE = 100; // network minimum, stroops

export const getPerOpBaseFee = (totalFee: string, opCount: number): string => {
  const totalStroops = xlmToStroop(totalFee);
  const perOp = totalStroops.dividedBy(opCount);
  return BigNumber.max(perOp, new BigNumber(MIN_PER_OP_FEE))
    .integerValue(BigNumber.ROUND_FLOOR)
    .toFixed();
};

// Total swap fee shown/charged. A new-trustline swap is two ops (changeTrust
// + pathPaymentStrictSend), so the recommended default scales with op count —
// each op pays the recommended fee. A user-set custom fee is treated as the
// total and split per op at build time (getPerOpBaseFee).
export const getSwapTotalFee = ({
  recommendedFee,
  customFee,
  opCount,
}: {
  recommendedFee: string;
  customFee?: string;
  opCount: number;
}): string => {
  if (customFee) {
    return customFee;
  }
  if (!recommendedFee) {
    return recommendedFee;
  }
  return new BigNumber(recommendedFee).times(opCount).toFixed();
};

const getOperation = (
  sourceAsset: Asset | { code: string; issuer: string },
  destAsset: Asset | { code: string; issuer: string },
  amount: string,
  destinationAmount: string,
  allowedSlippage: string,
  path: string[],
  publicKey: string,
) => {
  const destMin = computeDestMinWithSlippage(
    allowedSlippage,
    destinationAmount,
  );
  return Operation.pathPaymentStrictSend({
    sendAsset: sourceAsset as Asset,
    sendAmount: amount,
    destination: publicKey,
    destAsset: destAsset as Asset,
    destMin: destMin.toFixed(7),
    path: path.map((p) => getAssetFromCanonical(p)) as Asset[],
  });
};

export const getBuiltTx = async (
  publicKey: string,
  opData: {
    sourceAsset: Asset | { code: string; issuer: string };
    destAsset: Asset | { code: string; issuer: string };
    amount: string;
    allowedSlippage: string;
    destinationAmount: string;
    path: string[];
    requiresTrustline: boolean;
  },
  fee: string,
  transactionTimeout: number,
  networkDetails: NetworkDetails,
  memo?: string,
) => {
  const {
    sourceAsset,
    destAsset,
    amount,
    allowedSlippage,
    destinationAmount,
    path,
    requiresTrustline,
  } = opData;
  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );
  const sourceAccount = await server.loadAccount(publicKey);

  const opCount = requiresTrustline ? 2 : 1;

  const destIssuer = destAsset.issuer;
  if (requiresTrustline && !destIssuer) {
    throw new Error(
      "Cannot add a trustline for a destination token without an issuer",
    );
  }

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: getPerOpBaseFee(fee, opCount),
    networkPassphrase: networkDetails.networkPassphrase,
  });

  if (requiresTrustline && destIssuer) {
    const Sdk = getSdk(networkDetails.networkPassphrase);
    transaction.addOperation(
      buildChangeTrustOperation({
        assetCode: destAsset.code,
        assetIssuer: destIssuer,
        sdk: Sdk,
      }),
    );
  }

  const operation = getOperation(
    sourceAsset,
    destAsset,
    amount,
    destinationAmount,
    allowedSlippage,
    path,
    publicKey,
  );
  transaction.addOperation(operation).setTimeout(transactionTimeout);

  if (memo) {
    transaction.addMemo(Memo.text(memo));
  }

  return transaction;
};

// Exact decimal arithmetic, rounded down: computeDestMinWithSlippage's float
// multiplier can miss the exact floor by a stroop.
// The backend refuses a minOut with more decimals than the bought token has.
export const getMinOut = (
  allowedSlippage: string,
  toAmount: string,
  decimals: number,
) =>
  new BigNumber(toAmount)
    .times(new BigNumber(100).minus(allowedSlippage))
    .div(100)
    .decimalPlaces(decimals, BigNumber.ROUND_DOWN)
    .toFixed();

const buildFromBackend = async ({
  quotes,
  key,
  allowedSlippage,
  destDecimals,
  fee,
  timeout,
  onQuoteMoved,
}: {
  quotes: SwapQuotesResponse | null;
  key: SwapQuoteKey;
  allowedSlippage: string;
  destDecimals: number;
  fee: string;
  timeout: number;
  onQuoteMoved: () => void;
}) => {
  const route = quotes ? pickSwapRoute(quotes) : undefined;
  if (!route) {
    throw new Error(ERROR_TO_DISPLAY.NO_QUOTE);
  }
  const minOut = getMinOut(allowedSlippage, route.toAmount, destDecimals);
  try {
    const { xdr } = await buildSwapTx({
      network: key.network,
      account: key.account,
      source: route.source,
      fromAsset: toBackendAsset(key.sourceAsset),
      toAsset: toBackendAsset(key.destAsset),
      amount: key.amount,
      minOut,
      fee,
      slippage: allowedSlippage,
      timeout,
      paths: route.paths,
    });
    return { xdr, minOut };
  } catch (e) {
    if (!(e instanceof SwapTxError)) {
      throw e;
    }
    if (e.kind === "quoteMoved") {
      onQuoteMoved();
      throw new Error(ERROR_TO_DISPLAY.QUOTE_EXPIRED);
    }
    throw new Error(
      e.kind === "unavailable"
        ? ERROR_TO_DISPLAY.SWAPS_UNAVAILABLE
        : UNKNOWN_ERROR_DISPLAY,
    );
  }
};

function useSimulateTxData({
  publicKey,
  networkDetails,
  simParams,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
  simParams: SimulationParams;
}) {
  const {
    memo,
    path: storedPath,
    destinationAmount: storedDestinationAmount,
    swapQuotes: storedSwapQuotes,
    swapQuoteKey: storedSwapQuoteKey,
  } = useSelector(transactionDataSelector);
  const reduxDispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();

  const { scanTx } = useScanTx();
  const [state, dispatch] = useReducer(
    reducer<SimulateTxData, string>,
    initialState,
  );
  // Separate from reducer state so the view retains the expired-quote flag
  // across re-fetches. Set on Horizon op_under_dest_min / op_too_few_offers
  // errors and the backend's 409 quote_moved; consumed by the quote-expired
  // metric + Notification in SwapAmount.
  const [isQuoteExpired, setIsQuoteExpired] = useState(false);
  // Only the newest fetchData may store its result: an older build landing
  // late would otherwise be reviewed and signed.
  const requestIdRef = useRef(0);
  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  // The settings sheet passes the values it just saved: simParams still
  // holds the previous render's.
  const fetchData = async ({
    amount,
    destinationRate,
    transactionFee = simParams.transactionFee,
    transactionTimeout = simParams.transactionTimeout,
  }: {
    amount: string;
    destinationRate?: string;
    transactionFee?: string;
    transactionTimeout?: number;
  }) => {
    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;
    dispatch({ type: "FETCH_DATA_START" });
    // Nothing may submit an XDR this review has not decoded.
    reduxDispatch(
      saveSimulation({ response: null, preparedTransaction: null }),
    );
    setIsQuoteExpired(false);
    try {
      const payload = { transactionXdr: "" } as SimulateTxData;
      const { allowedSlippage, sourceAsset, destAsset } = simParams;

      const readDecimals = (
        asset: SimulationParams["sourceAsset"],
        held?: number,
      ) =>
        held ??
        getDecimalsForAsset({
          assetIssuer: asset.issuer ?? null,
          publicKey,
          networkDetails,
        });
      let sourceDecimals: number;
      let destDecimals: number;
      try {
        [sourceDecimals, destDecimals] = await Promise.all([
          readDecimals(sourceAsset, simParams.sourceDecimals),
          readDecimals(destAsset, simParams.destDecimals),
        ]);
      } catch (e) {
        if (!isStale()) {
          captureException(e);
        }
        throw new Error(ERROR_TO_DISPLAY.TOKEN_DETAILS_UNAVAILABLE);
      }

      const baseFee = new BigNumber(transactionFee || stroopToXlm(BASE_FEE));

      // Reuse the quote the live "You receive" preview already surfaced (its
      // path + destination amount are in Redux) instead of re-fetching, so the
      // reviewed amount matches exactly what the user saw — no last-moment jump.
      // Any drift by submit time is bounded by destMin (slippage) and recovered
      // via the quote-expiry flow. Fetch a fresh path when no live quote exists
      // for these exact inputs (path may legitimately be empty for a direct swap).
      let destinationAmount = storedDestinationAmount;
      let path: string[] = storedPath || [];
      let quotes = storedSwapQuotes;
      let key = storedSwapQuoteKey;
      const quoteParams = {
        mode: "send" as const,
        amount,
        sourceAsset: getCanonicalFromAsset(
          sourceAsset.code,
          sourceAsset.issuer,
        ),
        destAsset: getCanonicalFromAsset(destAsset.code, destAsset.issuer),
        networkDetails,
        publicKey,
      };

      if (
        !isSameSwapQuoteKey(storedSwapQuoteKey, getSwapQuoteKey(quoteParams)) ||
        !destinationAmount ||
        new BigNumber(destinationAmount).lte(0)
      ) {
        let result;
        try {
          result = await getSwapQuote(quoteParams);
        } catch (e) {
          if (e instanceof SwapQuotesError) {
            // Reported per Review press, 400 included: the request was built
            // from the extension's own state, so a rejection is worth seeing.
            captureException(e.message);
            throw new Error(
              e.kind === "unavailable"
                ? ERROR_TO_DISPLAY.SWAPS_UNAVAILABLE
                : ERROR_TO_DISPLAY.NO_QUOTE,
            );
          }
          throw e;
        }

        if (!result.route) {
          throw new Error(ERROR_TO_DISPLAY.NO_QUOTE);
        }

        destinationAmount = result.route.destinationAmount;
        path = result.route.path;
        quotes = result.quotes;
        key = result.key;
      }
      if (destinationRate) {
        payload.dstAmountPriceUsd = formatAmount(
          roundUsdValue(
            new BigNumber(destinationRate)
              .multipliedBy(new BigNumber(destinationAmount))
              .toString(),
          ),
        );
      }
      // Custom networks keep the local build: the backend can't reach them.
      const { xdr, minOut } = isCustomNetwork(networkDetails)
        ? {
            xdr: (
              await getBuiltTx(
                publicKey,
                {
                  sourceAsset,
                  destAsset,
                  amount,
                  destinationAmount,
                  allowedSlippage,
                  path,
                  requiresTrustline: simParams.destRequiresTrustline,
                },
                baseFee.toString(),
                transactionTimeout,
                networkDetails,
                memo,
              )
            )
              .build()
              .toXdr(),
            minOut: getMinOut(
              allowedSlippage,
              destinationAmount,
              CLASSIC_ASSET_DECIMALS,
            ),
          }
        : await buildFromBackend({
            quotes,
            key: getSwapQuoteKey(quoteParams),
            allowedSlippage,
            destDecimals,
            fee: baseFee.toFixed(),
            timeout: transactionTimeout,
            onQuoteMoved: () => {
              if (!isStale()) {
                reduxDispatch(clearSwapQuoteKey());
              }
            },
          });
      try {
        payload.decoded = decodeSwapTx({
          transactionXdr: xdr,
          networkPassphrase: networkDetails.networkPassphrase,
          account: publicKey,
          sourceAsset: quoteParams.sourceAsset,
          destAsset: quoteParams.destAsset,
          minOut,
          sourceDecimals,
        });
      } catch (e) {
        if (!isStale()) {
          captureException(e);
        }
        throw e;
      }
      if (payload.decoded.resourceFee) {
        payload.resourceFee = payload.decoded.resourceFee;
        payload.inclusionFee = new BigNumber(payload.decoded.fee)
          .minus(payload.decoded.resourceFee)
          .toFixed();
      }
      payload.transactionXdr = xdr;
      payload.scanResult = await scanTx(xdr, scanUrlstub, networkDetails);
      if (isStale()) {
        return payload;
      }
      reduxDispatch(
        saveSimulation({
          preparedTransaction: xdr,
        }),
      );
      reduxDispatch(
        saveSwapBestPath({
          path,
          destinationAmount,
          quotes,
          key,
        }),
      );

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      if (isStale()) {
        return error;
      }
      // Every message is a key in the locale files.
      const payload = t(getSwapErrorMessage(error));

      setIsQuoteExpired(
        (error instanceof Error &&
          error.message === ERROR_TO_DISPLAY.QUOTE_EXPIRED) ||
          isQuoteExpiredError(error as ErrorMessage | undefined),
      );
      dispatch({ type: "FETCH_DATA_ERROR", payload });
      return error;
    }
  };

  return {
    state,
    fetchData,
    isQuoteExpired,
  };
}

export { useSimulateTxData };
