import { useEffect, useRef } from "react";

import { emitScreenViewed, ScreenViewedProps } from "helpers/metrics";

/** A flow's steps, each with the screen view it reports. */
export type ScreenByStep<S extends string> = Partial<
  Record<S, { screen_name: string } & ScreenViewedProps>
>;

/**
 * Emits the active step's `screen.viewed` event, once per step the user
 * reaches. A step missing from `screenByStep` emits nothing: a submitting
 * screen, say, whose stages its own hook reports.
 *
 * Only a step change emits. `extraProps` (e.g. where a swap was opened from)
 * is read as it is at that moment.
 */
export const useStepScreenViews = <S extends string>(
  activeStep: S,
  screenByStep: ScreenByStep<S>,
  extraProps: ScreenViewedProps = {},
) => {
  const lastEmittedStep = useRef<S | null>(null);

  useEffect(() => {
    if (activeStep === lastEmittedStep.current) {
      return;
    }
    lastEmittedStep.current = activeStep;

    const screen = screenByStep[activeStep];
    if (screen) {
      const { screen_name, ...props } = screen;
      emitScreenViewed(screen_name, { ...props, ...extraProps });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);
};
