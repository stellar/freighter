import React, { useContext } from "react";
import classnames from "classnames";
import {
  AccountTabsContext,
  TabsList,
} from "popup/views/Account/contexts/activeTabContext";
import "./styles.scss";

export const AccountTabs = () => {
  const { activeTab, setActiveTab } = useContext(AccountTabsContext);

  return (
    <div className="AccountTabs">
      {TabsList.map((tab, index) => {
        return (
          <div
            data-testid={`account-tab-${tab}`}
            className={classnames("AccountTabs__tab-item", {
              "AccountTabs__tab-item--active": activeTab === index,
            })}
            key={tab}
            onClick={() => setActiveTab(index)}
          >
            {tab}
          </div>
        );
      })}
    </div>
  );
};
