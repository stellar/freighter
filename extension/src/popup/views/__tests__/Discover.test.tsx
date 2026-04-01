import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { DiscoverData } from "@shared/api/types";
import * as ApiInternal from "@shared/api/internal";
import * as RecentProtocols from "popup/helpers/recentProtocols";
import * as Navigate from "popup/helpers/navigate";
import { Wrapper, mockAccounts } from "../../__testHelpers__";
import { Discover } from "../Discover";

// Mock browser.storage.local
const mockStorageGet = jest.fn().mockResolvedValue({});
const mockStorageSet = jest.fn().mockResolvedValue(undefined);
const mockStorageRemove = jest.fn().mockResolvedValue(undefined);

jest.mock("webextension-polyfill", () => ({
  storage: {
    local: {
      get: (...args: unknown[]) => mockStorageGet(...args),
      set: (...args: unknown[]) => mockStorageSet(...args),
      remove: (...args: unknown[]) => mockStorageRemove(...args),
    },
  },
  tabs: {
    create: jest.fn(),
  },
}));

const mockProtocols: DiscoverData = [
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
    isTrending: false,
  },
  {
    description: "Blacklisted protocol",
    name: "BadProtocol",
    iconUrl: "https://example.com/bad.png",
    websiteUrl: "https://bad.com",
    tags: ["Scam"],
    isBlacklisted: true,
    isTrending: false,
  },
];

