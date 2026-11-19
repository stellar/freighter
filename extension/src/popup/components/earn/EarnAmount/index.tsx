import React, { useEffect, useRef, useState } from "react";
import BigNumber from "bignumber.js";
import {
  Button,
  Icon,
  Loader,
  Notification,
  Text,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

import { View } from "popup/basics/layout/View";
import { showToast } from "popup/basics/shadcn/Toast";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { AmountCard } from "popup/components/amount/AmountCard";
import { PercentageButtons } from "popup/components/amount/PercentageButtons";
import {
  DEFAULT_AMOUNT,
  DEFAULT_AMOUNT_USD,
} from "popup/components/amount/constants";
import {
  buildFiatLineText,
  getAmountFontSizeClass,
} from "popup/components/amount/helpers/amountDisplay";
import { SlideupModal } from "popup/components/SlideupModal";
import { SheetLayout } from "popup/components/SheetLayout";
import {
  EditSettings,
  EditSettingsFormValue,
} from "popup/components/InternalTransaction/EditSettings";
import {
  FeesPane,
  buildFeesPaneTotal,
} from "popup/components/InternalTransaction/FeesPane";
import { useReviewSettingsHandoff } from "popup/helpers/useReviewSettingsHandoff";
import { PoolDetailsSheet } from "popup/components/earn/PoolDetailsSheet";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { closeWindow, openTab } from "popup/helpers/navigate";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import {
  cleanAmount,
  formatAmount,
  roundUsdValue,
} from "popup/helpers/formatters";
import { getAssetDecimals, getAvailableBalance } from "popup/helpers/soroban";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { emitMetric, emitScreenViewed } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { scrubStrKeys } from "helpers/stellarStrKey";
import { InputType } from "helpers/transaction";
import {
  trackEarnPercentAmountSelected,
  trackEarnSimulationFailed,
  trackEarnXlmFeeInsufficientShown,
} from "popup/metrics/earn";
import {
  emitSigningRejected,
  SigningKind,
  SigningSource,
} from "popup/metrics/signing";
import {
  saveAmount,
  saveAmountUsd,
  saveTransactionFee,
  saveTransactionTimeout,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { EarnReview } from "popup/components/earn/EarnReview";
import {
  earnSelector,
  saveCurrentPositionTokens,
  saveReviewedAmount,
  setEarnSubmitFailed,
} from "popup/ducks/earn";
import { getBlendSuppliedTokens } from "@shared/api/helpers/blend";
import { isNativeAssetId } from "@shared/helpers/assetIdentity";
import { formatTokenAmount } from "popup/helpers/soroban";

import { PoolCard } from "./PoolCard";
import { NetworkFeeSheet } from "./NetworkFeeSheet";
import {
  getEarnCtaState,
  getXlmFeeShortfall,
  isInsufficientBalanceFailure,
  needsXlmForFee,
} from "./helpers/earnCtaState";
import { getPercentageAmount } from "popup/components/amount/helpers/percentageAmount";
import {
  ResolvedEarnAmount,
  useGetEarnAmountData,
} from "./hooks/useGetEarnAmountData";
import { useSimulateEarnDeposit } from "./hooks/useSimulateEarnDeposit";

import "./styles.scss";

/**
 * Why a build left nothing Review can sign: the field changed while it ran
 * ("stale"), the XLM balance can't pay the fee ("needs_xlm", the fee sheet's
 * remedy), or the reason in words.
 */
type BuildFailure =
  | { kind: "stale" }
  | { kind: "needs_xlm" }
  | { kind: "message"; message: string };

interface EarnAmountProps {
  /** Back to the token picker: the token pill. */
  goBack: () => void;
  /** Leaves the Earn flow: the header's X, as on mobile. */
  onClose: () => void;
  /** Confirmed on the review sheet — hand off to the submit step. */
  onConfirm: () => void;
}

export const EarnAmount = ({ goBack, onClose, onConfirm }: EarnAmountProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch();
  const { state, fetchData } = useGetEarnAmountData();
  const {
    asset,
    amount,
    amountUsd,
    destination,
    transactionFee,
    transactionTimeout,
  } = useSelector(transactionDataSelector);
  const {
    pool,
    selectedAssetApy,
    selectedAssetId,
    lastSubmitFailed,
    currentPositionTokens,
    reviewedAmount,
  } = useSelector(earnSelector);
  const { state: simulationState, simulate } = useSimulateEarnDeposit();
  const { recommendedFee, networkCongestion } = useNetworkFees();
  // The inclusion fee the deposit is built with: the one saved from the
  // review's settings, else the network's recommendation.
  const fee = transactionFee || recommendedFee;

  const [isPoolSheetOpen, setIsPoolSheetOpen] = useState(false);
  const [isFeeSheetOpen, setIsFeeSheetOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  // Whether the staged deposit is the one Review shows, built with its amount
  // and the saved settings. A settings save whose rebuild fails brings Review
  // back with Confirm off until a build succeeds.
  const [isBuildCurrent, setIsBuildCurrent] = useState(false);
  // Entry in tokens or in dollars. The token amount stays the one the deposit
  // is built from; dollars are converted into it as they are typed.
  const [inputType, setInputType] = useState<InputType>("crypto");
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isShowingFeesPane, setIsShowingFeesPane] = useState(false);
  // A fee typed into settings but not saved yet, kept while the fees pane
  // covers the settings sheet so the input comes back with it.
  const [draftFee, setDraftFee] = useState<string | null>(null);
  const hasEmittedReviewView = useRef(false);
  // Leaving the review without approving reports a rejection, as on Send and
  // Swap. Set when it leaves for something else: its settings sheet (the
  // handoff sets it) or Confirm.
  const skipRejectionRef = useRef(false);
  const { openSettingsFromReview, closeSettings, returnToReview } =
    useReviewSettingsHandoff({
      setIsReviewingTx: setIsReviewOpen,
      setIsEditingSettings,
      skipRejectionRef,
    });

  // The field as it is now. A build reads it once it finishes, because the
  // amount stays editable while the deposit is being built.
  const latestFieldRef = useRef({ amount, asset });
  useEffect(() => {
    latestFieldRef.current = { amount, asset };
  }, [amount, asset]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A different asset means the previous asset's rejection no longer describes
  // anything: the amount and simulation have been cleared with it. The screen
  // stays mounted while the picker is up, so nothing tears this state down.
  useEffect(() => {
    setSimulationError("");
    setInputType("crypto");
  }, [asset]);

  // The review sheet is the flow's `confirm` step — the last screen before a
  // signature. It is a sheet rather than a step, so the Earn view's step effect
  // never sees it. The ref clears on close so correcting the amount and
  // reviewing again counts as a second view, but a re-render does not. Closing
  // it without approving is the signing rejection Send and Swap report too.
  useEffect(() => {
    if (!isReviewOpen) {
      if (!hasEmittedReviewView.current) {
        return;
      }
      hasEmittedReviewView.current = false;
      if (!skipRejectionRef.current) {
        emitSigningRejected(SigningKind.Transaction, {
          source: SigningSource.Internal,
        });
      }
      return;
    }
    if (hasEmittedReviewView.current) {
      return;
    }
    hasEmittedReviewView.current = true;
    skipRejectionRef.current = false;
    emitScreenViewed("earn_review", { flow: "earn", step: "confirm" });
  }, [isReviewOpen]);

  const header = (
    <SubviewHeader
      title={<span className="EarnAmount__title">{t("Deposit")}</span>}
      customBackAction={onClose}
      customBackIcon={<Icon.X />}
    />
  );

  if (state.data?.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      closeWindow();
    }
    // `from` brings the user back here after unlocking, as every other
    // reroute does.
    return (
      <Navigate
        to={state.data.routeTarget}
        state={{ from: location }}
        replace
      />
    );
  }

  const isLoading =
    state.state === RequestState.IDLE || state.state === RequestState.LOADING;

  if (isLoading || state.state === RequestState.ERROR) {
    return (
      <View data-testid="earn-amount-loading">
        {header}
        <View.Content>
          <div className="EarnAmount__loader">
            {isLoading ? (
              <Loader size="2rem" />
            ) : (
              <Text as="p" size="sm">
                {t("We couldn’t load your balances. Please try again.")}
              </Text>
            )}
          </div>
        </View.Content>
      </View>
    );
  }

  const data = state.data as ResolvedEarnAmount;
  const selected = asset ? getAssetFromCanonical(asset) : null;
  const decimals = getAssetDecimals(asset, data.balances, true);

  const assetPrice = data.tokenPrices[asset]?.currentPrice;
  // The input keeps the amount as typed, separators included ("1,000"), which
  // BigNumber and parseTokenAmount read as NaN. Everything that uses it as a
  // number takes this instead.
  const depositAmount = cleanAmount(amount || "0");
  // Left unformatted ("1234.56") and formatted where it is shown: the review
  // also adds it to the position, which a thousands separator turns into NaN.
  const getUsdValue = (tokenAmount: string) =>
    assetPrice
      ? roundUsdValue(
          new BigNumber(assetPrice)
            .multipliedBy(new BigNumber(tokenAmount))
            .toString(),
        )
      : null;
  const depositUsd = getUsdValue(depositAmount);
  // What Review shows: the amount the staged deposit was built with, which the
  // field may no longer say.
  const amountToShow = reviewedAmount ?? depositAmount;

  // Nets out the base reserve and the inclusion fee. A Blend submit's resource
  // fee is far larger, but nothing is held back for it here: the whole balance
  // stays depositable and buildDeposit checks the measured fee once simulation
  // reports it.
  const availableBalance = asset
    ? getAvailableBalance({
        assetCanonical: asset,
        balances: data.balances.balances,
        recommendedFee: fee,
      })
    : "0";

  const isXlm = isNativeAssetId(asset);

  const enteredAmount = new BigNumber(depositAmount);
  const isAmountTooHigh = enteredAmount.gt(new BigNumber(availableBalance));
  const cta = getEarnCtaState({
    availableBalanceIsZero: new BigNumber(availableBalance).lte(0),
    amountIsZero: enteredAmount.lte(0),
    isAmountTooHigh,
  });

  const ctaLabel = {
    enter: t("Enter an amount"),
    insufficient: t("Insufficient balance"),
    review: t("Review deposit"),
  }[cta.labelKey];

  // XLM left once the reserve and the given inclusion fee are netted out. Takes
  // the fee rather than closing over it: a settings save rebuilds with a fee
  // this render has not seen yet.
  const getSpendableXlm = (inclusionFee: string) =>
    getAvailableBalance({
      assetCanonical: "native",
      balances: data.balances.balances,
      recommendedFee: inclusionFee,
    });

  /**
   * Builds and simulates the deposit of `amountToReview` with the given fee and
   * timeout, then runs the checks only a simulation can answer. Resolves null
   * when the staged deposit is ready for Review: it was built with
   * `amountToReview`, and the field still says the same. Otherwise it resolves
   * why not, and the caller shows it.
   */
  const buildDeposit = async ({
    amountToReview,
    inclusionFee,
    timeout,
  }: {
    amountToReview: string;
    inclusionFee: string;
    timeout: number;
  }): Promise<BuildFailure | null> => {
    // Clear a previous failure so the banner does not persist into a retry the
    // user has already corrected.
    dispatch(setEarnSubmitFailed(false));
    setSimulationError("");
    setIsBuildCurrent(false);

    const spendableXlm = getSpendableXlm(inclusionFee);

    // Checked after the CTA gate, so an unaffordable XLM deposit reads as
    // "Insufficient balance" rather than as a missing-fee problem. Compared
    // before the fee comes out (fee "0"), as Swap's check is: netting it out
    // first and then comparing against it again would ask for the fee twice.
    if (
      needsXlmForFee({
        spendableXlm: getSpendableXlm("0"),
        fee: inclusionFee,
      })
    ) {
      trackEarnXlmFeeInsufficientShown({
        assetCode: selected?.code || "",
        reason: "no_xlm",
      });
      return { kind: "needs_xlm" };
    }

    const assetToReview = asset;
    setIsSimulating(true);
    try {
      // The existing position is the "before" half of Review's 0.00 -> N row,
      // and it also feeds both earnings projections. Awaited with the simulation
      // so the sheet opens with a settled before-value rather than flipping
      // three rows under the user when the slower of the two lands. Still
      // non-fatal: a failed lookup resolves to "0" instead of rejecting, so it
      // can never block a deposit that is otherwise valid.
      const positionPromise = getBlendSuppliedTokens({
        publicKey: data.publicKey,
        poolId: destination,
        assetId: selectedAssetId,
        networkDetails: data.networkDetails,
      })
        .then((raw) => formatTokenAmount(new BigNumber(raw), decimals))
        .catch(() => "0");

      const [simulation, position] = await Promise.all([
        simulate({
          publicKey: data.publicKey,
          assetId: selectedAssetId,
          amount: amountToReview,
          decimals,
          networkDetails: data.networkDetails,
          transactionFee: inclusionFee,
          transactionTimeout: timeout,
        }),
        positionPromise,
      ]);

      // The field changed while the deposit was being built, so the build no
      // longer matches it. Review stays closed and the CTA is back for the new
      // amount; opening it would show one amount and sign another.
      const latestField = latestFieldRef.current;
      if (
        latestField.asset !== assetToReview ||
        !new BigNumber(cleanAmount(latestField.amount || "0")).eq(
          amountToReview,
        )
      ) {
        return { kind: "stale" };
      }

      dispatch(saveCurrentPositionTokens(position));

      // Simulation is the first place the resource fee is known, so a deposit
      // that leaves nothing for it is caught here rather than by holding a
      // guessed buffer back from the balance. The submission would otherwise
      // fail with txINSUFFICIENT_BALANCE after the user had already signed.
      //
      // The fee is XLM-only, so the remainder it comes out of is whatever an XLM
      // deposit leaves behind — or, for any other asset, the whole untouched
      // spendable balance. The pre-simulation gate above is only inclusion-fee
      // sized, which a Blend submit's resource fee dwarfs by ~5,000x, so a
      // non-XLM deposit is just as capable of being short here.
      const shortfall = getXlmFeeShortfall({
        spendableXlm,
        amount: isXlm ? amountToReview : "0",
        resourceFee: simulation.resourceFee || "0",
      });

      if (new BigNumber(shortfall).gt(0)) {
        trackEarnXlmFeeInsufficientShown({
          assetCode: selected?.code || "",
          reason: "fee_not_covered",
        });
        // Only an XLM deposit can trade amount for fee. For anything else the
        // deposit is not competing with the fee at all, so the remedy is more
        // XLM — the same sheet the pre-simulation gate opens.
        if (!isXlm) {
          return { kind: "needs_xlm" };
        }
        return {
          kind: "message",
          message: t(
            "Not enough XLM left for the network fee. Reduce your deposit by at least {{amount}} XLM.",
            { amount: formatAmount(shortfall) },
          ),
        };
      }

      setIsBuildCurrent(true);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A simulation failure is the deposit's own pre-flight rejection — the
      // same analytical unit as `payment.simulation_failed`, and never reaching
      // the network means it has no result codes to key on, only this message.
      trackEarnSimulationFailed({
        assetCode: selected?.code || "",
        reasonCode: scrubStrKeys(message) || "unknown",
      });
      // A balance rejection on an XLM deposit is the fee, not the amount: the
      // CTA already gates anything above the spendable balance, so what is left
      // is a deposit that cannot also pay for itself. Every other rejection is
      // the pool's own and reads better in its own words.
      return {
        kind: "message",
        message:
          isXlm && isInsufficientBalanceFailure(message)
            ? t(
                "Not enough XLM to cover the network fee. Try depositing a smaller amount.",
              )
            : message,
      };
    } finally {
      setIsSimulating(false);
    }
  };

  const handleContinue = async () => {
    const amountToReview = depositAmount;
    const failure = await buildDeposit({
      amountToReview,
      inclusionFee: fee,
      timeout: transactionTimeout,
    });
    if (failure) {
      // Said on this screen. A stale build says nothing: the CTA is back for
      // the amount the field has now.
      if (failure.kind === "needs_xlm") {
        setIsFeeSheetOpen(true);
      } else if (failure.kind === "message") {
        setSimulationError(failure.message);
      }
      return;
    }
    // Recorded with the build it describes, so Review and the deposit screens
    // show the amount Confirm signs.
    dispatch(saveReviewedAmount(amountToReview));
    setIsReviewOpen(true);
  };

  // The review's gear: the same fee/timeout sheet Send and Swap use. Saving
  // rebuilds the deposit before Review comes back, so Confirm never signs the
  // transaction built with the old settings. Review comes back either way, as
  // on Send and Swap; after a failed rebuild a toast says why and Confirm stays
  // off.
  const handleSettingsSubmit = async ({
    fee: nextFee,
    timeout,
  }: EditSettingsFormValue) => {
    const savedFee = nextFee.trim() || fee;
    dispatch(saveTransactionFee(savedFee));
    dispatch(saveTransactionTimeout(timeout));
    setIsEditingSettings(false);
    setDraftFee(null);
    const failure = await buildDeposit({
      amountToReview: amountToShow,
      inclusionFee: savedFee,
      timeout,
    });
    if (failure && failure.kind !== "stale") {
      const reason =
        failure.kind === "needs_xlm"
          ? t("Not enough XLM for network fees")
          : failure.message;
      showToast(() => <Notification variant="error" title={reason} />);
    }
    returnToReview();
  };

  const closeSettingsSheet = () => {
    setDraftFee(null);
    closeSettings();
  };

  return (
    <View data-testid="earn-amount">
      {header}
      <View.Content
        contentFooter={
          <Button
            size="lg"
            isFullWidth
            isRounded
            variant="secondary"
            disabled={cta.disabled || isSimulating}
            isLoading={isSimulating}
            onClick={handleContinue}
            data-testid="earn-amount-btn-continue"
          >
            {ctaLabel}
          </Button>
        }
      >
        <div className="EarnAmount">
          {(lastSubmitFailed || simulationError) && (
            <div
              className="EarnAmount__error"
              data-testid="earn-amount-fail-banner"
            >
              <Notification
                variant="error"
                title={simulationError || t("Transaction failed. Try again.")}
              />
            </div>
          )}

          <AmountCard
            label={t("You deposit")}
            availableBalanceText={t("{{amount}} {{code}} available", {
              amount: formatAmount(availableBalance),
              code: selected?.code || "",
            })}
            availableBalanceFontSizePx={12}
            inputType={inputType}
            // Dollar entry needs a price to convert with.
            supportsUsd={Boolean(assetPrice)}
            hasUsdPrice={Boolean(assetPrice)}
            amount={amount === DEFAULT_AMOUNT ? "" : amount}
            amountUsd={amountUsd === DEFAULT_AMOUNT_USD ? "" : amountUsd}
            amountFontSizeClass={getAmountFontSizeClass(
              inputType === "fiat" ? amountUsd : amount,
            )}
            assetCode={selected?.code || ""}
            // The account's icon map, not an empty one: AssetIcon reads empty as
            // "lookup still in flight" and holds a loader, which only looked
            // right while XLM — whose logo is bundled and skips the lookup — was
            // the sole depositable token.
            assetIcons={data.balances.icons || {}}
            assetIssuerKey={selected?.issuer}
            fiatLineText={buildFiatLineText({
              hasAsset: Boolean(asset),
              inputType,
              price: assetPrice,
              priceUsd: depositUsd === null ? null : formatAmount(depositUsd),
              cryptoAmount: amount,
              code: selected?.code || "",
            })}
            // Over the spendable amount, the card says so and names the
            // maximum, as on Swap.
            isAmountTooHigh={isAmountTooHigh}
            maxSpendableText={formatAmount(availableBalance)}
            cryptoDecimals={decimals}
            onAmountChange={({ amount: next }) =>
              dispatch(saveAmount(next === "" ? DEFAULT_AMOUNT : next))
            }
            onAmountUsdChange={({ amount: nextUsd }) => {
              const usd = nextUsd === "" ? DEFAULT_AMOUNT_USD : nextUsd;
              dispatch(saveAmountUsd(usd));
              // Keep the token amount, which the deposit is built from, in
              // step with the dollars typed.
              dispatch(
                saveAmount(
                  assetPrice
                    ? new BigNumber(cleanAmount(usd))
                        .dividedBy(assetPrice)
                        .decimalPlaces(decimals, BigNumber.ROUND_DOWN)
                        .toString()
                    : DEFAULT_AMOUNT,
                ),
              );
            }}
            onToggleInputType={() => {
              const next = inputType === "crypto" ? "fiat" : "crypto";
              // Switching to dollars seeds them from the token amount. Back in
              // tokens the amount is already the source of truth.
              if (next === "fiat") {
                dispatch(
                  saveAmountUsd(
                    depositUsd === null ? DEFAULT_AMOUNT_USD : depositUsd,
                  ),
                );
              }
              setInputType(next);
            }}
            // The asset is fixed once chosen; changing it means going back to
            // the picker, where the pool's rate for it is also re-read.
            onSelectAsset={goBack}
          />

          {pool && (
            <PoolCard
              poolName={pool.name}
              apy={selectedAssetApy}
              onOpenDetails={() => {
                emitMetric(METRIC_NAMES.earnPoolDetailsOpened, {
                  pool_id: pool.id,
                });
                setIsPoolSheetOpen(true);
              }}
            />
          )}

          <PercentageButtons
            onSelect={(pct) => {
              trackEarnPercentAmountSelected({
                assetCode: selected?.code || "",
                percent: pct,
              });
              const pctAmount = getPercentageAmount({
                availableBalance,
                pct,
                decimals,
              });
              dispatch(saveAmount(pctAmount));
              // Always a share of the token balance; in dollar mode the dollar
              // field mirrors it for display.
              if (inputType === "fiat") {
                const pctUsd = getUsdValue(pctAmount);
                dispatch(saveAmountUsd(pctUsd ?? DEFAULT_AMOUNT_USD));
              }
            }}
          />
        </div>
      </View.Content>

      <SlideupModal
        isModalOpen={isReviewOpen}
        setIsModalOpen={setIsReviewOpen}
        ariaLabel={t("Review deposit")}
      >
        <EarnReview
          pool={pool}
          assetCode={selected?.code || ""}
          assetIssuer={selected?.issuer}
          // Without this the sheet builds an empty icon map, which AssetIcon
          // reads as a lookup in flight and answers with a spinner.
          assetIcon={data.balances.icons?.[asset]}
          amount={amountToShow}
          amountUsd={getUsdValue(amountToShow)}
          apy={selectedAssetApy}
          currentPosition={currentPositionTokens}
          currentPositionUsd={
            assetPrice
              ? new BigNumber(currentPositionTokens)
                  .multipliedBy(assetPrice)
                  .toFixed(2)
              : null
          }
          simulationState={simulationState}
          isBuildCurrent={isBuildCurrent}
          networkDetails={data.networkDetails}
          onCancel={() => setIsReviewOpen(false)}
          onConfirm={() => {
            skipRejectionRef.current = true;
            setIsReviewOpen(false);
            onConfirm();
          }}
          onEditSettings={openSettingsFromReview}
        />
      </SlideupModal>

      <SlideupModal
        isModalOpen={isEditingSettings && !isShowingFeesPane}
        setIsModalOpen={closeSettingsSheet}
        ariaLabel={t("Settings")}
      >
        {isEditingSettings ? (
          <EditSettings
            fee={draftFee ?? fee}
            defaultFee={recommendedFee}
            timeout={transactionTimeout}
            congestion={networkCongestion}
            // A deposit is a Soroban transaction: the field is its inclusion
            // fee, and the resource fee comes from simulation.
            isSoroban
            onFeeChange={setDraftFee}
            onClose={closeSettingsSheet}
            onShowFeesInfo={(currentDraftFee) => {
              setDraftFee(currentDraftFee);
              setIsShowingFeesPane(true);
            }}
            onSubmit={handleSettingsSubmit}
          />
        ) : (
          <></>
        )}
      </SlideupModal>

      {/* Mounted unconditionally with only its contents gated, as in Send: an
          unmount on close would cut the slide-out short. */}
      <SlideupModal
        isModalOpen={isShowingFeesPane}
        setIsModalOpen={() => setIsShowingFeesPane(false)}
        ariaLabel={t("Fees")}
      >
        {isShowingFeesPane ? (
          <SheetLayout>
            <FeesPane
              fee={buildFeesPaneTotal(
                draftFee ?? fee,
                simulationState.state === RequestState.ERROR
                  ? undefined
                  : simulationState.data?.resourceFee,
              )}
              simulationState={simulationState}
              isSoroban
              onClose={() => setIsShowingFeesPane(false)}
            />
          </SheetLayout>
        ) : (
          <></>
        )}
      </SlideupModal>

      <SlideupModal
        isModalOpen={isPoolSheetOpen}
        setIsModalOpen={setIsPoolSheetOpen}
        ariaLabel={pool ? formatPoolName(pool.name, t) : undefined}
      >
        {pool ? (
          <PoolDetailsSheet
            pool={pool}
            token={{
              code: selected?.code || "",
              issuer: selected?.issuer,
              icon: data.balances.icons?.[asset],
              apy: selectedAssetApy,
            }}
            onClose={() => setIsPoolSheetOpen(false)}
          />
        ) : (
          <div />
        )}
      </SlideupModal>

      <SlideupModal
        isModalOpen={isFeeSheetOpen}
        setIsModalOpen={setIsFeeSheetOpen}
        ariaLabel={t("You need XLM to pay fees")}
      >
        <NetworkFeeSheet
          canBuyXlm={isMainnet(data.networkDetails)}
          onClose={() => setIsFeeSheetOpen(false)}
        />
      </SlideupModal>
    </View>
  );
};
