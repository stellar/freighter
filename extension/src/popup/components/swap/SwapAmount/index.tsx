import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Form, Field, FieldProps, Formik, useFormik } from "formik";
import { debounce } from "lodash";
import { toast } from "sonner";
import BigNumber from "bignumber.js";
import { captureException } from "@sentry/browser";
import { object as YupObject, number as YupNumber } from "yup";
import { BASE_RESERVE } from "@shared/constants/stellar";
import {
  Button,
  Card,
  Icon,
  Input,
  Notification,
} from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  saveAllowedSlippage,
  saveAmount,
  saveAmountUsd,
  saveAsset,
  saveDestinationAsset,
  saveDestinationTokenDetails,
  saveIsToken,
  saveSwapBestPath,
  saveTransactionFee,
  saveTransactionTimeout,
  clearSwapQuoteExpired,
  transactionDataSelector,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import {
  cleanAmount,
  formatAmount,
  roundUsdValue,
} from "popup/helpers/formatters";
import { TX_SEND_MAX } from "popup/constants/transaction";
import { useGetSwapAmountData } from "./hooks/useGetSwapAmountData";
import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isMainnet,
} from "helpers/stellar";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import { getAssetDecimals, getAvailableBalance } from "popup/helpers/soroban";
import {
  findAssetBalance,
  getBalanceCanonicalKey,
} from "popup/helpers/balance";
import {
  getAssetSecurityLevel,
  extractAssetScanWarnings,
  useBlockaidOverrideState,
} from "popup/helpers/blockaid";
import { AppDispatch } from "popup/App";
import { emitMetric } from "helpers/metrics";
import { AMOUNT_ERROR, InputType } from "helpers/transaction";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { EditSettings } from "popup/components/InternalTransaction/EditSettings";
import { ReviewTx } from "popup/components/InternalTransaction/ReviewTransaction";
import {
  getSwapTotalFee,
  useSimulateTxData,
} from "./hooks/useSimulateSwapData";
import { getSwapCtaState, SwapCtaLabelKey } from "./helpers/swapCtaState";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { SlideupModal } from "popup/components/SlideupModal";
import { AmountCard } from "popup/components/amount/AmountCard";
import { PercentageButtons } from "popup/components/amount/PercentageButtons";
import {
  deductNewTrustlineReserve,
  pickBestNonXlmClassicCanonical,
  shouldShowXlmReservePreflight,
} from "popup/helpers/xlmReserve";
import { horizonGetBestReceivePath } from "popup/helpers/horizonGetBestPath";
import { horizonGetBestPath } from "popup/helpers/horizonGetBestPath";
import { XlmReserveSheet } from "popup/components/swap/XlmReserveSheet";

import "./styles.scss";

const defaultSlippage = "2";

// Debounce window for the live "You receive" quote while the user is typing.
const LIVE_QUOTE_DEBOUNCE_MS = 500;

const AVAILABLE_BALANCE_FONT_SIZES = [
  { maxLen: 28, sizePx: 14 },
  { maxLen: 42, sizePx: 12 },
  { maxLen: Infinity, sizePx: 11 },
] as const;

// "Why do I need XLM?" help article (matches freighter-mobile).
const XLM_RESERVE_HELP_URL =
  "https://help.freighter.app/article/xjlva9dxov-how-much-xlm-do-i-need-in-my-wallet";

interface SwapAmountProps {
  inputType: InputType;
  setInputType: (type: InputType) => void;
  goBack: () => void;
  goToNext: () => void;
  goToEditSrc: () => void;
  goToEditDst: () => void;
}

