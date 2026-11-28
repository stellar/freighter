import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";

import "./styles.scss";

interface InlineAddButtonProps {
  label: string;
  route: ROUTES;
  /** A query string for the route, e.g. "?source=positions_pill". */
  search?: string;
  "data-testid"?: string;
}

/**
 * The "+ Add token" / "+ Add collectible" action that ends a Home list and
 * scrolls with it (Figma 760:33267). Mobile's InlineAddButton.
 */
export const InlineAddButton = ({
  label,
  route,
  search,
  "data-testid": dataTestId,
}: InlineAddButtonProps) => (
  <Link
    className="InlineAddButton"
    to={search ? { pathname: route, search } : route}
    data-testid={dataTestId}
  >
    <Icon.Plus />
    <span>{label}</span>
  </Link>
);
