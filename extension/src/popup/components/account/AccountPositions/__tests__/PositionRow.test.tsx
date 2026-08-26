import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { PositionTokenRow } from "popup/components/earn/helpers/positionRows";
import { PositionRow } from "popup/components/account/AccountPositions/PositionRow";
import { Wrapper } from "popup/__testHelpers__";

const row = (over: Partial<PositionTokenRow> = {}): PositionTokenRow => ({
  poolId: "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD",
  poolName: "Fixed Pool v2",
  protocol: "blend",
  assetId: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
  code: "USDC",
  issuer: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
  decimals: 7,
  suppliedTokens: "500.12",
  suppliedUsd: 500.12,
  apy: 0.1694,
  interestEarnedUsd: 0.12,
  ...over,
});

const renderRow = (
  props: Partial<React.ComponentProps<typeof PositionRow>> = {},
) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <PositionRow row={row()} assetIcons={{}} onClick={() => {}} {...props} />
    </Wrapper>,
  );

/**
 * PositionRow (moved out of the tab in Task 3, but left untouched -- it
 * relocates into MyPosition in Task 4) previously had this coverage only
 * through AccountPositions.test.tsx, exercised via the tab. Removing the
 * token-row tab tests dropped that coverage along with the DOM they asserted
 * on. Reinstated here directly against PositionRow, which is simpler than
 * the old tab-level setup and doesn't depend on what wraps it.
 */
describe("PositionRow", () => {
  it("renders an unavailable value as -- rather than zero", () => {
    renderRow({ row: row({ suppliedUsd: null }) });

    expect(screen.getByTestId("position-value-USDC")).toHaveTextContent("--");
  });

  it("colors a real interest gain and shows the amount", () => {
    renderRow({ row: row({ interestEarnedUsd: 0.12 }) });

    const gain = screen.getByTestId("position-gain-USDC");
    expect(gain).toHaveClass("PositionRow__gain--positive");
    expect(gain).toHaveTextContent("+$0.12");
  });

  it("shows a flat-zero interest gain without coloring it like a real gain", () => {
    renderRow({ row: row({ interestEarnedUsd: 0 }) });

    const gain = screen.getByTestId("position-gain-USDC");
    expect(gain).not.toHaveClass("PositionRow__gain--positive");
    expect(gain).toHaveTextContent("+$0.00");
  });

  it("renders an unavailable interest gain as -- without coloring it", () => {
    renderRow({ row: row({ interestEarnedUsd: null }) });

    const gain = screen.getByTestId("position-gain-USDC");
    expect(gain).not.toHaveClass("PositionRow__gain--positive");
    expect(gain).toHaveTextContent("--");
  });

  it("routes the rate line through translation (not the bare fallback) when the rate is available", () => {
    renderRow({ row: row({ apy: 0.1694 }) });

    // react-i18next's t() is mocked in this test env to echo its key
    // untouched (config/jest/setupTests.tsx) rather than interpolate --
    // formatRate's own tests cover the actual "16.94%" formatting. This just
    // proves the available-rate branch (through t()) is taken instead of the
    // bare "--" fallback.
    expect(screen.getByTestId("position-apy-USDC")).toHaveTextContent(
      "{{rate}} APY",
    );
  });

  it("renders the rate line as a bare -- when the rate is unavailable, not '-- APY'", () => {
    renderRow({ row: row({ apy: null }) });

    const apy = screen.getByTestId("position-apy-USDC");
    expect(apy).toHaveTextContent("--");
    expect(apy).not.toHaveTextContent("APY");
  });

  it("still fires its click handler, since it moves into My position as a tappable row", () => {
    const onClick = jest.fn();
    renderRow({ onClick });

    fireEvent.click(screen.getByTestId("position-row-USDC"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
