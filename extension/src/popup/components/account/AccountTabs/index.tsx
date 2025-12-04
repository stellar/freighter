import React, { useContext } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import classnames from "classnames";
import {
  AccountTabsContext,
  TabsList,
} from "popup/views/Account/contexts/activeTabContext";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { isCustomNetwork } from "@shared/helpers/stellar";
import "./styles.scss";

export const AccountTabs = () => {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useContext(AccountTabsContext);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  if (isCustomNetwork(networkDetails)) {
    return null;
  }

  const tabLabels: Record<string, string> = {
    tokens: t("Tokens"),
    collectibles: t("Collectibles"),
  };

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
            {tabLabels[tab] || tab}
          </div>
        );
      })}
    </div>
  );
};
