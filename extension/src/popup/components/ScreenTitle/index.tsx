import React from "react";

import "./styles.scss";

interface ScreenTitleProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** A muted subtitle, for explanatory copy; a `strong` in it stays primary. */
  isSubtitleSecondary?: boolean;
}

/**
 * The large left-aligned screen title the Varial designs open screens with
 * ("Heading/Screen"), under a header row that carries only the back or close
 * icon. Sits at the top of `View.Content`.
 */
export const ScreenTitle = ({
  title,
  subtitle,
  isSubtitleSecondary,
}: ScreenTitleProps) => (
  <div className="ScreenTitle">
    <h1 className="ScreenTitle__title">{title}</h1>
    {subtitle ? (
      // A div, not a p: the SDS theme's `p` rules outrank a class and would
      // reset its color and line height.
      <div
        className={`ScreenTitle__subtitle${
          isSubtitleSecondary ? " ScreenTitle__subtitle--secondary" : ""
        }`}
      >
        {subtitle}
      </div>
    ) : null}
  </div>
);
