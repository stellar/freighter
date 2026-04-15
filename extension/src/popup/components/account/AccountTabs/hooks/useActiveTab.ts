import { useMemo, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";

import {
  AccountTabsContext,
  TabsList,
} from "popup/views/Account/contexts/activeTabContext";

/**
 * Custom hook that manages the active tab state for account tabs.
 *
 * This hook synchronizes the active tab with the URL query parameters.
 * If a "tab" query parameter is present in the URL, it will automatically
 * update the active tab to match that value (if it's a valid tab). This
 * is useful for opening the Account view to a specific tab (like after adding a collectible)
 *
 * @returns {Object} An object containing:
 * @returns {TabsList} returns.activeTab - The currently active tab from the context
 * @returns {(tab: TabsList) => void} returns.setActiveTab - Function to manually set the active tab
 *
 * @example
 * ```tsx
 *  const navigate = useNavigate();
 *
 *  navigateTo(ROUTES.account, navigate, `?tab=${TabsList.COLLECTIBLES}`);
 * ```
 */
export const useActiveTab = () => {
  const location = useLocation();
  const { activeTab, setActiveTab } = useContext(AccountTabsContext);

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  useEffect(() => {
    const queryParamTab = queryParams.get("tab") as TabsList;

    if (Object.values(TabsList).includes(queryParamTab)) {
      setActiveTab(queryParamTab);
    }
  }, [queryParams, setActiveTab]);

  return {
    activeTab,
    setActiveTab,
  };
};
