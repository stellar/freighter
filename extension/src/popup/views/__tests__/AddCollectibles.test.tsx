import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import * as UseGetAddCollectiblesData from "../AddCollectibles/hooks/useGetAddCollectiblesData";

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
});
