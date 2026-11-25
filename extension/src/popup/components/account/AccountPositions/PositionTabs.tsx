import React from "react";
import { useTranslation } from "react-i18next";

import { PoolDetailsTab } from "popup/constants/earn";

interface PositionTabsProps {
  active: PoolDetailsTab;
  onSelect: (tab: PoolDetailsTab) => void;
}

/**
 * The token position screen's two tabs, a pill switch (Figma Varial
 * 4470:113042). A tap on the active tab is not a change and calls nothing.
 */
export const PositionTabs = ({ active, onSelect }: PositionTabsProps) => {
  const { t } = useTranslation();
  const tabs: { id: PoolDetailsTab; label: string }[] = [
    { id: "your_position", label: t("Your position") },
    { id: "overview", label: t("Overview") },
  ];

  return (
    <div className="PositionTabs" role="tablist" data-testid="position-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`PositionTabs__tab${
            active === tab.id ? " PositionTabs__tab--active" : ""
          }`}
          onClick={() => {
            if (tab.id !== active) {
              onSelect(tab.id);
            }
          }}
          data-testid={`position-tab-${tab.id}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
