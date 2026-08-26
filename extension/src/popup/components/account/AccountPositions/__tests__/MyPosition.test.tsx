import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { MyPosition } from "popup/components/account/AccountPositions/MyPosition";
import { Wrapper } from "popup/__testHelpers__";

const USDC_SAC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const XLM_SAC = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";

const row = (
  assetId: string,
  symbol: string | null,
  usdValue: number,
  interest: number | null,
) => ({
  assetId,
  symbol,
  name: symbol
    ? `${symbol}:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
    : null,
  decimals: 7,
  suppliedTokens: "0",
  collateralTokens: "0",
  totalTokens: "5000000000",
  usdValue,
  apy: 0.1694,
  emissionsApr: 0,
  interestEarned: "0",
  interestEarnedUsd: interest,
  claimableBlnd: "0",
  claimableUsd: null,
  priceUsd: 1,
});

const position = {
  protocol: "blend",
  id: "CAJJ",
  name: "Fixed Pool v2",
  netUsd: 1284.32,
  suppliedUsd: 1284.32,
  borrowedUsd: 0,
  netApy: 0.1023,
  blend: {
    supply: [
      row(XLM_SAC, null, 784.2, 20.0),
      row(USDC_SAC, "USDC", 500.12, 11.75),
    ],
    borrow: [],
  },
} as never;

const renderScreen = (props = {}) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <MyPosition
        position={position}
        pool={null}
        assetIcons={{}}
        networkDetails={MAINNET_NETWORK_DETAILS}
        onClose={jest.fn()}
        onAboutPool={jest.fn()}
        onSelectAsset={jest.fn()}
        {...props}
      />
    </Wrapper>,
  );

describe("MyPosition", () => {
  it("shows the pool's total, its absolute gain and the relative gain", () => {
    renderScreen();

    expect(screen.getByTestId("my-position-total")).toHaveTextContent(
      "$1,284.32",
    );
    // 31.75 interest on 1252.57 principal = 31.75 / 1252.57 = 2.5348%, which
    // formatRate's BigNumber().toFormat(2) rounds to 2.53% -- not the 2.54%
    // the task brief's own comment claimed; verified directly against
    // getPoolPositionSummary + formatRate rather than taken on faith.
    expect(screen.getByTestId("my-position-gain")).toHaveTextContent("31.75");
    expect(screen.getByTestId("my-position-gain")).toHaveTextContent("2.53%");
  });

  it("lists one row per supplied asset, resolving native XLM's missing symbol", () => {
    renderScreen();

    expect(screen.getByTestId("position-row-XLM")).toBeInTheDocument();
    expect(screen.getByTestId("position-row-USDC")).toBeInTheDocument();
  });

  it("no longer shows a per-asset gain column", () => {
    // The gain moved up to the pool-level header; showing it twice would
    // invite the reader to add the two together.
    renderScreen();

    expect(screen.queryByTestId("position-gain-USDC")).not.toBeInTheDocument();
  });

  it("reports About pool and asset taps to its caller", () => {
    const onAboutPool = jest.fn();
    const onSelectAsset = jest.fn();
    renderScreen({ onAboutPool, onSelectAsset });

    fireEvent.click(screen.getByTestId("my-position-about-pool"));
    expect(onAboutPool).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("position-row-USDC"));
    expect(onSelectAsset).toHaveBeenCalledWith(
      expect.objectContaining({ code: "USDC", assetId: USDC_SAC }),
    );
  });

  it("renders an unavailable gain as the placeholder rather than zero", () => {
    const unpriced = {
      ...(position as unknown as Record<string, unknown>),
      blend: { supply: [row(USDC_SAC, "USDC", 500.12, null)], borrow: [] },
    } as never;
    renderScreen({ position: unpriced });

    expect(screen.getByTestId("my-position-gain")).toHaveTextContent("--");
  });
});
