import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore, combineReducers } from "@reduxjs/toolkit";

jest.mock("helpers/experimentClient", () => ({
  getExperimentClient: jest.fn(),
}));

jest.mock("popup/helpers/maintenance/parseMaintenanceContent", () => ({
  parseBannerPayload: jest.fn(),
  parseScreenPayload: jest.fn(),
}));

import { reducer as remoteConfig } from "popup/ducks/remoteConfig";
import { MaintenanceScreen } from "popup/components/MaintenanceScreen";
import { MaintenanceBanner } from "popup/components/MaintenanceBanner";
import type {
  MaintenanceBannerContent,
  MaintenanceScreenContent,
} from "popup/helpers/maintenance/types";

const { parseBannerPayload, parseScreenPayload } = jest.requireMock<
  typeof import("popup/helpers/maintenance/parseMaintenanceContent")
>("popup/helpers/maintenance/parseMaintenanceContent");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a Redux store with preloaded `remoteConfig` state using the generic
 * `{ enabled, payload }` shape. Since selectors call the parse functions,
 * callers must also configure the parse mocks to return the expected content.
 */
function makeStore(overrides?: {
  maintenance_screen?: {
    enabled: boolean;
    payload: Record<string, unknown> | undefined;
  };
  maintenance_banner?: {
    enabled: boolean;
    payload: Record<string, unknown> | undefined;
  };
}) {
  return configureStore({
    reducer: combineReducers({ remoteConfig }),
    preloadedState: {
      remoteConfig: {
        isInitialized: true,
        maintenance_screen: overrides?.maintenance_screen ?? {
          enabled: false,
          payload: undefined,
        },
        maintenance_banner: overrides?.maintenance_banner ?? {
          enabled: false,
          payload: undefined,
        },
      },
    },
  });
}

function renderWithStore(
  ui: React.ReactElement,
  store: ReturnType<typeof makeStore>,
) {
  return render(<Provider store={store}>{ui}</Provider>);
}

/**
 * Helper to set up banner parse mock and create a store with an enabled banner.
 */
function setupBanner(content: MaintenanceBannerContent) {
  (parseBannerPayload as jest.Mock).mockReturnValue(content);
  return makeStore({
    maintenance_banner: { enabled: true, payload: { stub: true } },
  });
}

/**
 * Helper to set up screen parse mock and create a store with an enabled screen.
 */
function setupScreen(content: MaintenanceScreenContent) {
  (parseScreenPayload as jest.Mock).mockReturnValue(content);
  return makeStore({
    maintenance_screen: { enabled: true, payload: { stub: true } },
  });
}

// ---------------------------------------------------------------------------
// MaintenanceScreen
// ---------------------------------------------------------------------------

