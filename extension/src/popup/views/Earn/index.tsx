import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { getAssetFromCanonical } from "helpers/stellar";
import { ROUTES } from "popup/constants/routes";
import { STEPS } from "popup/constants/earn";
import { navigateTo } from "popup/helpers/navigate";
import { emitScreenViewed, ScreenViewedProps } from "helpers/metrics";
import { ActionStatus } from "@shared/api/types";
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
  saveCurrentPositionTokens,
  saveEarnPool,
  saveSelectedAssetApy,
  saveSelectedAssetId,
  setDidSwapInFlow,
  setEarnSubmitFailed,
} from "popup/ducks/earn";
import {
  trackEarnDepositFailed,
  trackEarnSwapCompleted,
  trackEarnTokenSelected,
} from "popup/metrics/earn";
import { getFailureReasonCode } from "popup/components/earn/helpers/failureReasonCode";
import { EarnIntro } from "popup/components/earn/EarnIntro";
import { useEarnIntroSeen } from "popup/components/earn/EarnIntro/hooks/useEarnIntroSeen";
import { EarnTokenPicker } from "popup/components/earn/EarnTokenPicker";
import { EarnAmount } from "popup/components/earn/EarnAmount";
import { EarnSubmit } from "popup/components/earn/EarnSubmit";
import { EarnSwap } from "popup/components/earn/EarnSwap";
import { resolveSwapDestination } from "popup/components/earn/EarnTokenPicker/helpers/resolveSwapDestination";
import {
  DestinationTokenDetails,
  saveDestinationAsset,
  saveDestinationTokenDetails,
} from "popup/ducks/transactionSubmission";
import { Notification } from "@stellar/design-system";
import { toast } from "sonner";
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
const EARN_SCREEN_BY_STEP: Partial<
  Record<STEPS, { screen_name: string } & ScreenViewedProps>
> = {
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
  const { pool, selectedAssetId } = useSelector(earnSelector);

  // Start on CHOOSE_TOKEN and only fall back to the interstitial once the
  // persisted flag has actually resolved to false. Defaulting to INTRO instead
  // would flash it for every returning user while the background round-trip is
  // in flight.
  const [activeStep, setActiveStep] = useState<STEPS>(STEPS.CHOOSE_TOKEN);
  const [visitedSteps, setVisitedSteps] = useState<Record<STEPS, boolean>>(
    () => ({ [STEPS.CHOOSE_TOKEN]: true }) as Record<STEPS, boolean>,
  );
  const [enterAnim, setEnterAnim] = useState<EnterAnim>("from-bottom");
  // The picker stays mounted across the swap branch, so it needs an explicit
  // nudge to re-fetch balances once a swap lands.
  const [pickerRefreshKey, setPickerRefreshKey] = useState(0);
  const [swapTarget, setSwapTarget] = useState<{
    canonical: string;
    details: DestinationTokenDetails;
  } | null>(null);

  const hasResolvedIntro = useRef(false);
  const lastEmittedStep = useRef<STEPS | null>(null);
  const isFirstSubmitStatusRun = useRef(true);

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

  useEffect(() => {
    dispatch(resetSubmission());
  }, [dispatch]);

  useEffect(() => {
    if (hasResolvedIntro.current || hasSeenIntro === null) {
      return;
    }
    hasResolvedIntro.current = true;

    if (!hasSeenIntro) {
      goToStep(STEPS.INTRO, "from-bottom");
    }
  }, [hasSeenIntro]);

  // A failed submission returns to the amount screen with a banner rather than
  // showing a terminal failure state — the design has no SubmitFail for Earn,
  // and the amount is the only place the user can act on the failure.
  //
  // Every way a deposit can fail lands in `submitStatus: ERROR` (see
  // transactionSubmission's extraReducers), so this effect owns the UI response
  // to all of them. It does *not* own all of the metric: the submit step's own
  // failures are emitted by useSubmitEarnTxData, whose continuation outlives the
  // in-flight screen the user is invited to close. Emitting here as well would
  // double count, so the emit is skipped while that step is active. What is left
  // for this effect is everything that fails earlier — a device-rejected
  // signature at the review sheet, which never reaches DEPOSIT_CONFIRM.
  useEffect(() => {
    if (isFirstSubmitStatusRun.current) {
      // Whatever the status was at mount cannot belong to this flow: a fresh
      // flow has not submitted anything yet. It is the leftover of a deposit
      // abandoned in a previous visit, whose thunk settled after
      // `closeEarnFlow` had already reset the submission — acting on it would
      // report a failure against an empty asset and drop this flow onto the
      // amount screen with nothing selected. The mount effect above clears it.
      isFirstSubmitStatusRun.current = false;
      return;
    }
    if (submission.submitStatus !== ActionStatus.ERROR) {
      return;
    }
    if (activeStep !== STEPS.DEPOSIT_CONFIRM) {
      trackEarnDepositFailed({
        assetCode: getAssetFromCanonical(submission.transactionData.asset).code,
        poolId: pool?.id || "",
        reasonCode: getFailureReasonCode(submission.error),
      });
    }
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

  // Emit a screen-view metric only once per step transition.
  useEffect(() => {
    if (activeStep === lastEmittedStep.current) {
      return;
    }
    lastEmittedStep.current = activeStep;

    const screen = EARN_SCREEN_BY_STEP[activeStep];
    if (screen) {
      const { screen_name, ...props } = screen;
      emitScreenViewed(screen_name, props);
    }
  }, [activeStep]);

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
            refreshKey={pickerRefreshKey}
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
              setSwapTarget(target);
            }}
          />
        );
      case STEPS.AMOUNT:
        return (
          <EarnAmount
            goBack={() => goToStep(STEPS.CHOOSE_TOKEN, "from-left")}
            onConfirm={() => goToStep(STEPS.DEPOSIT_CONFIRM, "from-right")}
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
          destinationAsset={swapTarget.canonical}
          destinationTokenDetails={swapTarget.details}
          onCancel={() => {
            setSwapTarget(null);
            dispatch(saveDestinationAsset(""));
            dispatch(saveDestinationTokenDetails(null));
          }}
          onDone={({ fromCode, toCode }) => {
            trackEarnSwapCompleted({
              fromAssetCode: fromCode,
              toAssetCode: toCode,
            });
            // Read back at deposit time as `via_swap`, which is how we tell a
            // deposit the swap branch made possible from one that needed nothing.
            dispatch(setDidSwapInFlow(true));
            setSwapTarget(null);
            dispatch(saveDestinationAsset(""));
            dispatch(saveDestinationTokenDetails(null));
            toast.custom(
              () => (
                <Notification
                  variant="success"
                  title={t("{{from}} has been swapped to {{to}}", {
                    from: fromCode,
                    to: toCode,
                  })}
                />
              ),
              { id: "earn-swap-success" },
            );
            // The picker stayed mounted underneath, so it needs an explicit
            // nudge to pick up the balance the swap just created.
            setPickerRefreshKey((key) => key + 1);
          }}
        />
      )}
    </div>
  );
};
