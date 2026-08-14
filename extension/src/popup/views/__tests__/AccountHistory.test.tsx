import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";

import { CUSTOM_NETWORK } from "@shared/helpers/stellar";
import {
  FUTURENET_NETWORK_DETAILS,
  NetworkDetails,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { makeDummyStore } from "popup/__testHelpers__";
import { AccountHistory } from "../AccountHistory";

jest.mock("popup/views/AccountHistory/AccountHistoryV2", () => ({
  AccountHistoryV2: () => <div data-testid="history-v2" />,
}));

jest.mock("popup/views/AccountHistory/AccountHistoryLegacy", () => ({
  AccountHistoryLegacy: () => <div data-testid="history-legacy" />,
}));

jest.mock("popup/components/Loading", () => ({
  Loading: () => <div data-testid="loading" />,
}));

// A user-added network keeps its own URLs but is stamped with CUSTOM_NETWORK
// (see manageNetwork/NetworkForm). The passphrase is deliberately left as
// testnet's to prove the routing keys off `network`, not the passphrase.
const CUSTOM_NETWORK_DETAILS: NetworkDetails = {
  ...TESTNET_NETWORK_DETAILS,
  network: CUSTOM_NETWORK,
  networkName: "Custom",
  networkUrl: "http://localhost:8000",
};

// Preload remoteConfig directly rather than dispatching fetchFeatureFlags:
// `isDev` is true under jest, so the thunk's no-client branch would resolve
// use_history_v2 to true regardless of what a case is trying to assert.
const renderShell = ({
  isInitialized,
  use_history_v2,
  networkDetails = TESTNET_NETWORK_DETAILS,
}: {
  isInitialized: boolean;
  use_history_v2: boolean;
  networkDetails?: NetworkDetails;
}) =>
  render(
    <Provider
      store={makeDummyStore({
        remoteConfig: { isInitialized, use_history_v2 },
        settings: { networkDetails },
      })}
    >
      <AccountHistory />
    </Provider>,
  );

describe("AccountHistory — history version routing", () => {
  it("waits for the flags to resolve before mounting either view", () => {
    renderShell({ isInitialized: false, use_history_v2: false });

    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.queryByTestId("history-legacy")).toBeNull();
    expect(screen.queryByTestId("history-v2")).toBeNull();
  });

  it("mounts the redesigned history when use_history_v2 is on", () => {
    renderShell({ isInitialized: true, use_history_v2: true });

    expect(screen.getByTestId("history-v2")).toBeInTheDocument();
    expect(screen.queryByTestId("history-legacy")).toBeNull();
  });

  it("mounts the legacy history when use_history_v2 is off", () => {
    renderShell({ isInitialized: true, use_history_v2: false });

    expect(screen.getByTestId("history-legacy")).toBeInTheDocument();
    expect(screen.queryByTestId("history-v2")).toBeNull();
  });

  // The v2 backend only indexes pubnet and testnet, and the legacy view reads
  // Horizon/RPC directly, so custom networks take the v1 path either way —
  // even this one, whose passphrase (testnet's) the v2 backend could answer
  // for: the user pointed the wallet at their own Horizon, so serve THAT.
  it("mounts the legacy history on a custom network even with the flag on", () => {
    renderShell({
      isInitialized: true,
      use_history_v2: true,
      networkDetails: CUSTOM_NETWORK_DETAILS,
    });

    expect(screen.getByTestId("history-legacy")).toBeInTheDocument();
    expect(screen.queryByTestId("history-v2")).toBeNull();
  });

  // Regression: Futurenet is a built-in network (network !== CUSTOM_NETWORK),
  // so an isCustomNetwork-only gate routed it to AccountHistoryV2 — where
  // getAccountHistoryV2 throws for any passphrase outside
  // PASSPHRASE_TO_V2_NETWORK and history permanently errored. Anything the v2
  // backend does not serve must fall back to legacy, custom or not.
  it("mounts the legacy history on Futurenet even with the flag on", () => {
    renderShell({
      isInitialized: true,
      use_history_v2: true,
      networkDetails: FUTURENET_NETWORK_DETAILS,
    });

    expect(screen.getByTestId("history-legacy")).toBeInTheDocument();
    expect(screen.queryByTestId("history-v2")).toBeNull();
  });
});
