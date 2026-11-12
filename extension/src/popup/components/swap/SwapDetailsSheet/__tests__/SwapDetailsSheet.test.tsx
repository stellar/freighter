import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { SwapRoute } from "@shared/api/types/backend-api";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { Wrapper } from "popup/__testHelpers__";
import { SwapDetailsSheet, VenueIcon } from "../index";

jest.mock("@shared/api/internal", () => ({
  getDiscoverData: jest.fn(),
}));
jest.mock("@shared/api/helpers/token-list", () => ({
  getCombinedAssetListData: jest.fn(),
}));

const { getDiscoverData } = jest.requireMock<
  typeof import("@shared/api/internal")
>("@shared/api/internal");
const { getCombinedAssetListData } = jest.requireMock<
  typeof import("@shared/api/helpers/token-list")
>("@shared/api/helpers/token-list");

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC = `USDC:${USDC_ISSUER}`;

const knownTokens = {
  XLM: { code: "XLM", issuer: "", canonical: "native", icon: null },
  [USDC]: { code: "USDC", issuer: USDC_ISSUER, canonical: USDC, icon: null },
};

const lifiRoute: SwapRoute = {
  source: "lifi",
  fromAmount: "100",
  toAmount: "37",
  fees: [],
  paths: [
    {
      share: "0.7",
      hops: [{ venue: "Aquarius", from: "XLM", to: USDC, pool: "p1" }],
    },
    {
      share: "0.3",
      hops: [{ venue: "SushiSwap", from: "XLM", to: USDC, pool: "p2" }],
    },
  ],
};

const renderSheet = async (
  route: SwapRoute | null,
  onClose: () => void = jest.fn(),
) => {
  render(
    <Wrapper state={{}} routes={["/swap"]}>
      <SwapDetailsSheet
        route={route}
        fee="0.00001"
        feeFiat="<$0.01"
        knownTokens={knownTokens}
        srcCode="XLM"
        dstCode="USDC"
        sendAmount="100"
        destinationAmount="37"
        icons={{}}
        balances={[]}
        networkDetails={TESTNET_NETWORK_DETAILS}
        onClose={onClose}
      />
    </Wrapper>,
  );
  // Let the protocol and asset-list loads land.
  await act(async () => {});
};

describe("SwapDetailsSheet", () => {
  beforeEach(() => {
    (getDiscoverData as jest.Mock).mockResolvedValue([
      {
        name: "Aquarius",
        iconUrl: "https://icons.test/aquarius.png",
        description: "",
        websiteUrl: "",
        tags: [],
        isBlacklisted: false,
        isTrending: false,
      },
    ]);
    (getCombinedAssetListData as jest.Mock).mockResolvedValue([]);
  });
  afterEach(() => jest.clearAllMocks());

  it("goes from Details to Route and back", async () => {
    await renderSheet(lifiRoute);

    expect(screen.getByTestId("SwapDetails__fee")).toHaveTextContent(
      "0.00001 XLM (<$0.01)",
    );
    expect(screen.getByTestId("SwapDetails__rate")).toHaveTextContent(
      "1 XLM ≈ 0.37 USDC",
    );
    expect(screen.getByTestId("SwapDetails__route")).toHaveTextContent(
      "{{count}} providers",
    );
    expect(
      screen
        .getByTestId("SwapDetails__route")
        .querySelectorAll(".SwapDetails__venue-icon"),
    ).toHaveLength(2);

    fireEvent.click(screen.getByTestId("SwapDetails__route"));

    expect(screen.getByTestId("SwapRoute__path-count")).toHaveTextContent(
      "Split across {{pathCount}} paths",
    );
    expect(screen.getByTestId("SwapRoute__path-0")).toHaveTextContent("70%");
    expect(screen.getByTestId("SwapRoute__pools-0")).toHaveTextContent(
      "{{count}} pools",
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("SwapRoute__providers").querySelector("img"),
      ).toHaveAttribute("src", "https://icons.test/aquarius.png"),
    );
    expect(
      screen
        .getByTestId("SwapRoute__providers")
        .querySelectorAll("[data-testid='SwapDetails__venue-icon-generic']"),
    ).toHaveLength(1);

    fireEvent.click(screen.getByTestId("SwapRoute__path-1"));
    expect(screen.getByTestId("SwapRoute__hops-1")).toHaveTextContent(
      "XLMSushiSwapUSDC",
    );

    fireEvent.click(screen.getByTestId("SwapRoute__back"));
    expect(screen.getByTestId("SwapDetails")).toBeInTheDocument();
    expect(screen.queryByTestId("SwapRoute")).toBeNull();
  });

  it("closes from the Route pane", async () => {
    const onClose = jest.fn();
    await renderSheet(lifiRoute, onClose);
    fireEvent.click(screen.getByTestId("SwapDetails__route"));
    fireEvent.click(screen.getByTestId("SwapRoute__close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a classic route as one path with no pool count", async () => {
    await renderSheet({
      source: "classic",
      fromAmount: "100",
      toAmount: "37",
      fees: [],
      paths: [
        {
          share: "1",
          hops: [{ venue: "stellar-dex", from: "XLM", to: USDC }],
        },
      ],
    });
    fireEvent.click(screen.getByTestId("SwapDetails__route"));
    expect(screen.getByTestId("SwapRoute__path-count")).toHaveTextContent(
      "1 path",
    );
    expect(screen.getByTestId("SwapRoute__path-0")).toHaveTextContent("100%");
    expect(screen.queryByTestId("SwapRoute__pools-0")).toBeNull();
  });

  it("hides the Route row without a route", async () => {
    await renderSheet(null);
    expect(screen.getByTestId("SwapDetails__rate")).toBeInTheDocument();
    expect(screen.getByText("Swap details rate")).toBeInTheDocument();
    expect(screen.queryByTestId("SwapDetails__route")).toBeNull();
  });
});

describe("VenueIcon", () => {
  it("falls back to the generic icon when the venue's image fails to load", () => {
    render(
      <VenueIcon
        venue={{ name: "Aquarius", icon: "https://icons.test/gone.png" }}
      />,
    );
    fireEvent.error(screen.getByTestId("SwapDetails__venue-icon"));

    expect(
      screen.getByTestId("SwapDetails__venue-icon-generic"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("SwapDetails__venue-icon")).toBeNull();
  });
});
