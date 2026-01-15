import React from "react";
import { render, waitFor, screen, within } from "@testing-library/react";

import { AccountCollectibles } from "popup/components/account/AccountCollectibles";
import { resetHiddenCollectiblesState } from "popup/components/account/hooks/useHiddenCollectibles";
import {
  mockCollectibles,
  Wrapper,
  TEST_PUBLIC_KEY,
  mockAccounts,
} from "../../__testHelpers__";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
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
};

describe("AccountCollectibles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module-level state in the hook
    resetHiddenCollectiblesState();
    // Default: no hidden collectibles
    mockGetHiddenCollectibles.mockResolvedValue({
      hiddenCollectibles: {},
      error: "",
    });
  });

  it("renders collectibles", async () => {
    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <AccountCollectibles collections={mockCollectibles} />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("account-collectibles"));
    expect(screen.getByTestId("account-collectibles")).toBeDefined();
    expect(screen.queryAllByTestId("account-collectible")).toHaveLength(3);

    // stellar frogs collection
    expect(
      screen.queryAllByTestId("account-collection-name")[0],
    ).toHaveTextContent("Stellar Frogs");
    expect(
      screen.queryAllByTestId("account-collection-count")[0],
    ).toHaveTextContent("3");

    const gridQuery1 = within(
      screen.queryAllByTestId("account-collection-grid")[0],
    );
    expect(
      gridQuery1.queryAllByTestId("account-collectible-image"),
    ).toHaveLength(3);
    expect(
      gridQuery1.queryAllByTestId("account-collectible-image")[0],
    ).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
    );
    expect(
      gridQuery1.queryAllByTestId("account-collectible-image")[1],
    ).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
    );
    expect(
      gridQuery1.queryAllByTestId("account-collectible-image")[2],
    ).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/events/2023/8/5kFeYwNfhpUST3TsSoLxm7FaGY1ljwLRgfZ5gQnV.jpg",
    );

    // soroban domains collection

    const gridQuery2 = within(
      screen.queryAllByTestId("account-collection-grid")[1],
    );
    expect(
      gridQuery2.queryAllByTestId("account-collectible-image"),
    ).toHaveLength(2);
    expect(
      gridQuery2.queryAllByTestId("account-collectible-image")[0],
    ).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/events/2025/7/Hdqv6YNVErVCmYlwobFVYfS5BiH19ferUgQova7Z.webp",
    );
    expect(
      gridQuery2.queryAllByTestId("account-collectible-image")[1],
    ).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/events/2025/7/MkaASwOL8VA3I5B2iIfCcNGT29vGBp4YZIJgmjzq.jpg",
    );

    // future monkeys collection
    const gridQuery3 = within(
      screen.queryAllByTestId("account-collection-grid")[2],
    );
    expect(
      gridQuery3.queryAllByTestId("account-collectible-image"),
    ).toHaveLength(1);
    expect(
      gridQuery3.queryAllByTestId("account-collectible-image")[0],
    ).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/events/2025/3/oUfeUrSj3KcVnjColyfnS5ICYuqzDbiuqQP4qLIz.png",
    );
  });
  it("renders empty state", async () => {
    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <AccountCollectibles collections={[]} />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("account-collectibles"));
    expect(screen.getByTestId("account-collectibles")).toBeDefined();
    expect(screen.getByText("No collectibles yet")).toBeDefined();
  });
  it("renders error state", async () => {
    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <AccountCollectibles
          collections={[
            { error: { collection_address: "test", error_message: "test" } },
          ]}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("account-collectibles"));
    expect(screen.getByTestId("account-collectibles")).toBeDefined();
    expect(screen.getByText("Error loading collectibles")).toBeDefined();
  });
  it("renders some collectibles and omits the ones with an error", async () => {
    const partialMockCollectibles = [
      { error: { collection_address: "test", error_message: "test" } },
      {
        collection: {
          address: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA", // Using XLM contract address for testing
          name: "Stellar Frogs",
          symbol: "SFROG",
          collectibles: [
            {
              collectionAddress:
                "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
              collectionName: "Stellar Frogs",
              owner: "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
              tokenId: "1",
              tokenUri:
                "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
              metadata: {
                image:
                  "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
                name: "Stellar Frog 1",
                description: "This is a test frog",
                attributes: [
                  {
                    traitType: "Background",
                    value: "Green",
                  },
                ],
              },
            },
            {
              collectionName: "Stellar Frogs",
              collectionAddress:
                "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
              owner: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
              tokenId: "2",
              tokenUri: "https://nftcalendar.io/token/2",
              metadata: {
                image:
                  "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
                name: "Stellar Frog 2",
                description: "This is a test frog",
                attributes: [
                  {
                    traitType: "Background",
                    value: "Red",
                  },
                ],
              },
            },
            {
              collectionName: "Stellar Frogs",
              collectionAddress:
                "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
              owner: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
              tokenId: "3",
              tokenUri: "https://nftcalendar.io/token/3",
              metadata: {
                image:
                  "https://nftcalendar.io/storage/uploads/events/2023/8/5kFeYwNfhpUST3TsSoLxm7FaGY1ljwLRgfZ5gQnV.jpg",
                name: "Stellar Frog 3",
                description: "This is a test frog",
                attributes: [
                  {
                    traitType: "Background",
                    value: "Blue",
                  },
                ],
              },
            },
          ],
        },
      },
    ];
    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <AccountCollectibles collections={partialMockCollectibles} />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("account-collectibles"));
    expect(screen.getByTestId("account-collectibles")).toBeDefined();
    expect(screen.queryByText("Error loading collectibles")).toBeNull();
    expect(screen.queryAllByTestId("account-collectible")).toHaveLength(1);

    expect(
      screen.queryAllByTestId("account-collection-name")[0],
    ).toHaveTextContent("Stellar Frogs");
    expect(
      screen.queryAllByTestId("account-collection-count")[0],
    ).toHaveTextContent("3");

    const gridQuery1 = within(
      screen.queryAllByTestId("account-collection-grid")[0],
    );
    expect(
      gridQuery1.queryAllByTestId("account-collectible-image"),
    ).toHaveLength(3);
    expect(
      gridQuery1.queryAllByTestId("account-collectible-image")[0],
    ).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
    );
    expect(
      gridQuery1.queryAllByTestId("account-collectible-image")[1],
    ).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
    );
    expect(
      gridQuery1.queryAllByTestId("account-collectible-image")[2],
    ).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/events/2023/8/5kFeYwNfhpUST3TsSoLxm7FaGY1ljwLRgfZ5gQnV.jpg",
    );
  });

  it("filters out hidden collectibles from display", async () => {
    // Mock one collectible as hidden
    mockGetHiddenCollectibles.mockResolvedValue({
      hiddenCollectibles: {
        "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:1": "hidden",
      },
      error: "",
    });

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <AccountCollectibles collections={mockCollectibles} />
      </Wrapper>,
    );

    // Wait for the hidden collectibles to be loaded and applied
    // Stellar Frogs collection should now show only 2 collectibles (tokenId 2 and 3)
    await waitFor(() => {
      const grids = screen.queryAllByTestId("account-collection-grid");
      const gridQuery = within(grids[0]);
      expect(
        gridQuery.queryAllByTestId("account-collectible-image"),
      ).toHaveLength(2);
    });

    const gridQuery1 = within(
      screen.queryAllByTestId("account-collection-grid")[0],
    );

    // First collectible shown should be tokenId 2 (not tokenId 1 which is hidden)
    expect(
      gridQuery1.queryAllByTestId("account-collectible-image")[0],
    ).toHaveAttribute(
      "src",
      "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
    );

    // Collection count should reflect filtered count
    expect(
      screen.queryAllByTestId("account-collection-count")[0],
    ).toHaveTextContent("2");
  });

  it("filters out multiple hidden collectibles from different collections", async () => {
    // Mock multiple collectibles as hidden
    mockGetHiddenCollectibles.mockResolvedValue({
      hiddenCollectibles: {
        "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:1": "hidden",
        "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA:2": "hidden",
        "CCCSorobanDomainsCollection:102510": "hidden",
      },
      error: "",
    });

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <AccountCollectibles collections={mockCollectibles} />
      </Wrapper>,
    );

    // Wait for hidden collectibles to be applied
    // Stellar Frogs: only tokenId 3 visible (1 and 2 hidden)
    await waitFor(() => {
      const grids = screen.queryAllByTestId("account-collection-grid");
      const gridQuery = within(grids[0]);
      expect(
        gridQuery.queryAllByTestId("account-collectible-image"),
      ).toHaveLength(1);
    });

    const gridQuery1 = within(
      screen.queryAllByTestId("account-collection-grid")[0],
    );
    expect(
      gridQuery1.queryAllByTestId("account-collectible-image"),
    ).toHaveLength(1);

    // Soroban Domains: only tokenId 102589 visible (102510 hidden)
    const gridQuery2 = within(
      screen.queryAllByTestId("account-collection-grid")[1],
    );
    expect(
      gridQuery2.queryAllByTestId("account-collectible-image"),
    ).toHaveLength(1);
  });

  it("does not render a collection when all its collectibles are hidden", async () => {
    // Mock all collectibles in Future Monkeys collection as hidden
    mockGetHiddenCollectibles.mockResolvedValue({
      hiddenCollectibles: {
        "CCCFutureMonkeysCollection:111": "hidden",
      },
      error: "",
    });

    render(
      <Wrapper state={defaultState} routes={[ROUTES.account]}>
        <AccountCollectibles collections={mockCollectibles} />
      </Wrapper>,
    );

    // Wait for hidden collectibles to be applied and Future Monkeys to be removed
    await waitFor(() => {
      expect(screen.queryAllByTestId("account-collectible")).toHaveLength(2);
    });

    // Future Monkeys should not be visible
    expect(screen.queryByText("Future Monkeys")).toBeNull();
  });
});
