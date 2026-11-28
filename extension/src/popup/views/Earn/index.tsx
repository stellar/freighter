import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { ROUTES } from "popup/constants/routes";
import { STEPS } from "popup/constants/earn";
import { navigateTo } from "popup/helpers/navigate";
import {
  ScreenByStep,
  useStepScreenViews,
} from "popup/helpers/useStepScreenViews";
import { ActionStatus } from "@shared/api/types";
import { resetSimulation } from "popup/ducks/token-payment";
import {
  resetSubmission,
  resetSubmitStatus,
  saveAsset,
  saveDestination,
  saveIsToken,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import {
  earnSelector,
  resetEarn,
  resetEarnAttempt,
  saveCurrentPositionTokens,
  saveEarnPool,
  saveSelectedAssetApy,
  saveSelectedAssetId,
  setDidSwapInFlow,
  setEarnSubmitFailed,
} from "popup/ducks/earn";
import { trackEarnTokenSelected } from "popup/metrics/earn";
import { showToast } from "popup/basics/shadcn/Toast";
import { formatAmount } from "popup/helpers/formatters";
import { EarnIntro } from "popup/components/earn/EarnIntro";
import { useEarnIntroSeen } from "popup/components/earn/EarnIntro/hooks/useEarnIntroSeen";
import { EarnTokenPicker } from "popup/components/earn/EarnTokenPicker";
import { EarnAmount } from "popup/components/earn/EarnAmount";
import { EarnSubmit } from "popup/components/earn/EarnSubmit";
import { EarnSwap } from "popup/components/earn/EarnSwap";
import { pickSwapSource } from "popup/components/earn/EarnSwap/helpers/pickSwapSource";
import { tokenPricesSelector } from "popup/ducks/cache";
import { resolveSwapDestination } from "popup/components/earn/EarnTokenPicker/helpers/resolveSwapDestination";
import {
  DestinationTokenDetails,
  saveDestinationAsset,
  saveDestinationTokenDetails,
} from "popup/ducks/transactionSubmission";
import { Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import "./styles.scss";

type EnterAnim = "from-bottom" | "from-right" | "from-left";

/**
 * Screen-view metric per step. Names are kept in sync with freighter-mobile so
 * the Earn funnel joins cross-platform (RFC #2883); SWAP is absent because the
 * swap branch emits its own screens.
 *
 * DEPOSIT_CONFIRM is absent too: it is two screens in the funnel — `processing`
 * while in flight, then `success` — and only EarnSubmit can see that
 * transition, so it owns both of its screen views. The `confirm` step is the
 * review sheet, emitted by EarnAmount.
 */
const EARN_SCREEN_BY_STEP: ScreenByStep<STEPS> = {
  [STEPS.INTRO]: { screen_name: "earn_intro", flow: "earn" },
  [STEPS.CHOOSE_TOKEN]: { screen_name: "earn_select_token", flow: "earn" },
  [STEPS.AMOUNT]: { screen_name: "earn_amount", flow: "earn" },
};

export const Earn = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasSeenIntro, dismissIntro } = useEarnIntroSeen();
  const submission = useSelector(transactionSubmissionSelector);
  const { selectedAssetId } = useSelector(earnSelector);
  const tokenPrices = useSelector(tokenPricesSelector);

  // No step until the persisted intro flag has resolved: the flow opens on the
  // interstitial only once it is known to be unseen. Opening on either step
  // first would flash it — the intro for every returning user, or the picker
  // for a first visit — and report that screen's view ahead of the right one.
  const [activeStep, setActiveStep] = useState<STEPS | null>(null);
  const [visitedSteps, setVisitedSteps] = useState<Record<STEPS, boolean>>(
    () => ({}) as Record<STEPS, boolean>,
  );
  const [enterAnim, setEnterAnim] = useState<EnterAnim>("from-bottom");
  // The picker stays mounted across the swap branch, and so does the deposit
  // screen once visited, so both need an explicit nudge to re-fetch balances
  // once a swap lands. Otherwise the token a swap just bought reads as 0
  // available on its deposit screen.
  const [balancesRefreshKey, setBalancesRefreshKey] = useState(0);
  const [swapTarget, setSwapTarget] = useState<{
    canonical: string;
    details: DestinationTokenDetails;
    /** The token the swap starts from. */
    source: string;
  } | null>(null);

  // Whether this visit has submitted a deposit. Closing a deposit in flight
  // doesn't stop it, so it can fail after Earn has been opened again. That
  // failure belongs to the visit that made it, whose submit hook reports it.
  const hasSubmittedDeposit = useRef(false);
  // True while a submission the swap branch started is unsettled. The swap and
  // the deposit share the submission slice, so this is how a swap's outcome is
  // told apart from a deposit's, including a swap whose sheet was closed while
  // it was still in flight.
  const isSwapSubmitting = useRef(false);

  const goToStep = (next: STEPS, anim: EnterAnim | "dismiss") => {
    setEnterAnim(anim === "dismiss" ? "from-bottom" : anim);
    setVisitedSteps((currentSteps) => ({ ...currentSteps, [next]: true }));
    setActiveStep(next);
  };

  const closeEarnFlow = () => {
    dispatch(resetEarn());
    dispatch(resetSubmission());
    navigateTo(ROUTES.account, navigate);
  };

  // Only the X button runs closeEarnFlow, so a visit left another way (Buy,
  // for one) would otherwise hand its failure banner and its swap to this one.
  useEffect(() => {
    dispatch(resetSubmission());
    dispatch(resetEarnAttempt());
  }, [dispatch]);

  useEffect(() => {
    if (activeStep !== null || hasSeenIntro === null) {
      return;
    }
    goToStep(hasSeenIntro ? STEPS.CHOOSE_TOKEN : STEPS.INTRO, "from-bottom");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSeenIntro]);

  // A failed submission returns to the amount screen with a banner rather than
  // showing a terminal failure state — the design has no SubmitFail for Earn,
  // and the amount is the only place the user can act on the failure.
  //
  // Every way a deposit can fail lands in `submitStatus: ERROR` (see
  // transactionSubmission's extraReducers), so this effect owns the UI response
  // to all of them. It does not emit the metric: the deposit step's
  // useSubmitEarnTxData does, and its continuation outlives the in-flight
  // screen the user is invited to close. A device that refuses to sign never
  // gets that far, and never sets ERROR either: HardwareSign shows the refusal
  // on the review sheet.
  useEffect(() => {
    // A swap's outcome is the swap's to show: its sheet renders the success
    // and failure screens itself. Treating it as a deposit failure would report
    // earn.deposit_failed for a deposit nobody made and drop the user onto the
    // amount screen.
    const isSwapOpen = swapTarget !== null;
    if (isSwapOpen && submission.submitStatus === ActionStatus.PENDING) {
      isSwapSubmitting.current = true;
    }
    const isSettled =
      submission.submitStatus === ActionStatus.SUCCESS ||
      submission.submitStatus === ActionStatus.ERROR;
    if (isSwapSubmitting.current && isSettled) {
      isSwapSubmitting.current = false;
      if (!isSwapOpen) {
        // Closed while in flight, so nothing is showing this outcome. Clear
        // it so the deposit doesn't start from it, and re-read balances in
        // case the swap went through.
        dispatch(resetSubmitStatus());
        setBalancesRefreshKey((key) => key + 1);
      }
      return;
    }
    if (isSwapOpen) {
      return;
    }

    if (submission.submitStatus !== ActionStatus.ERROR) {
      return;
    }
    if (!hasSubmittedDeposit.current) {
      // A deposit from an earlier visit, closed in flight and failing now (or
      // before this one opened). Acting on it would show its failure on a flow
      // that has submitted nothing, so clear it instead.
      dispatch(resetSubmitStatus());
      return;
    }
    hasSubmittedDeposit.current = false;
    dispatch(setEarnSubmitFailed(true));
    // Keeps transactionData and the simulation so the amount screen comes back
    // populated and the user can retry without re-entering anything.
    dispatch(resetSubmitStatus());
    goToStep(STEPS.AMOUNT, "dismiss");
    // Unvisit the terminal rather than leaning on renderStep's blanking. Every
    // visited step stays mounted, so a step that is merely blanked while
    // submitStatus is ERROR returns the instant resetSubmitStatus clears the
    // flag — remounting EarnSubmit, whose mount effect submits the same envelope
    // again, and again. A real retry re-adds the step through goToStep.
    setVisitedSteps((currentSteps) => ({
      ...currentSteps,
      [STEPS.DEPOSIT_CONFIRM]: false,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.submitStatus]);

  // useIsSwap is path-based and also honours ?swap=true. Inside /earn the swap
  // branch would otherwise be misread as a payment — SubmitFail would title
  // "Transaction failed" and emit payment.failed instead of swap.failed. Setting
  // the flag here means neither useIsSwap nor its other caller has to change.
  useEffect(() => {
    const isSwapOpen = swapTarget !== null;
    const search = isSwapOpen ? "?swap=true" : "";
    if (window.location.hash.includes("?swap=true") === isSwapOpen) {
      return;
    }
    navigate({ pathname: ROUTES.earn, search }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapTarget]);

  useStepScreenViews(activeStep, EARN_SCREEN_BY_STEP);

  const renderStep = (step: STEPS) => {
    switch (step) {
      case STEPS.INTRO:
        return (
          <EarnIntro
            onStart={() => {
              dismissIntro();
              goToStep(STEPS.CHOOSE_TOKEN, "from-right");
            }}
            onClose={closeEarnFlow}
          />
        );
      case STEPS.CHOOSE_TOKEN:
        return (
          <EarnTokenPicker
            refreshKey={balancesRefreshKey}
            onClose={closeEarnFlow}
            onSelect={(option, resolved) => {
              trackEarnTokenSelected({
                assetCode: option.code,
                poolId: option.poolId,
                apy: option.apy,
              });
              // Picking a different asset invalidates everything the last
              // one configured — the amount, its simulation and prepared XDR,
              // the fetched position, a previous failure banner. Only a real
              // change clears it, so backing out of the amount screen and
              // re-picking the same asset returns to the amount already
              // entered. The amount screen clears its own simulation error off
              // the same asset change; it stays mounted behind the picker, so
              // nothing here can reach its component state.
              if (option.assetId !== selectedAssetId) {
                dispatch(resetSubmission());
                dispatch(saveCurrentPositionTokens("0"));
                dispatch(setEarnSubmitFailed(false));
              }
              dispatch(saveEarnPool(resolved.pool));
              dispatch(saveSelectedAssetApy(option.apy));
              dispatch(saveSelectedAssetId(option.assetId));
              dispatch(
                saveAsset(getCanonicalFromAsset(option.code, option.issuer)),
              );
              // The pool contract is the transaction's destination;
              // isContractId() on it is what routes the flow down the Soroban
              // simulation path rather than the classic one.
              dispatch(saveDestination(option.poolId));
              dispatch(saveIsToken(true));
              goToStep(STEPS.AMOUNT, "from-right");
            }}
            onSwapRequested={async (option, resolved) => {
              // A zero-balance token carries no issuer, so the canonical has to
              // be read off the SAC before the swap can target it. Decline to
              // start rather than open a swap with a half-filled destination.
              const target = await resolveSwapDestination({
                option,
                publicKey: resolved.publicKey,
                networkDetails: resolved.networkDetails,
              });
              if (!target) {
                return;
              }
              // No step change: the swap opens as a sheet over the picker, which
              // stays the active step underneath it.
              setSwapTarget({
                ...target,
                source: pickSwapSource({
                  balances: resolved.balances.balances,
                  // Whatever Home last fetched for this account; without any,
                  // the swap starts from XLM.
                  prices:
                    tokenPrices[resolved.networkDetails.networkPassphrase]?.[
                      resolved.publicKey
                    ],
                  destinationCanonical: target.canonical,
                }),
              });
            }}
          />
        );
      case STEPS.AMOUNT:
        return (
          <EarnAmount
            refreshKey={balancesRefreshKey}
            goBack={() => goToStep(STEPS.CHOOSE_TOKEN, "from-left")}
            onClose={closeEarnFlow}
            onConfirm={() => {
              // The deposit owns the next submission, even if a swap closed
              // in flight has still not settled. A hardware wallet arrives
              // here too, once the device has signed.
              isSwapSubmitting.current = false;
              hasSubmittedDeposit.current = true;
              goToStep(STEPS.DEPOSIT_CONFIRM, "from-right");
            }}
          />
        );
      case STEPS.DEPOSIT_CONFIRM:
        // Blanked for the frame on which a submission error is being handled,
        // so the terminal never flashes before the flow steps back to AMOUNT.
        if (submission.submitStatus === ActionStatus.ERROR) {
          return null;
        }
        return (
          <EarnSubmit
            xdr={submission.transactionSimulation.preparedTransaction || ""}
            onExit={closeEarnFlow}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="Earn" data-testid="earn">
      {(Object.values(STEPS) as STEPS[]).map((step) => {
        if (!visitedSteps[step]) {
          return null;
        }

        const isActive = activeStep === step;

        return (
          <div
            key={step}
            className={`Earn__step ${
              isActive ? `Earn__step--${enterAnim}` : "Earn__step--hidden"
            }`}
            // Lets a step restyle the shared View it renders.
            data-step={step}
            aria-hidden={!isActive}
          >
            {renderStep(step)}
          </div>
        );
      })}

      {/* A sheet rather than a step: the design keeps the picker visible behind
          the swap, and the sheet portals to the body, so it cannot be hidden by
          a `display: none` step wrapper. */}
      {swapTarget && (
        <EarnSwap
          sourceAsset={swapTarget.source}
          destinationAsset={swapTarget.canonical}
          destinationTokenDetails={swapTarget.details}
          onCancel={() => {
            setSwapTarget(null);
            // The swap replaced the deposit's transaction data with its own
            // when it opened. Clear what it leaves behind (its amount, a failed
            // status) so none of it carries into the deposit, as a completed
            // swap's `finish` does.
            dispatch(resetSubmission());
            dispatch(resetSimulation());
          }}
          onDone={({ fromCode, toCode, toAmount }) => {
            // Read back at deposit time as `via_swap`, which is how we tell a
            // deposit the swap branch made possible from one that needed nothing.
            dispatch(setDidSwapInFlow(true));
            setSwapTarget(null);
            dispatch(saveDestinationAsset(""));
            dispatch(saveDestinationTokenDetails(null));
            showToast(() => (
              <Notification
                variant="success"
                title={t("{{from}} swapped to {{amount}} {{to}}", {
                  from: fromCode,
                  amount: formatAmount(toAmount),
                  to: toCode,
                })}
              />
            ));
            // The picker stayed mounted underneath, and the deposit screen
            // too if it was visited, so they need an explicit nudge to pick
            // up the balance the swap just created.
            setBalancesRefreshKey((key) => key + 1);
          }}
        />
      )}
    </div>
  );
};
