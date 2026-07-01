import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import BigNumber from "bignumber.js";
import { captureException } from "@sentry/browser";
import { BASE_RESERVE } from "@shared/constants/stellar";
import { Button, Icon, Notification } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  saveAmount,
  saveAmountUsd,
  saveAsset,
  saveDestinationAsset,
  saveDestinationTokenDetails,
  saveIsToken,
  saveTransactionFee,
  saveTransactionTimeout,
  clearSwapQuoteExpired,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import {
  cleanAmount,
  formatAmount,
  roundUsdValue,
} from "popup/helpers/formatters";
import { useGetSwapAmountData } from "./hooks/useGetSwapAmountData";
import { getAssetFromCanonical } from "helpers/stellar";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import { getAvailableBalance } from "popup/helpers/soroban";
import { useBlockaidOverrideState } from "popup/helpers/blockaid";
import { AppDispatch } from "popup/App";
import { emitMetric } from "helpers/metrics";
import { InputType } from "helpers/transaction";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { EditSettings } from "popup/components/InternalTransaction/EditSettings";
import { ReviewTx } from "popup/components/InternalTransaction/ReviewTransaction";
import {
  getSwapTotalFee,
  useSimulateTxData,
} from "./hooks/useSimulateSwapData";
import { SwapCtaLabelKey } from "./helpers/swapCtaState";
import { getSwapDerivedData } from "./helpers/getSwapDerivedData";
import { validateSwapAmount } from "./helpers/swapAmountValidation";
import {
  getAmountFontSizeClass,
  getAvailableBalanceFontSizePx,
  buildFiatLineText,
} from "./helpers/swapAmountDisplay";
import { useSwapQuoteExpiry } from "./hooks/useSwapQuoteExpiry";
import { useSwapDestinationScan } from "./hooks/useSwapDestinationScan";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { SlideupModal } from "popup/components/SlideupModal";
import { AmountCard } from "popup/components/amount/AmountCard";
import { PercentageButtons } from "popup/components/amount/PercentageButtons";
import { shouldShowXlmReservePreflight } from "popup/helpers/xlmReserve";
import { horizonGetBestReceivePath } from "popup/helpers/horizonGetBestPath";
import { XlmReserveSheet } from "popup/components/swap/XlmReserveSheet";
import { useSwapLiveQuote } from "./hooks/useSwapLiveQuote";
import { EditSlippage } from "./EditSlippage";

import "./styles.scss";

// "Why do I need XLM?" help article.
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
  const { networkCongestion, recommendedFee } = useNetworkFees();
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
  // is split per op at build time).
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
  // Tracks focus on the sell input so the "Enter an amount" CTA can disable
  // itself while the input is focused. The extension has no virtual keyboard,
  // so once the input is focused the tap-to-focus affordance is redundant.
  // Seed it from the auto-focus condition (both tokens picked → the sell input
  // autoFocuses on mount) so the CTA renders disabled from the first frame
  // instead of flashing enabled→disabled when arriving from the token picker.
  const [isSellInputFocused, setIsSellInputFocused] = useState(
    () => !!asset && !!destinationAsset,
  );

  const handleContinue = async (values: { amount: string }) => {
    // Retrying after a quote-expiry submit failure: dismiss the stale notice
    // before re-simulating against a fresh quote.
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
    const error = validateSwapAmount(amount);
    return error ? { amount: error } : {};
  };

  const formik = useFormik({
    initialValues: { amount, amountUsd, asset, destinationAsset },
    onSubmit: handleContinue,
    validate,
    enableReinitialize: true,
    validateOnChange: true,
  });

  // Gate the fullscreen spinner ONLY on the swap data, never on the network
  // fee: feeStats() has no timeout and a slow Horizon can hang the whole
  // screen for >15s. The fee seeds from the base fee / in-session cache and
  // updates in place when feeStats resolves.
  const isLoading =
    swapAmountData.state === RequestState.IDLE ||
    swapAmountData.state === RequestState.LOADING;

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recover a destination token's Blockaid verdict when it was picked before
  // the async picker scan landed, persisting it onto the stored destination
  // details so the receive badge + review gate keep the assessment.
  useSwapDestinationScan({
    destinationTokenDetails: transactionData.destinationTokenDetails,
    networkDetails,
    blockaidOverrideState,
    dispatch,
  });

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

  // Surfaces the "quote has expired" toast + metric for both the in-screen
  // (isQuoteExpired) and submit-recovery (isSwapQuoteExpired) triggers.
  useSwapQuoteExpiry({
    isQuoteExpired,
    isSwapQuoteExpired,
    asset,
    destinationAsset,
    amount,
    destinationAmount,
    allowedSlippage,
  });

  const sellInputRef = useRef<HTMLInputElement>(null);

  // Live "You receive" quote as the user types (debounced path-only lookup).
  // isLiveQuoteLoading lets the CTA tell "loading a quote" apart from "no path".
  const { isLiveQuoteLoading } = useSwapLiveQuote({
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
  });

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

  // All balance/price/fee/security/CTA derivation. Plain function (not a hook):
  // it runs below the early returns, where a hook would violate rules-of-hooks.
  const {
    sendData,
    assetIcon,
    dstAssetIcon,
    destinationIsNonHeld,
    assetPrice,
    dstAssetPrice,
    assetDecimals,
    priceValue,
    priceValueUsd,
    supportsUsd,
    dstPriceValueUsd,
    availableBalance,
    displayTotal,
    sourceIsNonXlmClassic,
    sourceTokenSecurityLevel,
    sourceTokenSecurityWarnings,
    bestNonXlmClassicCanonical,
    canSwapForReserve,
    isAmountTooHigh,
    cta,
  } = getSwapDerivedData({
    data,
    asset,
    destinationAsset,
    isToken,
    destinationAmount,
    destinationTokenDetails: transactionData.destinationTokenDetails,
    amount: formik.values.amount,
    amountUsd: formik.values.amountUsd,
    fee,
    blockaidOverrideState,
    networkDetails,
    inputType,
    isLiveQuoteLoading,
  });

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
      // erring slightly over rather than under. Still capped to spendable
      // below, so it never exceeds the user's balance.
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
        // to crypto mode so the prefilled amount is the one used.
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
  const availableBalanceFontSizePx =
    getAvailableBalanceFontSizePx(availableBalanceText);

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
                // are missing — rather than a submit.
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
                // the user knows to type an amount.
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
                    // unfocused with a gray "0" placeholder.
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
                    // matching the picker list.
                    securityLevel={sourceTokenSecurityLevel}
                    supportsUsd={Boolean(supportsUsd)}
                    hasUsdPrice={Boolean(assetPrice)}
                    fiatLineText={buildFiatLineText({
                      hasAsset: !!asset,
                      inputType,
                      price: assetPrice,
                      priceUsd: priceValueUsd,
                      cryptoAmount: priceValue,
                      code: srcAsset ? srcAsset.code : "",
                    })}
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
                    // after selection, matching the picker list.
                    securityLevel={
                      transactionData.destinationTokenDetails?.securityLevel
                    }
                    supportsUsd={Boolean(supportsUsd)}
                    hasUsdPrice={Boolean(dstAssetPrice)}
                    fiatLineText={buildFiatLineText({
                      hasAsset: !!destinationAsset,
                      inputType,
                      price: dstAssetPrice,
                      priceUsd: dstPriceValueUsd,
                      cryptoAmount: destinationAmount,
                      code: dstAsset ? dstAsset.code : "",
                    })}
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
            // review time.
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
