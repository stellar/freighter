/**
 * @fileoverview AccountTabs renders the Home screen's tab row. Each tab's list
 * ends with its own InlineAddButton; hidden collectibles are reached from the
 * Add Collectible screen.
 * Positions has no add flow of its own -- a position is opened by depositing
 * through Earn, not through this row.
 */

import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import classnames from "classnames";

import { TabsList } from "popup/views/Account/contexts/activeTabContext";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { isCustomNetwork } from "@shared/helpers/stellar";
import { canShowPositionsSelector } from "popup/components/earn/helpers/positionsAvailability";

import { useActiveTab } from "./hooks/useActiveTab";

import "./styles.scss";

/**
 * Tab navigation for the account view. Hides the collectibles tab on custom
 * networks, where collectibles are unsupported, and the positions tab while
 * the `positions_enabled` flag is off or on any network where Earn is unsupported
 * (every network but PUBLIC and TESTNET).
 */
export const TabButtons = () => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const canShowPositions = useSelector(canShowPositionsSelector);
  const { activeTab, setActiveTab } = useActiveTab();

  const tabLabels: Record<string, string> = {
    tokens: t("Tokens"),
    positions: t("Positions"),
    collectibles: t("Collectibles"),
  };

  return (
    <>
      {Object.values(TabsList).map((tab) => {
        if (tab === TabsList.COLLECTIBLES && isCustomNetwork(networkDetails)) {
          return null;
        }

        // Earn, and therefore any position, exists only where we have an
        // allowlisted pool, and the tab waits on its flag.
        if (tab === TabsList.POSITIONS && !canShowPositions) {
          return null;
        }

        return (
          <div
            data-testid={`account-tab-${tab}`}
            className={classnames("AccountTabs__tab-item", {
              "AccountTabs__tab-item--active": activeTab === tab,
            })}
            key={tab}
            onClick={() => {
              setActiveTab(tab);
            }}
          >
            {tabLabels[tab]}
          </div>
        );
      })}
    </>
  );
};

export const AccountTabs = () => (
  <div className="AccountTabs">
    <div className="AccountTabs__tabs">
      <TabButtons />
    </div>
  </div>
);
