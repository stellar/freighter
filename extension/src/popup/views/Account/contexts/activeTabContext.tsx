import React, { createContext, useState } from "react";

export const TabsList = ["tokens", "collectibles"] as const;

interface AccountTabsContextType {
  activeTab: number;
  setActiveTab: (tab: number) => void;
}

export const AccountTabsContext = createContext<AccountTabsContextType>({
  activeTab: 0,
  setActiveTab: () => {},
});

export const ActiveTabProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <AccountTabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </AccountTabsContext.Provider>
  );
};