export const SwapAmount = ({
  inputType,
  setInputType,
  goBack,
  goToNext,
  goToEditSrc,
  goToEditDst,
}: SwapAmountProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const {
    networkCongestion,
    recommendedFee,
    isLoading: isNetworkFeesLoading,
  } = useNetworkFees();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const blockaidOverrideState = useBlockaidOverrideState();
  const { transactionData, isSwapQuoteExpired } = useSelector(
    transactionSubmissionSelector,
  );
  const {
    allowedSlippage,
    amount,
    amountUsd,
    asset,
    destination,
    destinationAmount,
    destinationAsset,
    isToken,
    memo,
    path,
    transactionFee,
    transactionTimeout,
  } = transactionData;
  // A new-trustline swap is two ops; scale the recommended default fee by op
  // count so each op pays the recommended fee (a custom fee is the total and
  // is split per op at build time). Mirrors mobile (§3.6/§3.7).
  const swapOpCount = transactionData.destinationTokenDetails?.requiresTrustline
    ? 2
    : 1;
  const fee = getSwapTotalFee({
    recommendedFee,
    customFee: transactionFee,
    opCount: swapOpCount,
  });
  // The source can be in the "(+) Select" (empty) state — e.g. after a
  // direction swap whose destination was unset or a non-held token.
  const srcAsset = asset ? getAssetFromCanonical(asset) : null;
  const dstAsset = destinationAsset
    ? getAssetFromCanonical(destinationAsset)
    : null;

  const { state: swapAmountData, fetchData } = useGetSwapAmountData(
    {
      showHidden: false,
      includeIcons: true,
    },
    destination,
    destinationAsset,
    asset,
  );
  const {
    state: simulationState,
    fetchData: fetchSimulationData,
    isQuoteExpired,
  } = useSimulateTxData({
    publicKey,
    networkDetails,
    simParams: {
      sourceAsset: srcAsset!,
      destAsset: dstAsset!,
      amount,
      allowedSlippage,
      path,
      transactionFee: fee,
      transactionTimeout,
      memo,
    },
  });

  const [isEditingSlippage, setIsEditingSlippage] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isReviewingTx, setIsReviewingTx] = React.useState(false);
  const [isXlmReserveOpen, setIsXlmReserveOpen] = useState(false);
  // True while a live best-path quote is in flight, so the CTA can tell
  // "still loading a quote" apart from "no path exists" (§2.5).
  const [isLiveQuoteLoading, setIsLiveQuoteLoading] = useState(false);
  // Tracks focus on the sell input so the "Enter an amount" CTA can disable
  // itself while the input is focused. Unlike mobile (which keeps it enabled to
  // re-summon the keyboard), the extension has no virtual keyboard — once the
  // input is focused the tap-to-focus affordance is redundant (§ batch3 task 1).
  const [isSellInputFocused, setIsSellInputFocused] = useState(false);

  const handleContinue = async (values: { amount: string }) => {
    // Retrying after a quote-expiry submit failure: dismiss the stale notice
    // before re-simulating against a fresh quote (§2.1/§3.3).
    if (isSwapQuoteExpired) {
      dispatch(clearSwapQuoteExpired());
    }
    const amountVal =
      inputType === "crypto" ? values.amount : (priceValue ?? "0");
    const cleanedAmount = cleanAmount(amountVal);
    dispatch(saveAmount(cleanedAmount));
    await fetchSimulationData({
      amount: cleanedAmount,
      destinationRate: dstAssetPrice,
    });
    const needsReserve = shouldShowXlmReservePreflight({
      requiresTrustline:
        transactionData.destinationTokenDetails?.requiresTrustline ?? false,
      sourceIsXlm: asset === "native",
      spendableXlm: getAvailableBalance({
        assetCanonical: "native",
        balances: sendData.userBalances.balances,
        recommendedFee: fee,
      }),
    });
    if (needsReserve) {
      emitMetric(METRIC_NAMES.swapXlmReserveShown);
      setIsXlmReserveOpen(true);
      return;
    }
    setIsReviewingTx(true);
  };

  const validate = (values: { amount: string }) => {
    const amount = inputType === "crypto" ? values.amount : (priceValue ?? "0");
    const val = cleanAmount(amount);
    if (val.indexOf(".") !== -1 && val.split(".")[1].length > 7) {
      return { amount: AMOUNT_ERROR.DEC_MAX };
    }
    if (new BigNumber(val).gt(new BigNumber(TX_SEND_MAX))) {
      return { amount: AMOUNT_ERROR.SEND_MAX };
    }
    return {};
  };

  const formik = useFormik({
    initialValues: { amount, amountUsd, asset, destinationAsset },
    onSubmit: handleContinue,
    validate,
    enableReinitialize: true,
    validateOnChange: true,
  });

  // Size the displayed amount by its digit count. Each card passes its OWN
  // value so the read-only receive amount isn't sized off the sell amount
  // (which mis-sized and clipped it on toggle; § task 8).
  const getAmountFontSizeClass = (
    value: string,
  ): "lg" | "med" | "small" | "xsmall" => {
    const digitsLength = (value || "").replace(/[^0-9]/g, "").length;
    if (digitsLength <= 6) {
      return "lg";
    }
    if (digitsLength <= 10) {
      return "med";
    }
    if (digitsLength <= 13) {
      return "small";
    }
    return "xsmall";
  };
  const isLoading =
    isNetworkFeesLoading ||
    swapAmountData.state === RequestState.IDLE ||
    swapAmountData.state === RequestState.LOADING;

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the user was in fiat mode and the current source asset no longer has a
  // USD price (e.g. after a direction-swap or source picker change), force back
  // to crypto mode so priceValue-dependent expressions are always safe.
  useEffect(() => {
    if (
      inputType === "fiat" &&
      swapAmountData.state === RequestState.SUCCESS &&
      swapAmountData.data?.type === AppDataType.RESOLVED
    ) {
      const currentAssetPrice =
        swapAmountData.data.tokenPrices?.[asset]?.currentPrice;
      if (!currentAssetPrice) {
        setInputType("crypto");
      }
    }
  }, [
    inputType,
    swapAmountData.state,
    swapAmountData.data,
    asset,
    setInputType,
  ]);

  // A transient, swipe-/auto-dismissible toast (sonner) rather than a fixed
  // banner that takes layout space. The stable id dedupes the in-screen
  // (isQuoteExpired) and submit-recovery (isSwapQuoteExpired) triggers into one
  // toast instead of stacking two.
  const showQuoteExpiredToast = () =>
    toast.custom(
      () => (
        <Notification
          variant="warning"
          title={t("Quote has expired, please try again to get a new quote")}
        />
      ),
      { id: "swap-quote-expired" },
    );

  // Quote-expired surfacing: when the simulate hook flags an expired quote
  // (Horizon op_under_dest_min / op_too_few_offers), emit the metric and show
  // the user-facing toast. The auto-refetch is handled by Phase E's getBestPath
  // retry; this only emits + surfaces the message.
  useEffect(() => {
    if (!isQuoteExpired) {
      return;
    }
    showQuoteExpiredToast();
    emitMetric(METRIC_NAMES.swapQuoteExpired, {
      sourceToken: asset,
      destToken: destinationAsset,
      sourceAmount: amount,
      destAmount: destinationAmount,
      allowedSlippage,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuoteExpired]);

  // A quote that expired at submit time (Redux flag) routes back to this screen;
  // surface the same toast on arrival.
  useEffect(() => {
    if (isSwapQuoteExpired) {
      showQuoteExpiredToast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSwapQuoteExpired]);

  // Live quote: debounce the source amount and fetch the best path so the
  // "You receive" amount updates as the user types. This is a lightweight
  // path-only lookup (no XDR build / Blockaid scan / quote-expiry surfacing) —
  // the full simulation runs at review time in handleContinue. A monotonic
  // request id discards out-of-order responses; failures reset the displayed
  // amount to 0 so a stale quote never lingers.
  // Lets the "Enter an amount" CTA focus the sell input on tap (§ task 1).
  const sellInputRef = useRef<HTMLInputElement>(null);
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
            // This is the current request settling — stop signalling "loading"
            // so the CTA can distinguish a missing path from a pending one.
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

  if (isLoading) {
    return <Loading />;
  }

  if (swapAmountData.state === RequestState.ERROR) {
    return (
      <div
        className="SwapAsset__fetch-fail"
        data-testid="swap-amount-fetch-fail"
      >
        <Notification variant="error" title={t("Failed to load swap data.")}>
          {t("Your swap data could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (swapAmountData.data?.type === AppDataType.REROUTE) {
    if (swapAmountData.data.shouldOpenTab) {
      openTab(newTabHref(swapAmountData.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${swapAmountData.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  const data = swapAmountData.data;

  reRouteOnboarding({
    type: data.type,
    applicationState: data.applicationState,
    state: swapAmountData.state,
  });

  const sendData = data;
  const assetIcon = sendData.icons[asset];
  // The icons map only carries held-token logos. A non-held destination token
  // (picked from search/popular) isn't in it, so fall back to the icon URL
  // captured on the picked token so the receive picker shows its logo too.
  const dstAssetIcon =
    sendData.icons[destinationAsset] ||
    transactionData.destinationTokenDetails?.iconUrl ||
    null;
  // A non-held destination token can never become the source (we only swap
  // held/classic assets), so the direction toggle handles it specially.
  // Detect it by its absence from the account balances.
  const heldCanonicals = new Set(
    sendData.userBalances.balances.map((b) => getBalanceCanonicalKey(b)),
  );
  const destinationIsNonHeld =
    Boolean(destinationAsset) && !heldCanonicals.has(destinationAsset);
  const prices = sendData.tokenPrices;
  const assetPrice = prices[asset] && prices[asset].currentPrice;
  // Prefer the live backend price; fall back to the stellar.expert spot price
  // captured when the (non-held) destination token was picked, so the receive
  // card shows a fiat value instead of "--" when /token-prices has no entry.
  const dstSpotPrice = transactionData.destinationTokenDetails?.spotPrice;
  const dstAssetPrice =
    prices[destinationAsset]?.currentPrice ??
    // Spot-price fallback is mainnet-only, mirroring the /token-prices gate so
    // the receive card never shows a fiat value the sell card can't.
    (isMainnet(data.networkDetails) && dstSpotPrice != null
      ? String(dstSpotPrice)
      : undefined);
  const assetDecimals = getAssetDecimals(asset, sendData.userBalances, isToken);
  const priceValue = assetPrice
    ? new BigNumber(cleanAmount(formik.values.amountUsd))
        .dividedBy(new BigNumber(assetPrice))
        .decimalPlaces(assetDecimals)
        .toString()
    : null;
  const priceValueUsd = assetPrice
    ? `${formatAmount(
        roundUsdValue(
          new BigNumber(assetPrice)
            .multipliedBy(new BigNumber(cleanAmount(formik.values.amount)))
            .toString(),
        ),
      )}`
    : null;
  const supportsUsd = isMainnet(data.networkDetails) && assetPrice;
  const dstPriceValueUsd = dstAssetPrice
    ? formatAmount(
        roundUsdValue(
          new BigNumber(dstAssetPrice)
            .multipliedBy(new BigNumber(cleanAmount(destinationAmount || "0")))
            .toString(),
        ),
      )
    : null;
  const baseAvailableBalance = asset
    ? getAvailableBalance({
        assetCanonical: asset,
        balances: sendData.userBalances.balances,
        recommendedFee: fee,
      })
    : "0";
  // When swapping XLM into a new token, reserve the 0.5 XLM trustline bump
  // up-front so it's excluded from Max / percentage buttons and the
  // insufficient-balance check (matches mobile; §2.2).
  const availableBalance = deductNewTrustlineReserve({
    spendable: baseAvailableBalance,
    sourceIsXlm: asset === "native",
    requiresTrustline:
      transactionData.destinationTokenDetails?.requiresTrustline ?? false,
  });
  const displayTotal = `${formatAmount(availableBalance)}`;

  // "Swap for 0.5 XLM" reserve-recovery affordance on the XlmReserveSheet
  // (§3.2). The sell side is the current source when it's already a non-XLM
  // classic token; otherwise the largest held non-XLM classic balance.
  const sourceIsNonXlmClassic = !!asset && asset !== "native";

  // Source token Blockaid verdict (from its held balance), passed to the review
  // gate so a flagged sell token also warns (§4.3). XLM is never scanned.
  const sourceBalance = sourceIsNonXlmClassic
    ? findAssetBalance(
        sendData.userBalances.balances,
        getAssetFromCanonical(asset),
      )
    : null;
  const sourceTokenSecurityLevel =
    sourceBalance && "blockaidData" in sourceBalance
      ? getAssetSecurityLevel({
          blockaidData: sourceBalance.blockaidData,
          blockaidOverrideState,
          networkDetails,
        })
      : undefined;
  // Friendly per-feature reasons from the source token scan, surfaced in the
  // review's Blockaid pane alongside the transaction-scan reasons (§ batch4
  // task 3).
  const sourceTokenSecurityWarnings =
    sourceBalance && "blockaidData" in sourceBalance
      ? extractAssetScanWarnings(sourceBalance.blockaidData)
      : undefined;

  // Plain computation (not useMemo): this runs below early returns, so a hook
  // here would violate the rules of hooks, and the filter/sort is cheap.
  const bestNonXlmClassicCanonical = pickBestNonXlmClassicCanonical(
    sendData.userBalances.balances,
  );
  const canSwapForReserve =
    sourceIsNonXlmClassic || !!bestNonXlmClassicCanonical;

  const handleSwapForReserve = async () => {
    const sellCanonical = sourceIsNonXlmClassic
      ? asset
      : bestNonXlmClassicCanonical;
    if (!sellCanonical) {
      return;
    }
    // The receive side becomes XLM — a held token, so no trustline is needed.
    dispatch(saveDestinationAsset("native"));
    dispatch(saveDestinationTokenDetails(null));

    if (!sourceIsNonXlmClassic) {
      // Switching the sell side to a different token: reset the amount, since
      // any prior amount was denominated in the now-replaced source.
      dispatch(saveAsset(sellCanonical));
      dispatch(saveAmount("0"));
      dispatch(saveAmountUsd("0.00"));
      return;
    }

    // Source reused (no token change): pre-fill the amount needed to receive
    // ~0.5 XLM, capped to what's spendable of the sell token so the user never
    // lands on an insufficient-balance state.
    try {
      // Target a little MORE than the bare reserve so the 0.5 XLM trustline
      // bump stays covered after the swap's slippage floor (destMin). Sizing to
      // BASE_RESERVE / (1 - slippage) keeps even a worst-case fill at >= 0.5,
      // erring slightly over rather than under (§ batch4 task 5). Still capped
      // to spendable below, so it never exceeds the user's balance.
      const slippageFraction = Math.min(
        Math.max(parseFloat(allowedSlippage) || 0, 0) / 100,
        0.5,
      );
      const reserveTarget = new BigNumber(BASE_RESERVE)
        .dividedBy(1 - slippageFraction)
        .toFixed(7);
      const path = await horizonGetBestReceivePath({
        destinationAmount: reserveTarget,
        sourceAsset: sellCanonical,
        destAsset: "native",
        networkDetails,
      });
      if (path?.source_amount) {
        const sellSpendable = getAvailableBalance({
          assetCanonical: sellCanonical,
          balances: sendData.userBalances.balances,
          recommendedFee: fee,
        });
        const capped = BigNumber.minimum(
          new BigNumber(path.source_amount),
          new BigNumber(sellSpendable),
        );
        dispatch(saveAmount(capped.toFixed(7)));
        // In fiat mode the whole pipeline reads amountUsd, so also recalculate
        // the fiat figure from the sell token's price; if it has no price, drop
        // to crypto mode so the prefilled amount is the one used (§ batch3 t8).
        if (assetPrice) {
          dispatch(
            saveAmountUsd(
              formatAmount(
                roundUsdValue(
                  capped.multipliedBy(new BigNumber(assetPrice)).toString(),
                ),
              ),
            ),
          );
        } else if (inputType === "fiat") {
          setInputType("crypto");
        }
      }
    } catch (e) {
      // No path / network error — leave the amount as-is for manual entry.
      captureException(
        `Swap-for-reserve prefill failed - ${JSON.stringify(e)}`,
      );
    }
  };

  const isAmountTooHigh =
    (inputType === "crypto" &&
      new BigNumber(cleanAmount(formik.values.amount)).gt(
        new BigNumber(availableBalance),
      )) ||
    (inputType === "fiat" &&
      new BigNumber(cleanAmount(priceValue ?? "0")).gt(
        new BigNumber(availableBalance),
      ));

  const swapAmountPositive =
    inputType === "crypto"
      ? new BigNumber(cleanAmount(formik.values.amount)).gt(0)
      : new BigNumber(cleanAmount(formik.values.amountUsd)).gt(0);

  // The live quote settled with no route for a positive amount → no swap path.
  // While a quote is in flight (isLiveQuoteLoading) we leave the CTA enabled so
  // it doesn't flicker disabled between keystrokes (§2.5).
  const hasNoSwapPath =
    swapAmountPositive &&
    !isLiveQuoteLoading &&
    new BigNumber(cleanAmount(destinationAmount || "0")).isZero();

  // Non-XLM swaps pay the network fee from the separate XLM balance; block the
  // CTA when that balance can't cover the fee (§2.4). XLM-source swaps already
  // fold the fee into availableBalance, so this only applies to non-XLM sources.
  const xlmSpendableForFees = getAvailableBalance({
    assetCanonical: "native",
    balances: sendData.userBalances.balances,
    recommendedFee: "0",
  });
  const insufficientXlmForFees =
    sourceIsNonXlmClassic &&
    new BigNumber(xlmSpendableForFees).lt(new BigNumber(fee));

  const cta = getSwapCtaState({
    hasSource: !!asset,
    hasDestination: !!destinationAsset,
    // availableBalance already nets out the network fee + the new-trustline
    // 0.5 XLM reserve, so a barely-funded account correctly reads as empty.
    availableBalanceIsZero: new BigNumber(
      cleanAmount(availableBalance),
    ).isLessThanOrEqualTo(0),
    amountIsZero: !swapAmountPositive,
    isAmountTooHigh,
    insufficientXlmForFees,
    hasNoSwapPath,
  });
  const ctaLabels: Record<SwapCtaLabelKey, string> = {
    select: t("Select a token"),
    enter: t("Enter an amount"),
    insufficientBalance: t("Insufficient balance"),
    insufficientXlmFees: t("Not enough XLM for network fees"),
    noQuote: t("No quote available"),
    review: t("Review swap"),
  };

  const availableBalanceText = srcAsset
    ? `${displayTotal} ${srcAsset.code} ${t("available")}`
    : "";
  const availableBalanceFontSizePx = AVAILABLE_BALANCE_FONT_SIZES.find(
    ({ maxLen }) => availableBalanceText.length <= maxLen,
  )!.sizePx;

  return (
    <>
      <SubviewHeader
        title={<span>{t("Swap")}</span>}
        hasBackButton
        customBackAction={goBack}
      />
      <View.Content
        contentFooter={
          <div className="SwapAsset__btn-continue">
            <div className="SwapAsset__settings-row">
              <div className="SwapAsset__settings-fee-display">
                <span className="SwapAsset__settings-fee-display__label">
                  {t("Fee")}:
                </span>
                {/* The network fee is always denominated in XLM, regardless of
                    whether the amount is being entered in crypto or fiat. */}
                <span>{`${fee} XLM`}</span>
              </div>
              <div className="SwapAsset__settings-options">
                <Button
                  type="button"
                  size="md"
                  isRounded
                  variant="tertiary"
                  onClick={() => setIsEditingSlippage(true)}
                >
                  {`${t("Slippage")}: ${allowedSlippage}%`}
                </Button>
                <Button
                  type="button"
                  size="md"
                  isRounded
                  variant="tertiary"
                  onClick={() => setIsEditingSettings(true)}
                >
                  <Icon.Settings01 />
                </Button>
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              data-testid="swap-amount-btn-continue"
              isFullWidth
              isRounded
              variant="secondary"
              isLoading={simulationState.state === RequestState.LOADING}
              disabled={
                cta.disabled || (cta.labelKey === "enter" && isSellInputFocused)
              }
              onClick={(e) => {
                e.preventDefault();
                // In the "select" state the button is a shortcut to the picker
                // for the missing side — preferring the sell token when both
                // are missing — rather than a submit (§ task 1).
                if (cta.labelKey === "select") {
                  const side = !asset ? "source" : "destination";
                  emitMetric(METRIC_NAMES.swapPickerOpened, {
                    side,
                    source: "cta",
                  });
                  if (!asset) {
                    goToEditSrc();
                  } else {
                    goToEditDst();
                  }
                  return;
                }
                // Both tokens picked but no amount yet: focus the sell input so
                // the user knows to type an amount (mirrors mobile; § task 1).
                if (cta.labelKey === "enter") {
                  sellInputRef.current?.focus();
                  return;
                }
                formik.submitForm();
              }}
            >
              {ctaLabels[cta.labelKey]}
            </Button>
          </div>
        }
      >
        <div className="SwapAsset">
          <div className="SwapAsset__content">
            <form>
              <div className="SwapAsset__simplebar__content">
                <div className="SwapAsset__cards" data-testid="swap-sell-card">
                  <AmountCard
                    label={t("You sell")}
                    availableBalanceText={availableBalanceText}
                    availableBalanceFontSizePx={availableBalanceFontSizePx}
                    inputType={inputType}
                    // Show the gray "0" placeholder (empty input) until an
                    // amount is entered; redux keeps the canonical "0".
                    amount={
                      formik.values.amount === "0" ? "" : formik.values.amount
                    }
                    amountUsd={
                      formik.values.amountUsd === "0.00"
                        ? ""
                        : formik.values.amountUsd
                    }
                    amountFontSizeClass={getAmountFontSizeClass(
                      inputType === "fiat"
                        ? formik.values.amountUsd
                        : formik.values.amount,
                    )}
                    // Don't grab focus until the swap is ready to receive an
                    // amount (both tokens picked); on entry the source defaults
                    // to XLM but the receive side is empty, so the card stays
                    // unfocused with a gray "0" placeholder (§ task 1).
                    autoFocus={!!asset && !!destinationAsset}
                    amountInputRef={sellInputRef}
                    onInputFocus={() => setIsSellInputFocused(true)}
                    onInputBlur={() => setIsSellInputFocused(false)}
                    assetCode={srcAsset ? srcAsset.code : ""}
                    assetIcon={assetIcon}
                    assetIcons={
                      asset && asset !== "native" ? { [asset]: assetIcon } : {}
                    }
                    assetIssuerKey={srcAsset?.issuer}
                    // Carry the sell token's Blockaid verdict onto its pill so a
                    // flagged source keeps its warning badge after selection,
                    // matching the picker list (§ task 3).
                    securityLevel={sourceTokenSecurityLevel}
                    supportsUsd={Boolean(supportsUsd)}
                    fiatLineText={
                      !asset
                        ? "$0.00"
                        : inputType === "crypto"
                          ? assetPrice
                            ? `$${priceValueUsd || "0.00"}`
                            : "--"
                          : `${priceValue || "0"} ${
                              srcAsset ? srcAsset.code : ""
                            }`
                    }
                    isAmountTooHigh={isAmountTooHigh}
                    maxSpendableText={displayTotal}
                    cryptoDecimals={assetDecimals}
                    onAmountChange={({ amount: newAmount }) => {
                      // Normalize a cleared input back to the canonical "0".
                      const v = newAmount === "" ? "0" : newAmount;
                      formik.setFieldValue("amount", v);
                      dispatch(saveAmount(v));
                    }}
                    onAmountUsdChange={({ amount: newAmount }) => {
                      const v = newAmount === "" ? "0.00" : newAmount;
                      formik.setFieldValue("amountUsd", v);
                      dispatch(saveAmountUsd(v));
                    }}
                    onToggleInputType={() => {
                      const newInputType =
                        inputType === "crypto" ? "fiat" : "crypto";
                      if (newInputType === "crypto") {
                        dispatch(saveAmount(priceValue));
                        formik.setFieldValue("amount", priceValue);
                      }
                      if (newInputType === "fiat") {
                        dispatch(saveAmountUsd(priceValueUsd));
                        formik.setFieldValue("amountUsd", priceValueUsd);
                      }
                      setInputType(newInputType);
                    }}
                    onSelectAsset={() => {
                      emitMetric(METRIC_NAMES.swapPickerOpened, {
                        side: "source",
                        source: "dropdown",
                      });
                      goToEditSrc();
                    }}
                  />
                </div>
                <div
                  className="SwapAsset__direction"
                  data-testid="swap-direction-chevron"
                >
                  <button
                    type="button"
                    className="SwapAsset__direction-btn"
                    aria-label={t("Swap direction")}
                    onClick={(e) => {
                      e.preventDefault();
                      emitMetric(METRIC_NAMES.swapDirectionToggled);
                      const prevSrc = asset;
                      // A non-held destination can't become the source, so reset
                      // it to "(+) Select" instead of moving it into the sell
                      // slot; otherwise swap the two positions normally.
                      dispatch(
                        saveAsset(destinationIsNonHeld ? "" : destinationAsset),
                      );
                      dispatch(saveDestinationAsset(prevSrc));
                      // The new destination (old source) and new source are both
                      // held/classic or empty — neither carries trustline/contract
                      // metadata.
                      dispatch(saveDestinationTokenDetails(null));
                      dispatch(saveIsToken(false));
                      // The amount was denominated in the old source token; reset
                      // it whenever the source token changes.
                      dispatch(saveAmount("0"));
                      dispatch(saveAmountUsd("0.00"));
                    }}
                  >
                    <Icon.ChevronDown />
                  </button>
                </div>
                <div
                  className="SwapAsset__cards"
                  data-testid="swap-receive-card"
                >
                  <AmountCard
                    label={t("You receive")}
                    availableBalanceText=""
                    availableBalanceFontSizePx={availableBalanceFontSizePx}
                    inputType={inputType}
                    amount={destinationAmount}
                    amountUsd={dstPriceValueUsd || "0.00"}
                    amountFontSizeClass={getAmountFontSizeClass(
                      inputType === "fiat"
                        ? dstPriceValueUsd || "0.00"
                        : destinationAmount,
                    )}
                    assetCode={dstAsset ? dstAsset.code : ""}
                    assetIcon={dstAssetIcon}
                    assetIcons={
                      destinationAsset && destinationAsset !== "native"
                        ? { [destinationAsset]: dstAssetIcon }
                        : {}
                    }
                    assetIssuerKey={dstAsset?.issuer}
                    // Carry the destination token's pick-time Blockaid verdict
                    // onto its pill so a flagged token keeps its warning badge
                    // after selection, matching the picker list (§ task 3).
                    securityLevel={
                      transactionData.destinationTokenDetails?.securityLevel
                    }
                    supportsUsd={Boolean(supportsUsd)}
                    fiatLineText={
                      !destinationAsset
                        ? "$0.00"
                        : inputType === "crypto"
                          ? dstAssetPrice
                            ? `$${dstPriceValueUsd || "0.00"}`
                            : "--"
                          : `${destinationAmount || "0"} ${
                              dstAsset ? dstAsset.code : ""
                            }`
                    }
                    isAmountTooHigh={false}
                    isReadOnly
                    autoFocus={false}
                    cryptoDecimals={7}
                    onAmountChange={() => {}}
                    onAmountUsdChange={() => {}}
                    onToggleInputType={() => {}}
                    onSelectAsset={() => {
                      emitMetric(METRIC_NAMES.swapPickerOpened, {
                        side: "destination",
                        source: "dropdown",
                      });
                      goToEditDst();
                    }}
                  />
                </div>
                <div
                  className="SwapAsset__percentage-buttons"
                  data-testid="swap-percentage-buttons"
                >
                  <PercentageButtons
                    onSelect={(pct: number) => {
                      emitMetric(METRIC_NAMES.swapAmount);
                      const fraction = new BigNumber(pct).dividedBy(100);
                      if (inputType === "fiat" && assetPrice) {
                        const pctUsd = formatAmount(
                          roundUsdValue(
                            new BigNumber(assetPrice)
                              .multipliedBy(
                                new BigNumber(cleanAmount(availableBalance)),
                              )
                              .multipliedBy(fraction)
                              .toString(),
                          ),
                        );
                        formik.setFieldValue("amountUsd", pctUsd);
                        dispatch(saveAmountUsd(pctUsd));
                      } else {
                        const pctAmount = new BigNumber(
                          cleanAmount(availableBalance),
                        )
                          .multipliedBy(fraction)
                          .decimalPlaces(assetDecimals)
                          .toString();
                        formik.setFieldValue("amount", pctAmount);
                        dispatch(saveAmount(pctAmount));
                      }
                    }}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      </View.Content>
      {isEditingSlippage ? (
        <>
          <div className="SlippageWrapper">
            <EditSlippage onClose={() => setIsEditingSlippage(false)} />
          </div>
          <LoadingBackground
            onClick={() => setIsEditingSlippage(false)}
            isActive={isEditingSlippage}
          />
        </>
      ) : null}
      {isEditingSettings ? (
        <>
          <div className="SlippageWrapper">
            <EditSettings
              fee={fee}
              defaultFee={recommendedFee}
              title={t("Swap Settings")}
              timeout={transactionData.transactionTimeout}
              congestion={networkCongestion}
              onClose={() => setIsEditingSettings(false)}
              onSubmit={({
                fee,
                timeout,
              }: {
                fee: string;
                timeout: number;
              }) => {
                dispatch(saveTransactionFee(fee));
                dispatch(saveTransactionTimeout(timeout));
                setIsEditingSettings(false);
              }}
            />
          </div>
          <LoadingBackground
            onClick={() => setIsEditingSettings(false)}
            isActive={isEditingSettings}
          />
        </>
      ) : null}
      <SlideupModal
        setIsModalOpen={() => setIsReviewingTx(false)}
        isModalOpen={isReviewingTx}
      >
        {isReviewingTx ? (
          <ReviewTx
            assetIcon={assetIcon}
            fee={fee}
            networkDetails={networkDetails}
            onCancel={() => setIsReviewingTx(false)}
            // The trustline-added + swap-success metrics fire post-confirmation
            // (in useSubmitTxData), once the swap actually settles — not here at
            // review time (§3.4/§3.8).
            onConfirm={goToNext}
            sendAmount={amount}
            sendPriceUsd={priceValueUsd}
            simulationState={simulationState}
            srcAsset={asset}
            dstAsset={{
              icon: dstAssetIcon,
              canonical: destinationAsset,
              priceUsd: simulationState.data?.dstAmountPriceUsd!,
              amount: destinationAmount,
            }}
            title={t("You are swapping")}
            destinationTokenDetails={transactionData.destinationTokenDetails}
            sourceTokenSecurityLevel={sourceTokenSecurityLevel}
            sourceTokenSecurityWarnings={sourceTokenSecurityWarnings}
          />
        ) : (
          <></>
        )}
      </SlideupModal>
      <SlideupModal
        setIsModalOpen={() => setIsXlmReserveOpen(false)}
        isModalOpen={isXlmReserveOpen}
      >
        {isXlmReserveOpen ? (
          <XlmReserveSheet
            onClose={() => setIsXlmReserveOpen(false)}
            publicKey={publicKey}
            canSwapForReserve={canSwapForReserve}
            helpUrl={XLM_RESERVE_HELP_URL}
            tokenCode={dstAsset ? dstAsset.code : ""}
            onSwapForReserve={handleSwapForReserve}
          />
        ) : (
          <></>
        )}
      </SlideupModal>
    </>
  );
};

interface EditSlippageProps {
  onClose: () => void;
}

const EditSlippage = ({ onClose }: EditSlippageProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { allowedSlippage } = useSelector(transactionDataSelector);

  let presetSlippage = "";
  let customSlippage = "";
  if (["1", "2", "3"].includes(allowedSlippage)) {
    presetSlippage = allowedSlippage;
  } else {
    customSlippage = allowedSlippage;
  }

  return (
    <Formik
      initialValues={{ presetSlippage, customSlippage }}
      onSubmit={(values) => {
        dispatch(
          saveAllowedSlippage(values.customSlippage || values.presetSlippage),
        );
        onClose();
      }}
      validationSchema={YupObject().shape({
        customSlippage: YupNumber()
          .min(0, `${t("must be at least")} 0%`)
          .max(10, `${t("must be below")} 10%`),
      })}
    >
      {({ setFieldValue, values, errors }) => (
        <Form
          className="View__contentAndFooterWrapper"
          data-testid="slippage-form"
        >
          <View.Content hasNoTopPadding>
            <div className="Slippage">
              <Card>
                <p>{t("Allowed Slippage")}</p>
                <div className="Slippage__cards">
                  {["1", "2", "3"].map((value) => (
                    <label key={value} className="Slippage--radio-label">
                      <Field
                        className="Slippage--radio-field"
                        name="presetSlippage"
                        type="radio"
                        value={value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setFieldValue("presetSlippage", e.target.value);
                          setFieldValue("customSlippage", "");
                          dispatch(saveAllowedSlippage(e.target.value));
                          onClose();
                        }}
                      />
                      <Card>{value}%</Card>
                    </label>
                  ))}
                </div>
                <div className="Slippage__custom-input">
                  <Field name="customSlippage">
                    {({ field }: FieldProps) => (
                      <Input
                        data-testid="custom-slippage-input"
                        fieldSize="md"
                        id="custom-input"
                        min={0}
                        max={10}
                        placeholder={`${t("Custom")} %`}
                        type="number"
                        {...field}
                        onChange={(e) => {
                          setFieldValue("customSlippage", e.target.value);
                          setFieldValue("presetSlippage", "");
                        }}
                        error={errors.customSlippage}
                      />
                    )}
                  </Field>
                </div>
                <div className="Slippage__Footer">
                  <Button
                    size="md"
                    isFullWidth
                    isRounded
                    variant="tertiary"
                    type="button"
                    onClick={() => {
                      setFieldValue("presetSlippage", defaultSlippage);
                      setFieldValue("customSlippage", "");
                    }}
                  >
                    {t("Set default")}
                  </Button>
                  <Button
                    size="md"
                    isFullWidth
                    isRounded
                    disabled={!values.presetSlippage && !values.customSlippage}
                    variant="secondary"
                    type="submit"
                  >
                    {t("Done")}
                  </Button>
                </div>
              </Card>
            </div>
          </View.Content>
        </Form>
      )}
    </Formik>
  );
};
