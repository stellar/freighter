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
  /**
   * Whether the Tokens tab is actually showing its empty state. Distinct from
   * `!isFunded`: when the balances fetch fails the account's funded state is
   * unknown rather than unfunded, and both are false.
   */
  isTokensEmpty: boolean;
  isHidden: boolean;
  publicKey: string;
  reloadBalances: () => Promise<unknown>;
}

export const FloatingAddButton = ({
  canUseFriendbot,
  isFunded,
  isTokensEmpty,
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

  if (isTokensTab && !isFunded) {
    // Funded state unknown -- the balances fetch failed, so the pane is showing
    // an error rather than an empty state. Offering "Add token" would be wrong
    // (the account may be unfunded) and so would offering to fund it (it may
    // already be funded), so offer nothing, as before this pill existed.
    if (!isTokensEmpty) {
      return null;
    }

    // Adding a token means adding a trustline, which an unfunded account cannot
    // do, so this tab offers funding instead -- the same action its empty state
    // hands over when it stops rendering its own.
    return fundingAction.route ? (
      <Link
        className="FloatingAddButton"
        to={fundingAction.route}
        data-testid="fund-account-btn"
      >
        <Icon.Plus />
        <span className="FloatingAddButton__label">{fundingAction.label}</span>
      </Link>
    ) : (
      // Friendbot is the one funding action that submits instead of navigating.
      // `aria-busy` rather than `disabled` so an in-flight request does not drop
      // keyboard focus to <body>; re-entry is guarded in the hook.
      <button
        type="button"
        className="FloatingAddButton"
        onClick={fundingAction.onClick}
        aria-busy={fundingAction.isSubmitting}
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
