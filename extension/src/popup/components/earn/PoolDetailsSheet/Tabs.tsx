import React from "react";
import classnames from "classnames";
import { useTranslation } from "react-i18next";

export type PoolDetailsTab = "your_position" | "overview";

interface TabsProps {
  active: PoolDetailsTab;
  onSelect: (tab: PoolDetailsTab) => void;
}

/**
 * The sheet's pill tab strip. Distinct from AccountTabs, which is the Home
 * screen's underline strip — the design draws these as filled pills.
 */
export const Tabs = ({ active, onSelect }: TabsProps) => {
  const { t } = useTranslation();
  const tabs: { id: PoolDetailsTab; label: string }[] = [
    { id: "your_position", label: t("Your position") },
    { id: "overview", label: t("Overview") },
  ];

  return (
    <div
      className="PoolDetailsSheet__tabs"
      data-testid="earn-pool-details-tabs"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={classnames("PoolDetailsSheet__tab", {
            "PoolDetailsSheet__tab--active": active === tab.id,
          })}
          onClick={() => onSelect(tab.id)}
          data-testid={`earn-pool-details-tab-${tab.id}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
