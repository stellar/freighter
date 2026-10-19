import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";

import "./styles.scss";

type TabName = "history" | "home" | "discover";

interface Tab {
  name: TabName;
  route: ROUTES;
  label: string;
  icon: React.ReactNode;
  testId: string;
}

export const TabBar = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const tabs: Tab[] = [
    {
      name: "history",
      route: ROUTES.accountHistory,
      label: t("History"),
      icon: <Icon.ClockRewind />,
      // Reused from the header nav button this replaces, so the ~12 specs that
      // click it keep working and keep their meaning.
      testId: "nav-link-account-history",
    },
    {
      name: "home",
      route: ROUTES.account,
      label: t("Home"),
      icon: <Icon.Home02 />,
      testId: "nav-link-account",
    },
    {
      name: "discover",
      route: ROUTES.discover,
      label: t("Discover"),
      icon: <Icon.Compass03 />,
      testId: "account-header-discover-button",
    },
  ];

  return (
    <nav className="TabBar" data-testid="tab-bar">
      <div className="TabBar__inset">
        {tabs.map(({ name, route, label, icon, testId }) => {
          const isActive = pathname === route;

          return (
            <NavLink
              key={name}
              to={route}
              // `end` is mandatory on Home: ROUTES.account is "/", which
              // react-router otherwise prefix-matches against every route.
              end
              // `replace` because BackButton calls navigate(-1) with no depth
              // guard; pushing would make back-navigation walk through tab
              // switches instead of leaving the tab root.
              replace
              className={({ isActive: active }) =>
                `TabBar__tab${active ? " TabBar__tab--active" : ""}`
              }
              aria-label={label}
              data-testid={testId}
              onClick={(e) => {
                if (isActive) {
                  // Re-navigating to a tab root remounts the view and refetches
                  // account data; a tap on the current tab should do nothing.
                  e.preventDefault();
                  return;
                }
                emitMetric(METRIC_NAMES.navTabSelected, {
                  tab: name,
                  from: pathname,
                });
              }}
            >
              {icon}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