describe("Discover", () => {
  let openTabSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(ApiInternal, "getDiscoverData").mockResolvedValue(mockProtocols);
    jest.spyOn(RecentProtocols, "getRecentProtocols").mockResolvedValue([]);
    jest.spyOn(RecentProtocols, "addRecentProtocol").mockResolvedValue();
    jest.spyOn(RecentProtocols, "clearRecentProtocols").mockResolvedValue();
    openTabSpy = jest.spyOn(Navigate, "openTab").mockResolvedValue({} as any);
    mockStorageGet.mockResolvedValue({});
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

  describe("rendering", () => {
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
        expect(
          screen.getByTestId("discover-section-dapps"),
        ).toBeInTheDocument();
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
        expect(
          screen.getByTestId("discover-section-dapps"),
        ).toBeInTheDocument();
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
        expect(
          screen.getByTestId("discover-section-recent"),
        ).toBeInTheDocument();
      });
    });

    it("filters blacklisted protocols from trending carousel", async () => {
      renderDiscover();

      await waitFor(() => {
        expect(screen.getByTestId("trending-carousel")).toBeInTheDocument();
      });

      const trendingCards = screen.getAllByTestId("trending-card");
      trendingCards.forEach((card) => {
        expect(card).not.toHaveTextContent("BadProtocol");
      });
    });
  });

  describe("open protocol", () => {
    it("saves to recents before opening a new tab", async () => {
      renderDiscover();

      await waitFor(() => {
        expect(
          screen.getByTestId("discover-section-dapps"),
        ).toBeInTheDocument();
      });

      const openButtons = screen.getAllByTestId("protocol-row-open");
      await userEvent.click(openButtons[0]);

      expect(RecentProtocols.addRecentProtocol).toHaveBeenCalledWith(
        "https://blend.capital",
      );
      expect(openTabSpy).toHaveBeenCalledWith("https://blend.capital");

      // Verify order: addRecentProtocol called before openTab
      const addCall = (RecentProtocols.addRecentProtocol as jest.Mock).mock
        .invocationCallOrder[0];
      const openCall = openTabSpy.mock.invocationCallOrder[0];
      expect(addCall).toBeLessThan(openCall);
    });
  });

  describe("protocol details panel", () => {
    it("opens details panel when clicking a protocol row", async () => {
      renderDiscover();

      await waitFor(() => {
        expect(
          screen.getByTestId("discover-section-dapps"),
        ).toBeInTheDocument();
      });

      const protocolRows = screen.getAllByTestId("protocol-row");
      await userEvent.click(protocolRows[0]);

      await waitFor(() => {
        expect(
          screen.getByTestId("protocol-details-panel"),
        ).toBeInTheDocument();
      });

      const panel = screen.getByTestId("protocol-details-panel");
      expect(panel).toHaveTextContent("blend.capital");
      expect(panel).toHaveTextContent("Lending");
      expect(panel).toHaveTextContent("DeFi");
      expect(panel).toHaveTextContent("A lending protocol");
    });
  });

  describe("welcome modal", () => {
    it("shows welcome modal on first visit", async () => {
      mockStorageGet.mockResolvedValue({});

      renderDiscover();

      await waitFor(() => {
        expect(screen.getByText("Welcome to Discover!")).toBeInTheDocument();
      });
    });

    it("hides welcome modal when already dismissed", async () => {
      mockStorageGet.mockResolvedValue({ hasSeenDiscoverWelcome: true });

      renderDiscover();

      await waitFor(() => {
        expect(
          screen.getByTestId("discover-section-dapps"),
        ).toBeInTheDocument();
      });

      expect(
        screen.queryByText("Welcome to Discover!"),
      ).not.toBeInTheDocument();
    });

    it("dismisses welcome modal and persists to storage", async () => {
      mockStorageGet.mockResolvedValue({});

      renderDiscover();

      await waitFor(() => {
        expect(screen.getByText("Welcome to Discover!")).toBeInTheDocument();
      });

      const dismissButton = screen.getByTestId("discover-welcome-dismiss");
      await userEvent.click(dismissButton);

      expect(
        screen.queryByText("Welcome to Discover!"),
      ).not.toBeInTheDocument();
      expect(mockStorageSet).toHaveBeenCalledWith({
        hasSeenDiscoverWelcome: true,
      });
    });
  });

  describe("sub-view navigation", () => {
    it("navigates to expanded dApps view", async () => {
      renderDiscover();

      await waitFor(() => {
        expect(
          screen.getByTestId("discover-section-dapps"),
        ).toBeInTheDocument();
      });

      const expandButton = screen.getByTestId("discover-section-expand-dapps");
      await userEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("dApps")).toBeInTheDocument();
      });

      // Should show all non-blacklisted protocols
      const rows = screen.getAllByTestId("protocol-row");
      expect(rows).toHaveLength(2);
    });

    it("navigates to expanded recent view and back", async () => {
      jest
        .spyOn(RecentProtocols, "getRecentProtocols")
        .mockResolvedValue([
          { websiteUrl: "https://blend.capital", lastAccessed: Date.now() },
        ]);

      renderDiscover();

      await waitFor(() => {
        expect(
          screen.getByTestId("discover-section-recent"),
        ).toBeInTheDocument();
      });

      const expandButton = screen.getByTestId("discover-section-expand-recent");
      await userEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("Recent")).toBeInTheDocument();
        expect(screen.getByTestId("expanded-recent-menu")).toBeInTheDocument();
      });
    });
  });

  describe("clear recents", () => {
    it("clears recent protocols and returns to main view", async () => {
      jest
        .spyOn(RecentProtocols, "getRecentProtocols")
        .mockResolvedValueOnce([
          { websiteUrl: "https://blend.capital", lastAccessed: Date.now() },
        ])
        // After clear, return empty
        .mockResolvedValue([]);

      renderDiscover();

      await waitFor(() => {
        expect(
          screen.getByTestId("discover-section-recent"),
        ).toBeInTheDocument();
      });

      // Navigate to expanded recent
      const expandButton = screen.getByTestId("discover-section-expand-recent");
      await userEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId("expanded-recent-menu")).toBeInTheDocument();
      });

      // Open menu and clear
      const menuTrigger = screen.getByTestId("expanded-recent-menu");
      await userEvent.click(menuTrigger);

      const clearButton = screen.getByTestId("clear-recents-button");
      await userEvent.click(clearButton);

      expect(RecentProtocols.clearRecentProtocols).toHaveBeenCalled();

      // Should return to main view
      await waitFor(() => {
        expect(
          screen.getByTestId("discover-section-dapps"),
        ).toBeInTheDocument();
      });
    });
  });
});