describe("MaintenanceScreen", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns null when flag is disabled", () => {
    const store = makeStore();
    const { container } = renderWithStore(<MaintenanceScreen />, store);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when payload is undefined even if enabled", () => {
    (parseScreenPayload as jest.Mock).mockReturnValue(null);
    const store = makeStore({
      maintenance_screen: { enabled: true, payload: undefined },
    });
    const { container } = renderWithStore(<MaintenanceScreen />, store);
    expect(container.firstChild).toBeNull();
  });

  it("renders the overlay when enabled with content", () => {
    const store = setupScreen({
      title: "Under Maintenance",
      body: ["Back soon."],
    });
    renderWithStore(<MaintenanceScreen />, store);

    expect(screen.getByTestId("maintenance-screen")).toBeInTheDocument();
    expect(screen.getByText("Under Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Back soon.")).toBeInTheDocument();
  });

  it("renders multiple body paragraphs", () => {
    const store = setupScreen({
      title: "Maintenance",
      body: ["Paragraph one.", "Paragraph two.", "Paragraph three."],
    });
    renderWithStore(<MaintenanceScreen />, store);

    expect(screen.getByText("Paragraph one.")).toBeInTheDocument();
    expect(screen.getByText("Paragraph two.")).toBeInTheDocument();
    expect(screen.getByText("Paragraph three.")).toBeInTheDocument();
  });

  it("does not render a body section when body array is empty", () => {
    const store = setupScreen({ title: "Down for maintenance", body: [] });
    const { container } = renderWithStore(<MaintenanceScreen />, store);

    expect(screen.getByText("Down for maintenance")).toBeInTheDocument();
    expect(
      container.querySelector(".MaintenanceScreen__body"),
    ).not.toBeInTheDocument();
  });

  it("renders the icon box", () => {
    const store = setupScreen({ title: "Title", body: [] });
    const { container } = renderWithStore(<MaintenanceScreen />, store);

    expect(
      container.querySelector(".MaintenanceScreen__icon-box"),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MaintenanceBanner
// ---------------------------------------------------------------------------

describe("MaintenanceBanner", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns null when flag is disabled", () => {
    const store = makeStore();
    const { container } = renderWithStore(<MaintenanceBanner />, store);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when parser returns null even if enabled", () => {
    (parseBannerPayload as jest.Mock).mockReturnValue(null);
    const store = makeStore({
      maintenance_banner: { enabled: true, payload: { stub: true } },
    });
    const { container } = renderWithStore(<MaintenanceBanner />, store);
    expect(container.firstChild).toBeNull();
  });

  it("renders the alert bar with the banner title", () => {
    const store = setupBanner({
      theme: "warning",
      bannerTitle: "Services degraded",
    });
    renderWithStore(<MaintenanceBanner />, store);

    expect(screen.getByTestId("maintenance-banner")).toBeInTheDocument();
    expect(screen.getByText("Services degraded")).toBeInTheDocument();
  });

  it.each([
    ["warning", "MaintenanceBanner__alert--warning"],
    ["error", "MaintenanceBanner__alert--error"],
    ["primary", "MaintenanceBanner__alert--primary"],
    ["secondary", "MaintenanceBanner__alert--secondary"],
    ["tertiary", "MaintenanceBanner__alert--tertiary"],
  ] as const)("applies the %s theme CSS class", (theme, expectedClass) => {
    const store = setupBanner({ theme, bannerTitle: "Banner" });
    const { container } = renderWithStore(<MaintenanceBanner />, store);
    expect(container.querySelector(`.${expectedClass}`)).toBeInTheDocument();
  });

  it("does not have role=button when no url or modal is provided", () => {
    const store = setupBanner({
      theme: "warning",
      bannerTitle: "Info only",
    });
    renderWithStore(<MaintenanceBanner />, store);

    const banner = screen.getByTestId("maintenance-banner");
    expect(banner).not.toHaveAttribute("role", "button");
  });

  it("has role=button when a url is provided", () => {
    const store = setupBanner({
      theme: "warning",
      bannerTitle: "Check status",
      url: "https://status.stellar.org",
    });
    renderWithStore(<MaintenanceBanner />, store);

    expect(screen.getByTestId("maintenance-banner")).toHaveAttribute(
      "role",
      "button",
    );
  });

  it("has role=button when a modal is provided", () => {
    const store = setupBanner({
      theme: "warning",
      bannerTitle: "Details available",
      modal: { title: "Details", body: ["More info."] },
    });
    renderWithStore(<MaintenanceBanner />, store);

    expect(screen.getByTestId("maintenance-banner")).toHaveAttribute(
      "role",
      "button",
    );
  });

  it("renders a chevron when the banner is clickable", () => {
    const store = setupBanner({
      theme: "primary",
      bannerTitle: "Click me",
      modal: { title: "Details", body: [] },
    });
    const { container } = renderWithStore(<MaintenanceBanner />, store);

    expect(
      container.querySelector(".MaintenanceBanner__alert-chevron"),
    ).toBeInTheDocument();
  });

  it("does not render a chevron for a non-clickable banner", () => {
    const store = setupBanner({
      theme: "primary",
      bannerTitle: "Info only",
    });
    const { container } = renderWithStore(<MaintenanceBanner />, store);

    expect(
      container.querySelector(".MaintenanceBanner__alert-chevron"),
    ).not.toBeInTheDocument();
  });

  it("opens the modal when the banner is clicked with a modal payload", () => {
    const store = setupBanner({
      theme: "warning",
      bannerTitle: "Scheduled maintenance",
      modal: {
        title: "Maintenance details",
        body: ["We will be down from 2–4 UTC."],
      },
    });
    renderWithStore(<MaintenanceBanner />, store);

    // SlideupModal always renders children; starts in "closed" state
    const slideup = screen
      .getByTestId("maintenance-banner-modal")
      .closest(".SlideupModal");
    expect(slideup).toHaveClass("closed");

    fireEvent.click(screen.getByTestId("maintenance-banner"));

    expect(slideup).toHaveClass("open");
    expect(screen.getByText("Maintenance details")).toBeInTheDocument();
    expect(
      screen.getByText("We will be down from 2–4 UTC."),
    ).toBeInTheDocument();
  });

  it("closes the modal when the Done button is clicked", () => {
    const store = setupBanner({
      theme: "primary",
      bannerTitle: "Upcoming outage",
      modal: {
        title: "Outage window",
        body: ["Maintenance starts at 00:00 UTC."],
      },
    });
    renderWithStore(<MaintenanceBanner />, store);

    const slideup = screen
      .getByTestId("maintenance-banner-modal")
      .closest(".SlideupModal");

    fireEvent.click(screen.getByTestId("maintenance-banner"));
    expect(slideup).toHaveClass("open");

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(slideup).toHaveClass("closed");
  });

  it("closes the modal when the close (×) button is clicked", () => {
    const store = setupBanner({
      theme: "warning",
      bannerTitle: "Alert",
      modal: { title: "Details", body: ["Info."] },
    });
    renderWithStore(<MaintenanceBanner />, store);

    const slideup = screen
      .getByTestId("maintenance-banner-modal")
      .closest(".SlideupModal");

    fireEvent.click(screen.getByTestId("maintenance-banner"));
    expect(slideup).toHaveClass("open");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(slideup).toHaveClass("closed");
  });

  it("renders a theme icon box in the modal header", () => {
    const store = setupBanner({
      theme: "warning",
      bannerTitle: "Alert",
      modal: { title: "Details", body: [] },
    });
    const { container } = renderWithStore(<MaintenanceBanner />, store);

    fireEvent.click(screen.getByTestId("maintenance-banner"));

    expect(
      container.querySelector(".MaintenanceBanner__modal-icon--warning"),
    ).toBeInTheDocument();
  });

  it("renders multiple body paragraphs in the modal", () => {
    const store = setupBanner({
      theme: "warning",
      bannerTitle: "Alert",
      modal: {
        title: "Details",
        body: ["First paragraph.", "Second paragraph."],
      },
    });
    renderWithStore(<MaintenanceBanner />, store);

    fireEvent.click(screen.getByTestId("maintenance-banner"));
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
  });

  it("opens a URL in a new tab when the banner has a url", () => {
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);

    const store = setupBanner({
      theme: "warning",
      bannerTitle: "Network degraded",
      url: "https://status.stellar.org",
    });
    renderWithStore(<MaintenanceBanner />, store);

    fireEvent.click(screen.getByTestId("maintenance-banner"));

    expect(openSpy).toHaveBeenCalledWith(
      "https://status.stellar.org",
      "_blank",
      "noopener,noreferrer",
    );

    openSpy.mockRestore();
  });

  it("does not open a modal when the banner has only a url", () => {
    const store = setupBanner({
      theme: "warning",
      bannerTitle: "Network degraded",
      url: "https://status.stellar.org",
    });
    renderWithStore(<MaintenanceBanner />, store);

    fireEvent.click(screen.getByTestId("maintenance-banner"));

    expect(
      screen.queryByTestId("maintenance-banner-modal"),
    ).not.toBeInTheDocument();
  });
});
