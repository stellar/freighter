import React, { ReactNode } from "react";
import classnames from "classnames";

import "./styles.scss";

interface TabsProps {
  tabs: string[];
  renderTab: (tab: string) => ReactNode;
}

export const Tabs = (props: TabsProps) => {
  const [activeTab, setActiveTab] = React.useState(props.tabs[0]);
  return (
    <div className="Tabs">
      <div className="Tabs__Selectors">
        {props.tabs.map((tab) => {
          const classes = classnames("Tab", { Active: activeTab === tab });
          return (
            <div
              className={classes}
              key={tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          );
        })}
      </div>
      <div className="Tabs__Body">{props.renderTab(activeTab)}</div>
    </div>
  );
};
