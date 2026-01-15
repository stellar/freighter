import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";

import { HiddenCollectibles } from "popup/components/account/HiddenCollectibles";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import {
  Wrapper,
  mockAccounts,
  TEST_PUBLIC_KEY,
  mockCollectibles,
} from "../../__testHelpers__";
import * as internalApi from "@shared/api/internal";

// Mock the internal API
jest.mock("@shared/api/internal", () => ({
  getHiddenCollectibles: jest.fn(),
  changeCollectibleVisibility: jest.fn(),
}));

const mockGetHiddenCollectibles =
  internalApi.getHiddenCollectibles as jest.Mock;

const defaultState = {
  auth: {
    error: null,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    publicKey: TEST_PUBLIC_KEY,
    allAccounts: mockAccounts,
  },
  settings: {
    networkDetails: TESTNET_NETWORK_DETAILS,
    networksList: DEFAULT_NETWORKS,
    isSorobanPublicEnabled: true,
    isRpcHealthy: true,
    userNotification: {
      enabled: false,
      message: "",
    },
  },
  cache: {
    collections: {
      [TESTNET_NETWORK_DETAILS.network]: {
        [TEST_PUBLIC_KEY]: mockCollectibles,
      },
    },
  },
};

describe("HiddenCollectibles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module-level state by mocking getHiddenCollectibles
    mockGetHiddenCollectibles.mockResolvedValue({
      hiddenCollectibles: {},
      error: "",
    });
  });

  it("renders empty state when no collectibles are hidden", async () => {
    mockGetHiddenCollectibles.mockResolvedValue({
      hiddenCollectibles: {},
      error: "",
    });

    const onClose = jest.fn();

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={onClose}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("No hidden collectibles")).toBeInTheDocument();
    });
  });

  it("renders hidden collectibles when some are hidden", async () => {
    // Mock one collectible as hidden
    mockGetHiddenCollectibles.mockResolvedValue({
      hiddenCollectibles: {
        "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:1": "hidden",
      },
      error: "",
    });

    const onClose = jest.fn();

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={onClose}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hidden-collectible-1")).toBeInTheDocument();
    });
  });

  it("renders multiple hidden collectibles from different collections", async () => {
    // Mock multiple collectibles as hidden
    mockGetHiddenCollectibles.mockResolvedValue({
      hiddenCollectibles: {
        "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:1": "hidden",
        "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:2": "hidden",
        "CCCSorobanDomainsCollection:102510": "hidden",
      },
      error: "",
    });

    const onClose = jest.fn();

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={onClose}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hidden-collectible-1")).toBeInTheDocument();
      expect(screen.getByTestId("hidden-collectible-2")).toBeInTheDocument();
      expect(
        screen.getByTestId("hidden-collectible-102510"),
      ).toBeInTheDocument();
    });
  });

  it("does not render when isOpen is false", async () => {
    const onClose = jest.fn();

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={false}
          onClose={onClose}
        />
      </Wrapper>,
    );

    // Should not find the hidden collectibles content
    expect(screen.queryByText("Hidden Collectibles")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No hidden collectibles"),
    ).not.toBeInTheDocument();
  });

  it("refreshes hidden collectibles when sheet opens", async () => {
    mockGetHiddenCollectibles.mockResolvedValue({
      hiddenCollectibles: {},
      error: "",
    });

    const onClose = jest.fn();

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={onClose}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(mockGetHiddenCollectibles).toHaveBeenCalled();
    });
  });

  it("opens collectible detail when clicking on a hidden collectible", async () => {
    mockGetHiddenCollectibles.mockResolvedValue({
      hiddenCollectibles: {
        "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:2": "hidden",
      },
      error: "",
    });

    const onClose = jest.fn();

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={onClose}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hidden-collectible-2")).toBeInTheDocument();
    });

    // Click on the hidden collectible
    fireEvent.click(screen.getByTestId("hidden-collectible-2"));

    // Should open the collectible detail
    await waitFor(() => {
      expect(screen.getByTestId("CollectibleDetail")).toBeInTheDocument();
    });
  });
});
