import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import * as ApiInternal from "@shared/api/internal";
import * as RecentProtocols from "popup/helpers/recentProtocols";
import { Wrapper, mockAccounts } from "../../__testHelpers__";
import { Discover } from "../Discover";

// Mock browser.storage.local
jest.mock("webextension-polyfill", () => ({
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    },
  },
  tabs: {
    create: jest.fn(),
  },
}));

const mockProtocols = [
  {
    description: "A lending protocol",
    name: "Blend",
    iconUrl: "https://example.com/blend.png",
    websiteUrl: "https://blend.capital",
    tags: ["Lending", "DeFi"],
    isBlacklisted: false,
    backgroundUrl: "https://example.com/blend-bg.png",
    isTrending: true,
  },
  {
    description: "An exchange",
    name: "Soroswap",
    iconUrl: "https://example.com/soroswap.png",
    websiteUrl: "https://soroswap.finance",
    tags: ["Exchange"],
    isBlacklisted: false,
    backgroundUrl: undefined,
    isTrending: false,
  },
  {
    description: "Blacklisted protocol",
    name: "BadProtocol",
    iconUrl: "https://example.com/bad.png",
    websiteUrl: "https://bad.com",
    tags: ["Scam"],
    isBlacklisted: true,
    backgroundUrl: undefined,
    isTrending: false,
  },
];

describe("Discover", () => {
  beforeEach(() => {
    jest.spyOn(ApiInternal, "getDiscoverData").mockResolvedValue(mockProtocols);
    jest.spyOn(RecentProtocols, "getRecentProtocols").mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderDiscover = () =>
    render(
      <Wrapper
        routes={["/"]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Discover onClose={jest.fn()} />
      </Wrapper>,
    );

  it("displays trending protocols in the carousel", async () => {
    renderDiscover();

    await waitFor(() => {
      expect(screen.getByTestId("trending-carousel")).toBeInTheDocument();
    });

    const trendingCards = screen.getAllByTestId("trending-card");
    expect(trendingCards).toHaveLength(1);
    expect(trendingCards[0]).toHaveTextContent("Blend");
  });

  it("displays dApps section with non-blacklisted protocols", async () => {
    renderDiscover();

    await waitFor(() => {
      expect(screen.getByTestId("discover-section-dapps")).toBeInTheDocument();
    });

    const protocolRows = screen.getAllByTestId("protocol-row");
    // Blend + Soroswap (BadProtocol is blacklisted)
    expect(protocolRows).toHaveLength(2);
    expect(protocolRows[0]).toHaveTextContent("Blend");
    expect(protocolRows[1]).toHaveTextContent("Soroswap");
  });

  it("hides recent section when no recent protocols exist", async () => {
    renderDiscover();

    await waitFor(() => {
      expect(screen.getByTestId("discover-section-dapps")).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId("discover-section-recent"),
    ).not.toBeInTheDocument();
  });

  it("shows recent section when recent protocols exist", async () => {
    jest
      .spyOn(RecentProtocols, "getRecentProtocols")
      .mockResolvedValue([
        { websiteUrl: "https://blend.capital", lastAccessed: Date.now() },
      ]);

    renderDiscover();

    await waitFor(() => {
      expect(screen.getByTestId("discover-section-recent")).toBeInTheDocument();
    });
  });
});
