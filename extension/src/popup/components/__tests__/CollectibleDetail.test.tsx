import React from "react";
import { render, waitFor, screen, within } from "@testing-library/react";
import browser from "webextension-polyfill";

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
      screen.queryByTestId("CollectibleDetail__base-info__row__name"),
    ).toBeNull();
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
      screen.queryByTestId("CollectibleDetail__base-info__row__collectionName"),
    ).toBeNull();
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
      screen.queryByTestId("CollectibleDetail__base-info__row__description"),
    ).toBeNull();
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
});
