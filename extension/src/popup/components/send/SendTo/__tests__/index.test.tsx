import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { makeDummyStore } from "popup/__testHelpers__";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { SendTo } from "../index";

const mockResolveSorobanDomain = jest.fn();
jest.mock("popup/helpers/sorobanDomains", () => ({
  resolveSorobanDomain: (...args: unknown[]) => mockResolveSorobanDomain(...args),
}));

// Mutable so the "non-Mainnet" test below can swap in a Testnet passphrase
// without a second module mock. Referenced only via its "mock"-prefixed name
// inside the jest.mock() factory, which is exempted from the hoisting
// out-of-scope-variable check.
const mockNetworkDetails = {
  network: "PUBLIC",
  networkName: "Main Net",
  networkUrl: "https://horizon.stellar.org",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  sorobanRpcUrl: "https://mainnet-rpc.example.com",
};

jest.mock("helpers/hooks/useGetAppData", () => ({
  ...jest.requireActual("helpers/hooks/useGetAppData"),
  useGetAppData: () => ({
    fetchData: jest.fn().mockResolvedValue({
      type: "RESOLVED",
      account: {
        publicKey: "GACTIVEACCOUNT00000000000000000000000000000000000000000",
        // Can't reference the top-level `APPLICATION_STATE` import here - it's
        // out of scope inside a jest.mock() factory (hoisting restriction).
        // "MNEMONIC_PHRASE_CONFIRMED" is that enum member's literal value.
        applicationState: "MNEMONIC_PHRASE_CONFIRMED",
      },
      settings: {
        networkDetails: mockNetworkDetails,
      },
    }),
  }),
}));

jest.mock("helpers/hooks/useGetBalances", () => ({
  useGetBalances: () => ({
    fetchData: jest.fn().mockResolvedValue({ isFunded: true }),
  }),
}));

jest.mock("@shared/api/internal", () => ({
  loadRecentAddresses: jest.fn().mockResolvedValue({ recentAddresses: [] }),
}));

const renderSendTo = () => {
  const store = makeDummyStore({
    auth: {
      allAccounts: [
        {
          publicKey: "GACTIVEACCOUNT00000000000000000000000000000000000000000",
        },
      ],
      publicKey: "GACTIVEACCOUNT00000000000000000000000000000000000000000",
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <SendTo goBack={jest.fn()} goToNext={jest.fn()} />
      </MemoryRouter>
    </Provider>,
  );
};

describe("SendTo - Soroban Domain input", () => {
  beforeEach(() => {
    mockResolveSorobanDomain.mockReset();
    mockNetworkDetails.network = "PUBLIC";
    mockNetworkDetails.networkPassphrase =
      "Public Global Stellar Network ; September 2015";
  });

  it("resolves a domain typed into the destination field and shows a suggestion", async () => {
    mockResolveSorobanDomain.mockResolvedValue({
      address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      domain: "jhon.xlm",
    });

    renderSendTo();
    const input = await screen.findByTestId("send-to-input");
    await userEvent.type(input, "jhon.xlm");

    await waitFor(
      () => {
        expect(
          screen.getByTestId("send-to-suggestion-button"),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("shows the generic error banner when the domain fails to resolve", async () => {
    mockResolveSorobanDomain.mockRejectedValue(
      new Error("Failed to resolve Soroban Domain"),
    );

    renderSendTo();
    const input = await screen.findByTestId("send-to-input");
    await userEvent.type(input, "nope.xlm");

    await waitFor(
      () => {
        expect(
          screen.getByText("Failed to resolve Soroban Domain"),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("shows the Mainnet-only error when typing a domain on a non-Mainnet network", async () => {
    mockNetworkDetails.network = "TESTNET";
    mockNetworkDetails.networkPassphrase =
      "Test SDF Network ; September 2015";

    renderSendTo();
    const input = await screen.findByTestId("send-to-input");
    await userEvent.type(input, "jhon.xlm");

    await waitFor(
      () => {
        expect(
          screen.getByText("Soroban Domains is only available on Mainnet"),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // getAddressFromInput throws before ever calling resolveSorobanDomain.
    expect(mockResolveSorobanDomain).not.toHaveBeenCalled();
  });
});
