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
 * PositionRow (moved out of the tab in Task 3) now relocates into MyPosition
 * (Task 4), which drops the interest-gain column -- that figure now lives in
 * MyPosition's own pool-level header instead, covered by MyPosition.test.tsx.
 * The value, rate and click-handler coverage below still applies unchanged.
 */
describe("PositionRow", () => {
  it("renders an unavailable value as -- rather than zero", () => {
    renderRow({ row: row({ suppliedUsd: null }) });

    expect(screen.getByTestId("position-value-USDC")).toHaveTextContent("--");
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
