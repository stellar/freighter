import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";
import { Wrapper } from "../../__testHelpers__";
import { RebrandAnnouncement } from "../RebrandAnnouncement";

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
}));

const mockEmitMetric = emitMetric as jest.Mock;

const renderView = (destination?: string) =>
  render(
    <Wrapper
      state={{}}
      routes={[
        {
          pathname: ROUTES.rebrandAnnouncement,
          state: destination ? { destination } : undefined,
        },
      ]}
    >
      <Routes>
        <Route
          path={ROUTES.rebrandAnnouncement}
          element={<RebrandAnnouncement />}
        />
        <Route path={ROUTES.account} element={<div>account-home</div>} />
        <Route path={ROUTES.settings} element={<div>settings-home</div>} />
      </Routes>
    </Wrapper>,
  );

describe("RebrandAnnouncement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the announcement copy and actions", () => {
    renderView();

    expect(screen.getByText("Freighter is now Varial")).toBeInTheDocument();
    expect(
      screen.getByText("Your Freighter wallet, now with a new name and look."),
    ).toBeInTheDocument();
    expect(screen.getByText("Continue to Varial")).toBeInTheDocument();
  });

  it("reports the view as soon as it mounts", () => {
    renderView();

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.rebrandAnnouncementViewed,
    );
  });

  it("continues to the destination it was given", async () => {
    renderView(ROUTES.settings);

    await userEvent.click(screen.getByTestId("rebrand-announcement-continue"));

    expect(await screen.findByText("settings-home")).toBeInTheDocument();
    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.rebrandAnnouncementDismissed,
      { source: "continue" },
    );
  });

  it("continues to the account view when no destination was given", async () => {
    renderView();

    await userEvent.click(screen.getByTestId("rebrand-announcement-continue"));

    expect(await screen.findByText("account-home")).toBeInTheDocument();
  });
});
