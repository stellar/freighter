import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import { PoolPausedBanner } from "popup/components/earn/PoolPausedBanner";

const renderBanner = () =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <PoolPausedBanner poolName="Fixed v2.1 Pool" />
    </Wrapper>,
  );

describe("PoolPausedBanner", () => {
  it("says deposits are unavailable and offers the reason", () => {
    renderBanner();

    const banner = screen.getByTestId("earn-pool-paused-banner");
    expect(banner).toHaveTextContent("Deposits temporarily unavailable");
    expect(banner).toHaveTextContent("Why can’t I deposit?");
  });

  it("opens the reason in a sheet, naming the pool, and closes it", () => {
    renderBanner();

    fireEvent.click(screen.getByTestId("earn-pool-paused-banner"));

    const sheet = screen.getByTestId("earn-pool-paused-sheet");
    expect(sheet).toHaveTextContent("Fixed v2.1 Pool");
    expect(
      screen.getByTestId("earn-pool-paused-sheet-status"),
    ).toHaveTextContent("Paused");

    fireEvent.click(screen.getByTestId("earn-pool-paused-sheet-action"));
    expect(
      screen.getByTestId("earn-pool-paused-sheet").closest(".SlideupModal"),
    ).toHaveClass("closed");
  });
});
