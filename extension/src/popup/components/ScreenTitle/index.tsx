import React from "react";

import "./styles.scss";

interface ScreenTitleProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}

/**
 * The large left-aligned screen title the Varial designs open screens with
 * ("Heading/Screen"), under a header row that carries only the back or close
 * icon. Sits at the top of `View.Content`.
 */
export const ScreenTitle = ({ title, subtitle }: ScreenTitleProps) => (
  <div className="ScreenTitle">
    <h1 className="ScreenTitle__title">{title}</h1>
    {subtitle ? (
      // A div, not a p: the SDS theme's `p` rules outrank a class and would
      // reset its color and line height.
      <div className="ScreenTitle__subtitle">{subtitle}</div>
    ) : null}
  </div>
);
