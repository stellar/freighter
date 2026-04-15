import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import * as UseGetAddCollectiblesData from "../AddCollectibles/hooks/useGetAddCollectiblesData";
import * as fetchCollectiblesModule from "@shared/api/helpers/fetchCollectibles";
import * as useGetCollectiblesModule from "helpers/hooks/useGetCollectibles";

import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { Wrapper, mockAccounts } from "popup/__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import { AddCollectibles } from "../AddCollectibles";
import { RequestState } from "../AddCollectibles/hooks/useGetAddCollectiblesData";

describe("AddCollectibles", () => {
  jest
    .spyOn(UseGetAddCollectiblesData, "useGetAddCollectiblesData")
    .mockImplementation(
      () =>
        ({
          state: { collections: [] },
          fetchData: () =>
            Promise.resolve({
              state: RequestState.SUCCESS,
              collections: [],
              publicKey:
                "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
              networkDetails: TESTNET_NETWORK_DETAILS,
              applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            }),
        }) as any,
    );
  it("renders", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
            hiddenAssets: {},
          },
        }}
      >
        <AddCollectibles />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("AddCollectibles")).toBeInTheDocument();
      expect(
        screen.getByTestId("collectibleContractAddress"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("collectibleTokenId")).toBeInTheDocument();
      expect(screen.getByTestId("AddCollectibles__button")).toBeInTheDocument();
    });
  });
  it("shows error message if collectible address is not provided", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
            hiddenAssets: {},
          },
        }}
      >
        <AddCollectibles />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("AddCollectibles")).toBeInTheDocument();
      const collectibleAddressInput = screen.getByTestId(
        "collectibleContractAddress",
      );

      fireEvent.blur(collectibleAddressInput);
      fireEvent.click(screen.getByTestId("AddCollectibles__button"));
      expect(
        screen.getByTestId("collectible-address-wrapper"),
      ).toHaveTextContent("Collection address is required");
    });
  });
  it("shows error message if collectible address is invalid", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
            hiddenAssets: {},
          },
        }}
      >
        <AddCollectibles />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("AddCollectibles")).toBeInTheDocument();
      const collectibleAddressInput = screen.getByTestId(
        "collectibleContractAddress",
      );
      fireEvent.change(collectibleAddressInput, {
        target: { value: "invalid" },
      });
      fireEvent.click(screen.getByTestId("AddCollectibles__button"));
      expect(
        screen.getByTestId("collectible-address-wrapper"),
      ).toHaveTextContent("Invalid address");
    });
  });
  it("shows error message if token id is not provided", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
            hiddenAssets: {},
          },
        }}
      >
        <AddCollectibles />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("AddCollectibles")).toBeInTheDocument();
      const collectibleTokenIdInput = screen.getByTestId("collectibleTokenId");
      fireEvent.blur(collectibleTokenIdInput);
      fireEvent.click(screen.getByTestId("AddCollectibles__button"));
      expect(
        screen.getByTestId("collectible-token-id-wrapper"),
      ).toHaveTextContent("Token ID is required");
    });
  });
  it("shows error message if token id is invalid", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
            hiddenAssets: {},
          },
        }}
      >
        <AddCollectibles />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("AddCollectibles")).toBeInTheDocument();
      const collectibleTokenIdInput = screen.getByTestId("collectibleTokenId");
      fireEvent.change(collectibleTokenIdInput, {
        target: { value: " " },
      });
      fireEvent.click(screen.getByTestId("AddCollectibles__button"));
      expect(
        screen.getByTestId("collectible-token-id-wrapper"),
      ).toHaveTextContent("Token ID cannot contain spaces");
    });
  });
  it("shows 'Collectible not found' error when fetchedCollectibles returns an error", async () => {
    jest.spyOn(fetchCollectiblesModule, "fetchCollectibles").mockResolvedValue([
      {
        error: "Error 1",
        collectionAddress:
          "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
        errorMessage:
          "no collectibles fetched for contract CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
      },
      { collection: { address: "C1" } },
      {
        error: "Error 2",
        collectionAddress: "C2",
        errorMessage: "Another error message",
      },
    ] as any);

    jest.spyOn(useGetCollectiblesModule, "useGetCollectibles").mockReturnValue({
      fetchData: jest.fn().mockResolvedValue({}),
    } as any);

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
            hiddenAssets: {},
          },
        }}
      >
        <AddCollectibles />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("AddCollectibles")).toBeInTheDocument();
    });

    const collectibleAddressInput = screen.getByTestId(
      "collectibleContractAddress",
    ) as HTMLInputElement;
    const collectibleTokenIdInput = screen.getByTestId(
      "collectibleTokenId",
    ) as HTMLInputElement;

    fireEvent.change(collectibleAddressInput, {
      target: {
        value: "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
      },
    });
    fireEvent.change(collectibleTokenIdInput, {
      target: { value: "123" },
    });

    const addButton = screen.getByTestId("AddCollectibles__button");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Collectible not found")).toBeInTheDocument();
    });
  });
  it("shows 'Collectible not found' error when token ID is not found in collection.collectibles", async () => {
    jest.spyOn(fetchCollectiblesModule, "fetchCollectibles").mockResolvedValue([
      {
        collection: {
          address: "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
          collectibles: [{ tokenId: "100" }, { tokenId: "200" }],
        },
      },
    ] as any);

    jest.spyOn(useGetCollectiblesModule, "useGetCollectibles").mockReturnValue({
      fetchData: jest.fn().mockResolvedValue({}),
    } as any);

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
            hiddenAssets: {},
          },
        }}
      >
        <AddCollectibles />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("AddCollectibles")).toBeInTheDocument();
    });

    const collectibleAddressInput = screen.getByTestId(
      "collectibleContractAddress",
    ) as HTMLInputElement;
    const collectibleTokenIdInput = screen.getByTestId(
      "collectibleTokenId",
    ) as HTMLInputElement;

    fireEvent.change(collectibleAddressInput, {
      target: {
        value: "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
      },
    });
    fireEvent.change(collectibleTokenIdInput, {
      target: { value: "999" },
    });

    const addButton = screen.getByTestId("AddCollectibles__button");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Collectible not found")).toBeInTheDocument();
    });
  });
  it("shows 'Collectible not found' error when contract address does not match any collection", async () => {
    jest.spyOn(fetchCollectiblesModule, "fetchCollectibles").mockResolvedValue([
      {
        collection: {
          address: "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
          collectibles: [{ tokenId: "100" }],
        },
      },
    ] as any);

    jest.spyOn(useGetCollectiblesModule, "useGetCollectibles").mockReturnValue({
      fetchData: jest.fn().mockResolvedValue({}),
    } as any);

    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
            hiddenAssets: {},
          },
        }}
      >
        <AddCollectibles />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("AddCollectibles")).toBeInTheDocument();
    });

    const collectibleAddressInput = screen.getByTestId(
      "collectibleContractAddress",
    ) as HTMLInputElement;
    const collectibleTokenIdInput = screen.getByTestId(
      "collectibleTokenId",
    ) as HTMLInputElement;

    fireEvent.change(collectibleAddressInput, {
      target: {
        value: "CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
      },
    });
    fireEvent.change(collectibleTokenIdInput, {
      target: { value: "100" },
    });

    const addButton = screen.getByTestId("AddCollectibles__button");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Collectible not found")).toBeInTheDocument();
    });
  });
});
