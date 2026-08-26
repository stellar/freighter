import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";
import { Link } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { TabsList } from "popup/views/Account/contexts/activeTabContext";
import { useActiveTab } from "popup/components/account/AccountTabs/hooks/useActiveTab";

import "./styles.scss";

interface FloatingAddButtonProps {
  isFunded: boolean;
  /**
   * Whether the Collectibles empty state is carrying its own Add action. Passed
   * in because it depends on things this component cannot see: whether the Tokens
   * tab is showing its unfunded empty state, and whether the Collectibles tab has
   * an empty state to host a button at all.
   */
  isCollectiblesCtaInline: boolean;
  /**
   * Whether that tab is still loading, in which case it is showing a spinner and
   * which kind of button it wants is not known yet.
   */
  isCollectiblesLoading: boolean;
}

export const FloatingAddButton = ({
  isFunded,
  isCollectiblesCtaInline,
  isCollectiblesLoading,
}: FloatingAddButtonProps) => {
  const { t } = useTranslation();
  const { activeTab } = useActiveTab();

  // Nothing is "added" on this tab: positions come from depositing through
  // Earn, not from a picker this pill would open. The empty state gets its
  // own "Start Earning" CTA in Task 7. An explicit early return rather than
  // folding this into the Tokens/Collectibles ternary below, so a future
  // fourth tab fails loudly instead of silently inheriting the Collectibles
  // branch the way Positions itself briefly did.
  if (activeTab === TabsList.POSITIONS) {
    return null;
  }

  const isTokensTab = activeTab === TabsList.TOKENS;

  // The unfunded Tokens empty state carries its own "Add XLM" action, so the
  // pill would be a duplicate call to action there.
  if (isTokensTab && !isFunded) {
    return null;
  }

  // Same reasoning on the Collectibles tab, whose empty state takes its cue from
  // the Tokens one so that the two never offer different kinds of button. While
  // that tab is still loading it shows a spinner and no action at all, rather than
  // one that would move the moment the collectibles land.
  if (!isTokensTab && (isCollectiblesLoading || isCollectiblesCtaInline)) {
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
