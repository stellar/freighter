import React from "react";
import {
  render,
  waitFor,
  screen,
  within,
  fireEvent,
} from "@testing-library/react";
import browser from "webextension-polyfill";

import * as ApiInternal from "@shared/api/internal";
import { CollectibleDetail } from "popup/components/account/CollectibleDetail";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { ROUTES } from "popup/constants/routes";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

import {
  Wrapper,
  mockAccounts,
  TEST_PUBLIC_KEY,
  mockCollectibles,
} from "../../__testHelpers__";
import { Collection } from "@shared/api/types/types";

jest.mock("webextension-polyfill", () => ({
  tabs: {
    create: jest.fn(),
  },
}));

const newTabSpy = jest
  .spyOn(browser.tabs, "create")
  // @ts-ignore
  .mockImplementation(() => Promise.resolve());

describe("CollectibleDetail", () => {
  it("renders collectible detail", async () => {
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
        }}
      >
        <CollectibleDetail
          selectedCollectible={{
            collectionAddress:
              "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            tokenId: "2",
          }}
          handleItemClose={() => {}}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("CollectibleDetail"));
    expect(screen.getByTestId("CollectibleDetail")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__image")).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__name"),
    ).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__collectionName"),
    ).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__tokenId"),
    ).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__description")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__attributes")).toBeDefined();
    expect(
      within(
        screen.getByTestId("CollectibleDetail__base-info__row__name"),
      ).getByTestId("CollectibleDetail__base-info__row__name__label")
        .textContent,
    ).toBe("Name");
    expect(
      within(
        screen.getByTestId("CollectibleDetail__base-info__row__name"),
      ).getByTestId("CollectibleDetail__base-info__row__name__value")
        .textContent,
    ).toBe("Stellar Frog 2");
    expect(
      within(
        screen.getByTestId("CollectibleDetail__base-info__row__collectionName"),
      ).getByTestId("CollectibleDetail__base-info__row__collectionName__label")
        .textContent,
    ).toBe("Collection");
    expect(
      within(
        screen.getByTestId("CollectibleDetail__base-info__row__collectionName"),
      ).getByTestId("CollectibleDetail__base-info__row__collectionName__value")
        .textContent,
    ).toBe("Stellar Frogs");
    expect(
      within(
        screen.getByTestId("CollectibleDetail__base-info__row__tokenId"),
      ).getByTestId("CollectibleDetail__base-info__row__tokenId__label")
        .textContent,
    ).toBe("Token ID");
    expect(
      within(
        screen.getByTestId("CollectibleDetail__base-info__row__tokenId"),
      ).getByTestId("CollectibleDetail__base-info__row__tokenId__value")
        .textContent,
    ).toBe("2");
    expect(
      within(screen.getByTestId("CollectibleDetail__description")).getByTestId(
        "CollectibleDetail__description__label",
      ).textContent,
    ).toBe("Description");
    expect(
      within(screen.getByTestId("CollectibleDetail__description")).getByTestId(
        "CollectibleDetail__description__value",
      ).textContent,
    ).toBe("This is a test frog");
    expect(
      within(screen.getByTestId("CollectibleDetail__attributes")).getByTestId(
        "CollectibleDetail__attributes__label",
      ).textContent,
    ).toBe("Collectible Traits");
    expect(
      within(screen.getByTestId("CollectibleDetail__attributes")).getByTestId(
        "CollectibleDetail__attribute__value",
      ).textContent,
    ).toBe("Red");
    expect(
      within(screen.getByTestId("CollectibleDetail__attributes")).getByTestId(
        "CollectibleDetail__attribute__trait",
      ).textContent,
    ).toBe("Background");
  });
  it("renders collectible detail with no metadata name", async () => {
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
                [TEST_PUBLIC_KEY]: [
                  {
                    collection: {
                      address:
                        "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                      name: "Stellar Frogs",
                      symbol: "SFROG",
                      collectibles: [
                        {
                          collectionName: "Stellar Frogs",
                          collectionAddress:
                            "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                          owner:
                            "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
                          tokenId: "2",
                          tokenUri: "https://nftcalendar.io/token/2",
                          metadata: {
                            description: "This is a test frog",
                            attributes: [
                              {
                                traitType: "Background",
                                value: "Red",
                              },
                            ],
                            image:
                              "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
                          },
                        },
                      ],
                    },
                  } as Collection,
                ],
              },
            },
          },
        }}
      >
        <CollectibleDetail
          selectedCollectible={{
            collectionAddress:
              "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            tokenId: "2",
          }}
          handleItemClose={() => {}}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("CollectibleDetail"));
    expect(screen.getByTestId("CollectibleDetail")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__image")).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__collectionName"),
    ).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__tokenId"),
    ).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__description")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__attributes")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__base-info")).toBeDefined();
    expect(
      within(
        screen.getByTestId("CollectibleDetail__base-info__row__name"),
      ).getByTestId("CollectibleDetail__base-info__row__name__label")
        .textContent,
    ).toBe("Name");
    expect(
      within(
        screen.getByTestId("CollectibleDetail__base-info__row__name"),
      ).getByTestId("CollectibleDetail__base-info__row__name__value")
        .textContent,
    ).toBe("Token #2");
  });
  it("renders collectible detail with no collection name", async () => {
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
                [TEST_PUBLIC_KEY]: [
                  {
                    collection: {
                      address:
                        "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                      name: "Stellar Frogs",
                      symbol: "SFROG",
                      collectibles: [
                        {
                          collectionAddress:
                            "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                          owner:
                            "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
                          tokenId: "2",
                          tokenUri: "https://nftcalendar.io/token/2",
                          metadata: {
                            name: "Stellar Frog 2",
                            description: "This is a test frog",
                            attributes: [
                              {
                                traitType: "Background",
                                value: "Red",
                              },
                            ],
                            image:
                              "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
                          },
                        },
                      ],
                    },
                  } as Collection,
                ],
              },
            },
          },
        }}
      >
        <CollectibleDetail
          selectedCollectible={{
            collectionAddress:
              "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            tokenId: "2",
          }}
          handleItemClose={() => {}}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("CollectibleDetail"));
    expect(screen.getByTestId("CollectibleDetail")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__image")).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__name"),
    ).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__tokenId"),
    ).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__description")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__attributes")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__base-info")).toBeDefined();

    expect(
      within(
        screen.getByTestId("CollectibleDetail__base-info__row__collectionName"),
      ).getByTestId("CollectibleDetail__base-info__row__collectionName__label")
        .textContent,
    ).toBe("Collection");
    expect(
      within(
        screen.getByTestId("CollectibleDetail__base-info__row__collectionName"),
      ).getByTestId("CollectibleDetail__base-info__row__collectionName__value")
        .textContent,
    ).toBe("Stellar Frogs");
  });
  it("renders collectible detail with no metadata description", async () => {
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
                [TEST_PUBLIC_KEY]: [
                  {
                    collection: {
                      address:
                        "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                      name: "Stellar Frogs",
                      symbol: "SFROG",
                      collectibles: [
                        {
                          collectionName: "Stellar Frogs",
                          collectionAddress:
                            "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                          owner:
                            "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
                          tokenId: "2",
                          tokenUri: "https://nftcalendar.io/token/2",
                          metadata: {
                            name: "Stellar Frog 2",
                            attributes: [
                              {
                                traitType: "Background",
                                value: "Red",
                              },
                            ],
                            image:
                              "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
                          },
                        },
                      ],
                    },
                  } as Collection,
                ],
              },
            },
          },
        }}
      >
        <CollectibleDetail
          selectedCollectible={{
            collectionAddress:
              "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            tokenId: "2",
          }}
          handleItemClose={() => {}}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("CollectibleDetail"));
    expect(screen.getByTestId("CollectibleDetail")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__image")).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__name"),
    ).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__tokenId"),
    ).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__collectionName"),
    ).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__attributes")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__base-info")).toBeDefined();
    expect(
      within(screen.getByTestId("CollectibleDetail__description")).getByTestId(
        "CollectibleDetail__description__label",
      ).textContent,
    ).toBe("Description");
    expect(
      within(screen.getByTestId("CollectibleDetail__description")).getByTestId(
        "CollectibleDetail__description__value",
      ).textContent,
    ).toBe("No description available");
  });
  it("renders collectible detail with no attributes", async () => {
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
                [TEST_PUBLIC_KEY]: [
                  {
                    collection: {
                      address:
                        "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                      name: "Stellar Frogs",
                      symbol: "SFROG",
                      collectibles: [
                        {
                          collectionName: "Stellar Frogs",
                          collectionAddress:
                            "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                          owner:
                            "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
                          tokenId: "2",
                          tokenUri: "https://nftcalendar.io/token/2",
                          metadata: {
                            name: "Stellar Frog 2",
                            description: "This is a test frog",
                            image:
                              "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
                          },
                        },
                      ],
                    },
                  } as Collection,
                ],
              },
            },
          },
        }}
      >
        <CollectibleDetail
          selectedCollectible={{
            collectionAddress:
              "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            tokenId: "2",
          }}
          handleItemClose={() => {}}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("CollectibleDetail"));
    expect(screen.getByTestId("CollectibleDetail")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__image")).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__name"),
    ).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__tokenId"),
    ).toBeDefined();
    expect(
      screen.getByTestId("CollectibleDetail__base-info__row__collectionName"),
    ).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__description")).toBeDefined();
    expect(screen.getByTestId("CollectibleDetail__base-info")).toBeDefined();
    expect(screen.queryByTestId("CollectibleDetail__attributes")).toBeNull();
  });
  it("views collectible in new tab", async () => {
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
        }}
      >
        <CollectibleDetail
          selectedCollectible={{
            collectionAddress:
              "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            tokenId: "2",
          }}
          handleItemClose={() => {}}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("CollectibleDetail"));
    await screen
      .getByTestId("CollectibleDetail__footer__buttons__view")
      .click();
    expect(newTabSpy).toHaveBeenCalledWith({
      url: "https://nftcalendar.io/external/2",
    });
  });
  it("shows 'This collectible is hidden' notification when isHidden is true", async () => {
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
        }}
      >
        <CollectibleDetail
          selectedCollectible={{
            collectionAddress:
              "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            tokenId: "2",
          }}
          handleItemClose={() => {}}
          isHidden={true}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("CollectibleDetail"));

    // Should show the hidden notification
    expect(screen.getByText("This collectible is hidden")).toBeDefined();
  });
  it("does not show hidden notification when isHidden is false", async () => {
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
        }}
      >
        <CollectibleDetail
          selectedCollectible={{
            collectionAddress:
              "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            tokenId: "2",
          }}
          handleItemClose={() => {}}
          isHidden={false}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("CollectibleDetail"));

    // Should not show the hidden notification
    expect(screen.queryByText("This collectible is hidden")).toBeNull();
  });
  it("renders menu button for hide/show functionality", async () => {
    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
        }}
      >
        <CollectibleDetail
          selectedCollectible={{
            collectionAddress:
              "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            tokenId: "2",
          }}
          handleItemClose={() => {}}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("CollectibleDetail"));

    // Should have the menu button for additional actions
    expect(
      screen.getByTestId("CollectibleDetail__header__right-button"),
    ).toBeDefined();
  });

  it("removes a collectible straight from the overflow menu", async () => {
    const removeCollectible = jest
      .spyOn(ApiInternal, "removeCollectible")
      .mockResolvedValue({ error: "", collectiblesList: [] } as any);
    // Remove is only offered for collectibles this wallet tracks.
    jest.spyOn(ApiInternal, "getCollectibles").mockResolvedValue({
      error: "",
      collectiblesList: [
        {
          id: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
          tokenIds: ["2"],
        },
      ],
    } as any);
    const handleItemClose = jest.fn();

    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
        }}
      >
        <CollectibleDetail
          selectedCollectible={{
            collectionAddress:
              "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            tokenId: "2",
          }}
          handleItemClose={handleItemClose}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("CollectibleDetail"));

    // The test id is on the wrapper; the Radix trigger is the child, and a
    // click on the parent does not reach it.
    fireEvent.click(
      document.querySelector(
        ".CollectibleDetail__header__right-button__trigger",
      ) as Element,
    );
    // The designs specify no confirmation step: Remove deletes outright. It is
    // a local delete, not an on-chain operation, so there is no transaction
    // review to route through either (unlike removing a token).
    fireEvent.click(await screen.findByTestId("CollectibleDetail__remove"));

    await waitFor(() =>
      expect(removeCollectible).toHaveBeenCalledWith(
        expect.objectContaining({
          collectibleContractAddress:
            "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
          collectibleTokenId: "2",
        }),
      ),
    );
    await waitFor(() => expect(handleItemClose).toHaveBeenCalled());
  });

  it("hides Remove for a collectible the wallet does not track", async () => {
    // The backend also returns special-cased collectibles (Meridian Pay and
    // the like) that were never added here. Nothing in COLLECTIBLES_ID
    // corresponds to them, so Remove would always fail -- Hide is the action
    // that works.
    jest
      .spyOn(ApiInternal, "getCollectibles")
      .mockResolvedValue({ error: "", collectiblesList: [] } as any);

    render(
      <Wrapper
        routes={[ROUTES.account]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
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
        }}
      >
        <CollectibleDetail
          selectedCollectible={{
            collectionAddress:
              "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            tokenId: "2",
          }}
          handleItemClose={() => {}}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("CollectibleDetail"));

    fireEvent.click(
      document.querySelector(
        ".CollectibleDetail__header__right-button__trigger",
      ) as Element,
    );

    // The rest of the menu is still there.
    expect(await screen.findByText("Hide collectible")).toBeInTheDocument();
    expect(
      screen.queryByTestId("CollectibleDetail__remove"),
    ).not.toBeInTheDocument();
  });
});
