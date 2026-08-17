import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";
import { Link } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { TabsList } from "popup/views/Account/contexts/activeTabContext";
import { useActiveTab } from "popup/components/account/AccountTabs/hooks/useActiveTab";
import { useFundingAction } from "popup/components/account/hooks/useFundingAction";

import "./styles.scss";

interface FloatingAddButtonProps {
  canUseFriendbot: boolean;
  isFunded: boolean;
  isHidden: boolean;
  publicKey: string;
  reloadBalances: () => Promise<unknown>;
}

export const FloatingAddButton = ({
  canUseFriendbot,
  isFunded,
  isHidden,
  publicKey,
  reloadBalances,
}: FloatingAddButtonProps) => {
  const { t } = useTranslation();
  const { activeTab } = useActiveTab();
  const fundingAction = useFundingAction({
    canUseFriendbot,
    publicKey,
    reloadBalances,
  });

  // Both tabs are empty, so each empty state carries its own Add action and the
  // pill would be a duplicate call to action on either of them.
  if (isHidden) {
    return null;
  }

  const isTokensTab = activeTab === TabsList.TOKENS;

  // Adding a token means adding a trustline, which an unfunded account cannot
  // do, so the Tokens pill offers funding instead -- the same action the empty
  // state hands over when it stops rendering its own.
  if (isTokensTab && !isFunded) {
    return (
      <button
        type="button"
        className="FloatingAddButton"
        onClick={fundingAction.onClick}
        disabled={fundingAction.isSubmitting}
        data-testid="fund-account-btn"
      >
        <Icon.Plus />
        <span className="FloatingAddButton__label">{fundingAction.label}</span>
      </button>
    );
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
