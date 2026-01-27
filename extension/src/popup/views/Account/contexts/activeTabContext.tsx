import React, { createContext, useState } from "react";

export enum TabsList {
  TOKENS = "tokens",
  COLLECTIBLES = "collectibles",
}

interface AccountTabsContextType {
  activeTab: TabsList;
  setActiveTab: (tab: TabsList) => void;
}

export const AccountTabsContext = createContext<AccountTabsContextType>({
  activeTab: TabsList.TOKENS,
  setActiveTab: () => {},
});

export const ActiveTabProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [activeTab, setActiveTab] = useState(TabsList.TOKENS);
  return (
    <AccountTabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </AccountTabsContext.Provider>
  );
};
