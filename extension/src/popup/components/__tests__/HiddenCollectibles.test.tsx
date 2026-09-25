import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
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

const mockRefreshHiddenCollectibles = jest.fn().mockResolvedValue(undefined);

// Helper to create isCollectibleHidden function based on hiddenCollectibles record
const createIsCollectibleHidden =
  (hiddenCollectibles: Record<string, string>) =>
  (collectionAddress: string, tokenId: string) => {
    const key = `${collectionAddress}:${tokenId}`;
    return hiddenCollectibles[key] === "hidden";
  };

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
  });

  it("renders empty state when no collectibles are hidden", async () => {
    const onClose = jest.fn();
    const hiddenCollectibles = {};

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={onClose}
          refreshHiddenCollectibles={mockRefreshHiddenCollectibles}
          isCollectibleHidden={createIsCollectibleHidden(hiddenCollectibles)}
          isLoading={false}
          loadError=""
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("No hidden collectibles")).toBeInTheDocument();
    });
  });

  it("renders hidden collectibles when some are hidden", async () => {
    const onClose = jest.fn();
    const hiddenCollectibles = {
      "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:1": "hidden",
    };

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={onClose}
          refreshHiddenCollectibles={mockRefreshHiddenCollectibles}
          isCollectibleHidden={createIsCollectibleHidden(hiddenCollectibles)}
          isLoading={false}
          loadError=""
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hidden-collectible-1")).toBeInTheDocument();
    });
  });

  it("renders multiple hidden collectibles from different collections", async () => {
    const onClose = jest.fn();
    const hiddenCollectibles = {
      "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:1": "hidden",
      "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:2": "hidden",
      "CCCSorobanDomainsCollection:102510": "hidden",
    };

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={onClose}
          refreshHiddenCollectibles={mockRefreshHiddenCollectibles}
          isCollectibleHidden={createIsCollectibleHidden(hiddenCollectibles)}
          isLoading={false}
          loadError=""
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
    const hiddenCollectibles = {};

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={false}
          onClose={onClose}
          refreshHiddenCollectibles={mockRefreshHiddenCollectibles}
          isCollectibleHidden={createIsCollectibleHidden(hiddenCollectibles)}
          isLoading={false}
          loadError=""
        />
      </Wrapper>,
    );

    // SlideupModal keeps its children mounted and animates them out, unlike the
    // Radix sheet this replaced, so assert it is closed rather than absent.
    expect(
      document.querySelector(".SlideupModal.open"),
    ).not.toBeInTheDocument();
  });

  it("unhides from the row without opening a detail view", async () => {
    const onClose = jest.fn();
    const hiddenCollectibles = {
      "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:2": "hidden",
    };

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={onClose}
          refreshHiddenCollectibles={mockRefreshHiddenCollectibles}
          isCollectibleHidden={createIsCollectibleHidden(hiddenCollectibles)}
          isLoading={false}
          loadError=""
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hidden-collectible-2")).toBeInTheDocument();
    });

    const changeCollectibleVisibility = jest
      .spyOn(ApiInternal, "changeCollectibleVisibility")
      .mockResolvedValue({ hiddenCollectibles: {}, error: "" } as any);

    // The row carries its own Unhide action; the designs dropped the
    // tile -> detail -> menu route that used to be the only way.
    const unhide = screen.getByTestId("hidden-collectible-unhide-2");
    expect(unhide).toBeInTheDocument();

    fireEvent.click(unhide);

    await waitFor(() => {
      expect(changeCollectibleVisibility).toHaveBeenCalledWith(
        expect.objectContaining({
          collectibleKey:
            "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:2",
          collectibleVisibility: "visible",
        }),
      );
    });

    expect(screen.queryByTestId("CollectibleDetail")).not.toBeInTheDocument();
  });
  it("waits for the visibility map instead of claiming nothing is hidden", async () => {
    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={jest.fn()}
          refreshHiddenCollectibles={mockRefreshHiddenCollectibles}
          isCollectibleHidden={createIsCollectibleHidden({})}
          isLoading={true}
          loadError=""
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("HiddenCollectibles__loader"),
      ).toBeInTheDocument();
    });
    // The empty state would be a claim the sheet cannot make yet.
    expect(
      screen.queryByText("No hidden collectibles"),
    ).not.toBeInTheDocument();
  });

  it("surfaces a failed visibility load rather than spinning forever", async () => {
    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={jest.fn()}
          refreshHiddenCollectibles={mockRefreshHiddenCollectibles}
          isCollectibleHidden={createIsCollectibleHidden({})}
          isLoading={true}
          loadError="boom"
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("HiddenCollectibles__error"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("HiddenCollectibles__loader"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("No hidden collectibles"),
    ).not.toBeInTheDocument();
  });
});
