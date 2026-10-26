import React from "react";
import { render, screen } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { Wrapper } from "popup/__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import { TabBar } from "popup/components/TabBar";

// Jest maps `*.svg?react` to a string stub, so a filled icon renders as a
// <test-file-stub> element while an SDS icon renders as an <svg>.
const FILLED_ICON = "test-file-stub";

const renderTabBar = (route: string) =>
  render(
    <Wrapper
      routes={[route]}
      state={{
        settings: {
          networkDetails: MAINNET_NETWORK_DETAILS,
          networksList: [MAINNET_NETWORK_DETAILS],
        },
      }}
    >
      <TabBar />
    </Wrapper>,
  );

describe("TabBar", () => {
  it("marks only the current route's tab as active", () => {
    renderTabBar(ROUTES.account);

    expect(screen.getByTestId("nav-link-account")).toHaveClass(
      "TabBar__tab--active",
    );
    expect(screen.getByTestId("nav-link-account-history")).not.toHaveClass(
      "TabBar__tab--active",
    );
    expect(
      screen.getByTestId("account-header-discover-button"),
    ).not.toHaveClass("TabBar__tab--active");
  });

  // The bar draws icons only, so these labels are what screen readers say.
  // History's matches its screen's "Activity" title, as on mobile.
  it("labels each tab for screen readers", () => {
    renderTabBar(ROUTES.account);

    expect(screen.getByTestId("nav-link-account-history")).toHaveAttribute(
      "aria-label",
      "Activity",
    );
    expect(screen.getByTestId("nav-link-account")).toHaveAttribute(
      "aria-label",
      "Home",
    );
    expect(
      screen.getByTestId("account-header-discover-button"),
    ).toHaveAttribute("aria-label", "Discover");
  });

  it("draws Home's house filled whether or not it is active", () => {
    renderTabBar(ROUTES.discover);

    const home = screen.getByTestId("nav-link-account");
    expect(home.querySelector(FILLED_ICON)).not.toBeNull();
  });

  it("fills Discover's compass only while Discover is active", () => {
    const { unmount } = renderTabBar(ROUTES.account);
    const idle = screen.getByTestId("account-header-discover-button");
    expect(idle.querySelector(FILLED_ICON)).toBeNull();
    expect(idle.querySelector("svg")).not.toBeNull();
    unmount();

    renderTabBar(ROUTES.discover);
    const active = screen.getByTestId("account-header-discover-button");
    expect(active.querySelector(FILLED_ICON)).not.toBeNull();
  });
});
