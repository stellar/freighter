import React, { useEffect, useRef, useState } from "react";
import BigNumber from "bignumber.js";
import { Button, Loader, Notification, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { AmountCard } from "popup/components/amount/AmountCard";
import { PercentageButtons } from "popup/components/amount/PercentageButtons";
import { DEFAULT_AMOUNT } from "popup/components/amount/constants";
import {
  buildFiatLineText,
  getAmountFontSizeClass,
} from "popup/components/amount/helpers/amountDisplay";
import { SlideupModal } from "popup/components/SlideupModal";
import { PoolDetailsSheet } from "popup/components/earn/PoolDetailsSheet";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { openTab } from "popup/helpers/navigate";
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
import {
  trackEarnPercentAmountSelected,
  trackEarnSimulationFailed,
  trackEarnXlmFeeInsufficientShown,
} from "popup/metrics/earn";
import {
  saveAmount,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { EarnReview } from "popup/components/earn/EarnReview";
import {
  earnSelector,
  saveCurrentPositionTokens,
  setEarnSubmitFailed,
} from "popup/ducks/earn";
import { getBlendSuppliedTokens } from "@shared/api/helpers/blend";
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

interface EarnAmountProps {
  goBack: () => void;
  /** Confirmed on the review sheet — hand off to the submit step. */
  onConfirm: () => void;
}

export const EarnAmount = ({ goBack, onConfirm }: EarnAmountProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { state, fetchData } = useGetEarnAmountData();
  const { asset, amount, destination, transactionTimeout } = useSelector(
    transactionDataSelector,
  );
  const {
    pool,
    selectedAssetApy,
    selectedAssetId,
    lastSubmitFailed,
    currentPositionTokens,
  } = useSelector(earnSelector);
  const { state: simulationState, simulate } = useSimulateEarnDeposit();
  const { recommendedFee } = useNetworkFees();

  const [isPoolSheetOpen, setIsPoolSheetOpen] = useState(false);
  const [isFeeSheetOpen, setIsFeeSheetOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const hasEmittedReviewView = useRef(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A different asset means the previous asset's rejection no longer describes
  // anything: the amount and simulation have been cleared with it. The screen
  // stays mounted while the picker is up, so nothing tears this state down.
  useEffect(() => {
    setSimulationError("");
  }, [asset]);

  // The review sheet is the flow's `confirm` step — the last screen before a
  // signature. It is a sheet rather than a step, so the Earn view's step effect
  // never sees it. The ref clears on close so correcting the amount and
  // reviewing again counts as a second view, but a re-render does not.
  useEffect(() => {
    if (!isReviewOpen) {
      hasEmittedReviewView.current = false;
      return;
    }
    if (hasEmittedReviewView.current) {
      return;
    }
    hasEmittedReviewView.current = true;
    emitScreenViewed("earn_review", { flow: "earn", step: "confirm" });
  }, [isReviewOpen]);

  if (state.data?.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      window.close();
    }
    return <Navigate to={state.data.routeTarget} replace />;
  }

  const isLoading =
    state.state === RequestState.IDLE || state.state === RequestState.LOADING;

  if (isLoading || state.state === RequestState.ERROR) {
    return (
      <View data-testid="earn-amount-loading">
        <SubviewHeader title={t("Deposit")} customBackAction={goBack} />
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
  const priceValueUsd = assetPrice
    ? formatAmount(
        roundUsdValue(
          new BigNumber(assetPrice)
            .multipliedBy(new BigNumber(cleanAmount(amount || "0")))
            .toString(),
        ),
      )
    : null;

  // Nets out the base reserve and the inclusion fee. A Blend submit's resource
  // fee is far larger, but nothing is held back for it here: the whole balance
  // stays depositable and handleContinue checks the measured fee once simulation
  // reports it.
  const availableBalance = asset
    ? getAvailableBalance({
        assetCanonical: asset,
        balances: data.balances.balances,
        recommendedFee,
      })
    : "0";

  const isXlm = asset === "native";

  const enteredAmount = new BigNumber(cleanAmount(amount || "0"));
  const isAmountTooHigh = enteredAmount.gt(new BigNumber(availableBalance));
  const cta = getEarnCtaState({
    availableBalanceIsZero: new BigNumber(availableBalance).lte(0),
    amountIsZero: enteredAmount.lte(0),
    isAmountTooHigh,
  });

  const ctaLabel = {
    enter: t("Enter an amount"),
    insufficient: t("Insufficient funds"),
    review: t("Review deposit"),
  }[cta.labelKey];

  const spendableXlm = getAvailableBalance({
    assetCanonical: "native",
    balances: data.balances.balances,
    recommendedFee,
  });

  const handleContinue = async () => {
    // Clear a previous failure so the banner does not persist into a retry the
    // user has already corrected.
    dispatch(setEarnSubmitFailed(false));
    setSimulationError("");

    // Checked after the CTA gate, so an unaffordable XLM deposit reads as
    // "Insufficient funds" rather than as a missing-fee problem.
    if (needsXlmForFee({ spendableXlm, fee: recommendedFee })) {
      trackEarnXlmFeeInsufficientShown({
        assetCode: selected?.code || "",
        reason: "no_xlm",
      });
      setIsFeeSheetOpen(true);
      return;
    }

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
          amount,
          decimals,
          networkDetails: data.networkDetails,
          transactionFee: recommendedFee,
          transactionTimeout,
        }),
        positionPromise,
      ]);

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
        amount: isXlm ? enteredAmount.toFixed() : "0",
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
        if (isXlm) {
          setSimulationError(
            t(
              "Not enough XLM left for the network fee. Reduce your deposit by at least {{amount}} XLM.",
              { amount: formatAmount(shortfall) },
            ),
          );
        } else {
          setIsFeeSheetOpen(true);
        }
        return;
      }

      setIsReviewOpen(true);
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
      setSimulationError(
        isXlm && isInsufficientBalanceFailure(message)
          ? t(
              "Not enough XLM to cover the network fee. Try depositing a smaller amount.",
            )
          : message,
      );
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <View data-testid="earn-amount">
      <SubviewHeader title={t("Deposit")} customBackAction={goBack} />
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
            // Fiat entry is not offered here: the deposit is denominated in the
            // pool's asset, so a fiat-first input would only add rounding.
            inputType="crypto"
            supportsUsd={false}
            hasUsdPrice={Boolean(assetPrice)}
            amount={amount === DEFAULT_AMOUNT ? "" : amount}
            amountUsd=""
            amountFontSizeClass={getAmountFontSizeClass(amount)}
            assetCode={selected?.code || ""}
            // The account's icon map, not an empty one: AssetIcon reads empty as
            // "lookup still in flight" and holds a loader, which only looked
            // right while XLM — whose logo is bundled and skips the lookup — was
            // the sole depositable token.
            assetIcons={data.balances.icons || {}}
            assetIssuerKey={selected?.issuer}
            fiatLineText={buildFiatLineText({
              hasAsset: Boolean(asset),
              inputType: "crypto",
              price: assetPrice,
              priceUsd: priceValueUsd,
              cryptoAmount: amount,
              code: selected?.code || "",
            })}
            isAmountTooHigh={isAmountTooHigh}
            // The design turns the amount red rather than adding a message row:
            // the CTA below already reads "Insufficient funds".
            invalidAmountStyle="amount"
            maxSpendableText={formatAmount(availableBalance)}
            cryptoDecimals={decimals}
            onAmountChange={({ amount: next }) =>
              dispatch(saveAmount(next === "" ? DEFAULT_AMOUNT : next))
            }
            onAmountUsdChange={() => {}}
            onToggleInputType={() => {}}
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
              dispatch(
                saveAmount(
                  getPercentageAmount({
                    availableBalance,
                    pct,
                    decimals,
                  }),
                ),
              );
            }}
          />
        </div>
      </View.Content>

      <SlideupModal
        isModalOpen={isReviewOpen}
        setIsModalOpen={setIsReviewOpen}
        hasBackdrop
      >
        <EarnReview
          pool={pool}
          assetCode={selected?.code || ""}
          assetIssuer={selected?.issuer}
          // Without this the sheet builds an empty icon map, which AssetIcon
          // reads as a lookup in flight and answers with a spinner.
          assetIcon={data.balances.icons?.[asset]}
          amount={amount}
          amountUsd={priceValueUsd}
          apy={selectedAssetApy}
          currentPosition={currentPositionTokens}
          currentPositionUsd={
            assetPrice
              ? new BigNumber(currentPositionTokens)
                  .multipliedBy(assetPrice)
                  .toFixed(2)
              : null
          }
          fee={recommendedFee}
          simulationState={simulationState}
          networkDetails={data.networkDetails}
          onCancel={() => setIsReviewOpen(false)}
          onConfirm={() => {
            setIsReviewOpen(false);
            onConfirm();
          }}
        />
      </SlideupModal>

      <SlideupModal
        isModalOpen={isPoolSheetOpen}
        setIsModalOpen={setIsPoolSheetOpen}
        hasBackdrop
      >
        {pool ? (
          <PoolDetailsSheet
            pool={pool}
            onClose={() => setIsPoolSheetOpen(false)}
          />
        ) : (
          <div />
        )}
      </SlideupModal>

      <SlideupModal
        isModalOpen={isFeeSheetOpen}
        setIsModalOpen={setIsFeeSheetOpen}
        hasBackdrop
      >
        <NetworkFeeSheet
          canBuyXlm={isMainnet(data.networkDetails)}
          onClose={() => setIsFeeSheetOpen(false)}
        />
      </SlideupModal>
    </View>
  );
};
