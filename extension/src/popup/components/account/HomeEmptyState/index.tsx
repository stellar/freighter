import React from "react";
import classnames from "classnames";

import SparkleLight from "popup/assets/home-empty-sparkle-light.svg";
import SparkleDark from "popup/assets/home-empty-sparkle-dark.svg";

import "./styles.scss";

interface HomeEmptyStateProps {
  title: string;
  description: string;
  /** The action at the bottom of the card. */
  children?: React.ReactNode;
  /** The collectibles card pads its sides 32px rather than 24px. */
  isWide?: boolean;
  "data-testid"?: string;
}

/**
 * Home's empty-state card (Figma's Empty, 1429:165964; mobile's EmptyState):
 * Varial's sparkle in a circle over a title and a description, with the
 * action under them. Light mode fills the card; dark mode leaves it unfilled.
 */
export const HomeEmptyState = ({
  title,
  description,
  children,
  isWide = false,
  "data-testid": dataTestId,
}: HomeEmptyStateProps) => (
  <div
    className={classnames("HomeEmptyState", {
      "HomeEmptyState--wide": isWide,
    })}
    data-testid={dataTestId}
  >
    <div className="HomeEmptyState__top">
      <div className="HomeEmptyState__icon">
        <span className="HomeEmptyState__sparkle" aria-hidden="true">
          <img
            className="HomeEmptyState__sparkle__light"
            src={SparkleLight}
            alt=""
          />
          <img
            className="HomeEmptyState__sparkle__dark"
            src={SparkleDark}
            alt=""
          />
        </span>
      </div>
      <div className="HomeEmptyState__text">
        <div className="HomeEmptyState__title">{title}</div>
        <div className="HomeEmptyState__description">{description}</div>
      </div>
    </div>
    {children}
  </div>
);
