import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { PoolCard } from "popup/components/account/AccountPositions/PoolCard";
import { Wrapper } from "popup/__testHelpers__";

const supply = (interestEarnedUsd: number | null) => ({
  assetId: "CUSDC",
  symbol: "USDC",
  name: null,
  decimals: 7,
  suppliedTokens: "0",
  collateralTokens: "0",
  totalTokens: "0",
  usdValue: 500.12,
  apy: 0.1694,
  emissionsApr: 0,
  interestEarned: "0",
  interestEarnedUsd,
  claimableBlnd: "0",
  claimableUsd: null,
  priceUsd: 1,
});

const position = (over: Record<string, unknown> = {}) =>
  ({
    protocol: "blend",
    id: "CAJJ",
    name: "Fixed v2.1 Pool",
    netUsd: 1284.32,
    suppliedUsd: 1284.32,
    borrowedUsd: 0,
    netApy: 0.1023,
    blend: { supply: [supply(31.75)], borrow: [] },
    ...over,
  }) as never;

const renderCard = (props = {}) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <PoolCard position={position()} onClick={jest.fn()} {...props} />
    </Wrapper>,
  );

describe("PoolCard", () => {
  it("shows the pool, its provider, value, gain and rate", () => {
    renderCard();

    expect(screen.getByTestId("pool-card-CAJJ")).toHaveTextContent(
      "Fixed v2.1 Pool",
    );
    expect(screen.getByTestId("pool-card-value-CAJJ")).toHaveTextContent(
      "$1,284.32",
    );
    // 31.75 / (1284.32 - 31.75) works out to 0.025347..., which formatRate's
    // half-up rounding renders as "2.53%" -- verified independently with
    // BigNumber, and against getPoolPositionSummary's actual output rather
    // than hand-rounded expectations.
    expect(screen.getByTestId("pool-card-gain-CAJJ")).toHaveTextContent(
      "2.53%",
    );
    // react-i18next's t() is mocked in this test env to echo its key
    // untouched (config/jest/setupTests.tsx) rather than interpolate.
    // formatRate's own tests cover the actual "10.23%" formatting; this proves
    // the available-rate branch is taken.
    expect(screen.getByTestId("pool-card-apy-CAJJ")).toHaveTextContent(
      "{{rate}} Net APY",
    );
  });

  it("opens the position when tapped", () => {
    const onClick = jest.fn();
    renderCard({ onClick });

    fireEvent.click(screen.getByTestId("pool-card-CAJJ"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // A loss is grey, never the gain's green.
  it("greys a negative gain", () => {
    renderCard({
      position: position({ blend: { supply: [supply(-0.02)], borrow: [] } }),
    });

    const badge = screen.getByTestId("pool-card-gain-CAJJ");
    expect(badge).toHaveTextContent(/^-/);
    expect(badge).toHaveClass("PositionPoolCard__gain--loss");
  });

  it("keeps a positive gain green", () => {
    renderCard();

    expect(screen.getByTestId("pool-card-gain-CAJJ")).not.toHaveClass(
      "PositionPoolCard__gain--loss",
    );
  });

  it("renders an unavailable gain as the placeholder, not zero", () => {
    renderCard({
      position: position({ blend: { supply: [supply(null)], borrow: [] } }),
    });

    expect(screen.getByTestId("pool-card-gain-CAJJ")).toHaveTextContent("--");
    expect(screen.getByTestId("pool-card-gain-CAJJ")).not.toHaveTextContent(
      "0.00%",
    );
  });

  it("falls back to a generic name when the pool is unnamed", () => {
    renderCard({ position: position({ name: null }) });

    expect(screen.getByTestId("pool-card-CAJJ")).toHaveTextContent(
      "Blend pool",
    );
  });

  it("renders the rate line as a bare -- when the APY is unavailable, not '-- APY'", () => {
    renderCard({ position: position({ netApy: null }) });

    const apy = screen.getByTestId("pool-card-apy-CAJJ");
    expect(apy).toHaveTextContent("--");
    expect(apy).not.toHaveTextContent("APY");
  });
});
