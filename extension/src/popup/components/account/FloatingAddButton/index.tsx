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
   * Whether the Collectibles empty state is currently carrying its own Add
   * action. It takes its cue from the Tokens tab, so that both tabs offer the
   * same kind of button, and only that tab knows whether it has an empty state
   * to put one in.
   */
  isCollectiblesCtaInline: boolean;
}

export const FloatingAddButton = ({
  isFunded,
  isCollectiblesCtaInline,
}: FloatingAddButtonProps) => {
  const { t } = useTranslation();
  const { activeTab } = useActiveTab();

  const isTokensTab = activeTab === TabsList.TOKENS;

  // The unfunded Tokens empty state carries its own "Add XLM" action, so the
  // pill would be a duplicate call to action there.
  if (isTokensTab && !isFunded) {
    return null;
  }

  // Same reasoning on the other tab, which follows this one's lead.
  if (!isTokensTab && isCollectiblesCtaInline) {
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
