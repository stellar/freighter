import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import {
  PoolPausedBanner,
  PoolPausedSheet,
} from "popup/components/earn/PoolPausedBanner";

const Host = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <PoolPausedBanner onOpen={() => setIsOpen(true)} />
      <PoolPausedSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        poolName="Fixed v2.1 Pool"
      />
    </>
  );
};

const renderBanner = () =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <Host />
    </Wrapper>,
  );

const sheetModal = () =>
  screen.getByTestId("earn-pool-paused-sheet").closest(".SlideupModal");

describe("PoolPausedBanner", () => {
  it("says deposits are unavailable and offers the reason", () => {
    renderBanner();

    const banner = screen.getByTestId("earn-pool-paused-banner");
    expect(banner).toHaveTextContent("Deposits temporarily unavailable");
    expect(banner).toHaveTextContent("Why can’t I deposit?");
    expect(sheetModal()).toHaveClass("closed");
  });

  it("opens the reason in a sheet, naming the pool, and closes it", () => {
    renderBanner();

    fireEvent.click(screen.getByTestId("earn-pool-paused-banner"));

    expect(sheetModal()).toHaveClass("open");
    expect(screen.getByTestId("earn-pool-paused-sheet")).toHaveTextContent(
      "Fixed v2.1 Pool",
    );
    expect(
      screen.getByTestId("earn-pool-paused-sheet-status"),
    ).toHaveTextContent("Paused");

    fireEvent.click(screen.getByTestId("earn-pool-paused-sheet-action"));
    expect(sheetModal()).toHaveClass("closed");
  });
});
