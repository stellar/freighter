import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";
import { Link } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { TabsList } from "popup/views/Account/contexts/activeTabContext";
import { useActiveTab } from "popup/components/account/AccountTabs/hooks/useActiveTab";

import "./styles.scss";

/**
 * Where the Collectibles tab's Add action lives.
 *
 * - "inline": its empty state is carrying the action, so the pill stands down.
 * - "pill": the pill is the action.
 * - "pending": the collectibles request has not resolved, so it is not yet known
 *   which of the two it will be. Distinct from "pill" on purpose -- an empty
 *   `collections` reads the same before the request lands as it does when the
 *   account owns none, and guessing puts an action on screen only to move it a
 *   moment later.
 */
export type CollectiblesCta = "inline" | "pill" | "pending";

interface FloatingAddButtonProps {
  isFunded: boolean;
  /**
   * Passed in because it depends on things this component cannot see: whether the
   * Tokens tab is showing its unfunded empty state, whether the Collectibles tab
   * has an empty state to host a button at all, and whether that is known yet.
   */
  collectiblesCta: CollectiblesCta;
}

export const FloatingAddButton = ({
  isFunded,
  collectiblesCta,
}: FloatingAddButtonProps) => {
  const { t } = useTranslation();
  const { activeTab } = useActiveTab();

  const isTokensTab = activeTab === TabsList.TOKENS;

  // The unfunded Tokens empty state carries its own "Add XLM" action, so the
  // pill would be a duplicate call to action there.
  if (isTokensTab && !isFunded) {
    return null;
  }

  // Same reasoning on the Collectibles tab, whose empty state takes its cue from
  // the Tokens one so that the two never offer different kinds of button -- and
  // nothing at all until it is known which of the two this is.
  if (!isTokensTab && collectiblesCta !== "pill") {
    return null;
  }

  const { label, route, testId } = isTokensTab
    ? {
        label: t("Add token"),
        route: ROUTES.searchAsset,
        testId: "add-token-btn",
      }
    : {
        label: t("Add collectible"),
        route: ROUTES.addCollectibles,
        testId: "add-collectible-btn",
      };

  return (
    <Link className="FloatingAddButton" to={route} data-testid={testId}>
      <Icon.Plus />
      <span className="FloatingAddButton__label">{label}</span>
    </Link>
  );
};
