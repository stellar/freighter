import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";

import { toast } from "sonner";

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

/** The props of the Notification the latest toast would render. */
const lastToastProps = (spy: jest.SpyInstance) => {
  const renderToast = spy.mock.calls[spy.mock.calls.length - 1][0] as (
    id: string,
  ) => React.ReactElement<{ variant: string; title: string }>;
  return renderToast("toast").props;
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

  it("keeps the sheet closed when isOpen is false", async () => {
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
        />
      </Wrapper>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hidden-collectibles")).not.toBeInTheDocument();
  });

  it("shows each hidden collectible's name and token id with an Unhide button", async () => {
    const hiddenCollectibles = {
      "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:2": "hidden",
    };

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={mockCollectibles}
          isOpen={true}
          onClose={jest.fn()}
          refreshHiddenCollectibles={mockRefreshHiddenCollectibles}
          isCollectibleHidden={createIsCollectibleHidden(hiddenCollectibles)}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hidden-collectible-2")).toBeInTheDocument();
    });
    expect(screen.getByText("Stellar Frog 2")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByTestId("hidden-collectible-unhide-2")).toHaveTextContent(
      "Unhide",
    );
  });

  it("names a collectible without metadata Token #<id>, without repeating the id", async () => {
    const collectionAddress =
      "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
    const nameless = [
      {
        collection: {
          address: collectionAddress,
          name: "Stellar Frogs",
          symbol: "SFROG",
          collectibles: [
            {
              collectionAddress,
              collectionName: "Stellar Frogs",
              owner: TEST_PUBLIC_KEY,
              tokenId: "102510",
              tokenUri: "",
            },
          ],
        },
      },
    ] as any;

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <HiddenCollectibles
          collections={nameless}
          isOpen={true}
          onClose={jest.fn()}
          refreshHiddenCollectibles={mockRefreshHiddenCollectibles}
          isCollectibleHidden={() => true}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("hidden-collectible-102510"),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("hidden-collectible-102510")).toHaveTextContent(
      "Token #102510",
    );
    expect(screen.queryByText("#102510")).not.toBeInTheDocument();
  });

  it("unhides a collectible from its row, refreshes and closes", async () => {
    const onClose = jest.fn();
    const changeVisibility = jest
      .spyOn(ApiInternal, "changeCollectibleVisibility")
      .mockImplementation(() =>
        Promise.resolve({ hiddenCollectibles: {}, error: "" } as any),
      );
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
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hidden-collectible-2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("hidden-collectible-unhide-2"));

    await waitFor(() => {
      expect(changeVisibility).toHaveBeenCalledWith({
        collectibleKey:
          "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:2",
        collectibleVisibility: "visible",
        activePublicKey: TEST_PUBLIC_KEY,
      });
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    // Once on open, once after the unhide
    expect(mockRefreshHiddenCollectibles).toHaveBeenCalledTimes(2);
  });

  it("keeps the sheet open and reports the failure when the unhide is rejected", async () => {
    const onClose = jest.fn();
    const changeVisibility = jest
      .spyOn(ApiInternal, "changeCollectibleVisibility")
      .mockImplementation(() =>
        Promise.resolve({
          hiddenCollectibles: {},
          error: "storage failed",
        } as any),
      );
    const toastSpy = jest
      .spyOn(toast, "custom")
      .mockImplementation(() => "toast");
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
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hidden-collectible-2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("hidden-collectible-unhide-2"));

    await waitFor(() => expect(changeVisibility).toHaveBeenCalled());
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    expect(lastToastProps(toastSpy).variant).toBe("error");
    expect(onClose).not.toHaveBeenCalled();
    // Only the refresh on open; a failed unhide changes nothing
    expect(mockRefreshHiddenCollectibles).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("hidden-collectible-2")).toBeInTheDocument();
  });
});
