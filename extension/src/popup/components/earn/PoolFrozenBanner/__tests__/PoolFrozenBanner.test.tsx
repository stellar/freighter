import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import {
  PoolFrozenBanner,
  PoolFrozenSheet,
} from "popup/components/earn/PoolFrozenBanner";

const Host = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <PoolFrozenBanner onOpen={() => setIsOpen(true)} />
      <PoolFrozenSheet
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
  screen.getByTestId("earn-pool-frozen-sheet").closest(".SlideupModal");

describe("PoolFrozenBanner", () => {
  it("says deposits are unavailable and offers the reason", () => {
    renderBanner();

    const banner = screen.getByTestId("earn-pool-frozen-banner");
    expect(banner).toHaveTextContent("Deposits temporarily unavailable");
    expect(banner).toHaveTextContent("Why can’t I deposit?");
    expect(sheetModal()).toHaveClass("closed");
  });

  it("opens the reason in a sheet, naming the pool, and closes it", () => {
    renderBanner();

    fireEvent.click(screen.getByTestId("earn-pool-frozen-banner"));

    expect(sheetModal()).toHaveClass("open");
    expect(screen.getByTestId("earn-pool-frozen-sheet")).toHaveTextContent(
      "Fixed v2.1 Pool",
    );
    expect(
      screen.getByTestId("earn-pool-frozen-sheet-status"),
    ).toHaveTextContent("Frozen");

    fireEvent.click(screen.getByTestId("earn-pool-frozen-sheet-action"));
    expect(sheetModal()).toHaveClass("closed");
  });
});
