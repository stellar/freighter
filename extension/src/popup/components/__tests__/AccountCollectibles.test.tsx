import React from "react";
import { render, waitFor, screen, within } from "@testing-library/react";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { AccountCollectibles } from "popup/components/account/AccountCollectibles";
import { mockAccounts, mockCollectibles, Wrapper } from "../../__testHelpers__";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { ROUTES } from "popup/constants/routes";

describe("AccountCollectibles", () => {
  it("renders collectibles", async () => {
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            isHideDustEnabled: false,
          },
          cache: {
            balanceData: {
              [TESTNET_NETWORK_DETAILS.network]: {
                G1: {
                  balances: {},
                },
              },
            },
            icons: {},
            homeDomains: {},
            tokenLists: [],
            tokenDetails: {},
            historyData: {},
            tokenPrices: {},
            collections: {},
          },
        }}
      >
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
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            isHideDustEnabled: false,
          },
          cache: {
            balanceData: {
              [TESTNET_NETWORK_DETAILS.network]: {
                G1: {
                  balances: {},
                },
              },
            },
            icons: {},
            homeDomains: {},
            tokenLists: [],
            tokenDetails: {},
            historyData: {},
            tokenPrices: {},
            collections: {},
          },
        }}
      >
        <AccountCollectibles collections={[]} />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("account-collectibles"));
    expect(screen.getByTestId("account-collectibles")).toBeDefined();
    expect(screen.getByText("No collectibles yet")).toBeDefined();
  });
  it("renders error state", async () => {
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            isHideDustEnabled: false,
          },
          cache: {
            balanceData: {
              [TESTNET_NETWORK_DETAILS.network]: {
                G1: {
                  balances: {},
                },
              },
            },
            icons: {},
            homeDomains: {},
            tokenLists: [],
            tokenDetails: {},
            historyData: {},
            tokenPrices: {},
            collections: {},
          },
        }}
      >
        <AccountCollectibles
          collections={[
            { error: { collectionAddress: "test", errorMessage: "test" } },
          ]}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("account-collectibles"));
    expect(screen.getByTestId("account-collectibles")).toBeDefined();
    expect(screen.getByText("No collectibles yet")).toBeDefined();
  });
  it("renders some collectibles and omits the ones with an error", async () => {
    const partialMockCollectibles = [
      { error: { collectionAddress: "test", errorMessage: "test" } },
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
              owner: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
              owner: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
              owner: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            isHideDustEnabled: false,
          },
          cache: {
            balanceData: {
              [TESTNET_NETWORK_DETAILS.network]: {
                G1: {
                  balances: {},
                },
              },
            },
            icons: {},
            homeDomains: {},
            tokenLists: [],
            tokenDetails: {},
            historyData: {},
            tokenPrices: {},
            collections: {},
          },
        }}
      >
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
});
