import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { ROUTES } from "popup/constants/routes";
import { STEPS } from "popup/constants/earn";
import { navigateTo } from "popup/helpers/navigate";
import { emitScreenViewed, ScreenViewedProps } from "helpers/metrics";
import {
  resetSubmission,
  saveAsset,
  saveDestination,
  saveIsToken,
} from "popup/ducks/transactionSubmission";
import {
  resetEarn,
  saveEarnPool,
  saveSelectedAssetApy,
} from "popup/ducks/earn";
import { EarnIntro } from "popup/components/earn/EarnIntro";
import { useEarnIntroSeen } from "popup/components/earn/EarnIntro/hooks/useEarnIntroSeen";
import { EarnTokenPicker } from "popup/components/earn/EarnTokenPicker";

import "./styles.scss";

type EnterAnim = "from-bottom" | "from-right" | "from-left";

/**
 * Screen-view metric per step. Names are kept in sync with freighter-mobile so
 * the Earn funnel joins cross-platform (RFC #2883); SWAP is absent because the
 * swap branch emits its own screens.
 */
const EARN_SCREEN_BY_STEP: Partial<
  Record<STEPS, { screen_name: string } & ScreenViewedProps>
> = {
  [STEPS.INTRO]: { screen_name: "earn_intro", flow: "earn" },
  [STEPS.CHOOSE_TOKEN]: { screen_name: "earn_select_token", flow: "earn" },
  [STEPS.AMOUNT]: { screen_name: "earn_amount", flow: "earn" },
  [STEPS.DEPOSIT_CONFIRM]: {
    screen_name: "earn_confirm",
    flow: "earn",
    step: "confirm",
  },
};

export const Earn = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { hasSeenIntro, dismissIntro } = useEarnIntroSeen();

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
  const [pickerRefreshKey] = useState(0);

  const hasResolvedIntro = useRef(false);
  const lastEmittedStep = useRef<STEPS | null>(null);

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
              dispatch(saveEarnPool(resolved.pool));
              dispatch(saveSelectedAssetApy(option.apy));
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
            // Interim: hand off to the existing Swap route. The design layers
            // Swap as a sheet over this picker and returns here with a toast,
            // which needs the Swap components remounted inside STEPS.SWAP —
            // that lands with the swap-branch work.
            onSwapRequested={() => navigateTo(ROUTES.swap, navigate)}
          />
        );
      // AMOUNT, SWAP and DEPOSIT_CONFIRM land in later steps. Returning null
      // rather than falling through to a default keeps an unbuilt step from
      // silently rendering another step's screen.
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
    </div>
  );
};
