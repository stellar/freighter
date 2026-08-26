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
    name: "Fixed Pool v2",
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
      "Fixed Pool v2",
    );
    expect(screen.getByTestId("pool-card-value-CAJJ")).toHaveTextContent(
      "$1,284.32",
    );
    // The brief's fixture math (31.75 / (1284.32 - 31.75)) works out to
    // 0.025347..., which formatRate's half-up rounding renders as "2.53%",
    // not the brief's literal "2.54%" -- verified independently with
    // BigNumber and by running this test against the real, already-committed
    // Task 1 getPoolPositionSummary. Trusting the actual code's output here
    // per this task's own instruction to do so on a brief/code conflict.
    expect(screen.getByTestId("pool-card-gain-CAJJ")).toHaveTextContent(
      "2.53%",
    );
    // react-i18next's t() is mocked in this test env to echo its key
    // untouched (config/jest/setupTests.tsx) rather than interpolate --
    // matches how the sibling PositionRow test asserts this same
    // "{{rate}} APY" pattern (AccountPositions.test.tsx). formatRate's own
    // tests cover the actual "10.23%" formatting; this proves the
    // available-rate branch is taken.
    expect(screen.getByTestId("pool-card-apy-CAJJ")).toHaveTextContent(
      "{{rate}} APY",
    );
  });

  it("opens the position when tapped", () => {
    const onClick = jest.fn();
    renderCard({ onClick });

    fireEvent.click(screen.getByTestId("pool-card-CAJJ"));

    expect(onClick).toHaveBeenCalledTimes(1);
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
