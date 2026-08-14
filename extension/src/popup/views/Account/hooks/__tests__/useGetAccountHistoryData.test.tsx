import React from "react";
import { renderHook, act } from "@testing-library/react";
import { Provider } from "react-redux";

import { getAccountHistoryV2 } from "@shared/api/internal";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { mapV2Page } from "popup/helpers/history/mapPage";
import { makeDummyStore } from "popup/__testHelpers__";
import {
  MAINNET_NETWORK_DETAILS,
  FUTURENET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { useGetAccountHistoryData } from "../useGetAccountHistoryData";

const PUBLIC_KEY = "GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR";

// The app-data resolution is not under test — resolve it to a fixed target.
// The network is swapped per test via mockAppNetworkDetails.
let mockAppNetworkDetails = MAINNET_NETWORK_DETAILS;
jest.mock("helpers/hooks/useGetAppData", () => {
  const actual = jest.requireActual("helpers/hooks/useGetAppData");
  return {
    ...actual,
    useGetAppData: () => ({
      fetchData: jest.fn(async () => ({
        type: actual.AppDataType.RESOLVED,
        account: {
          publicKey: PUBLIC_KEY,
          applicationState: "MNEMONIC_PHRASE_CONFIRMED",
        },
        settings: { networkDetails: mockAppNetworkDetails },
      })),
    }),
  };
});

// The v1 fetch — the thing the home screen must NOT call when v2 governs.
const mockFetchV1History = jest.fn(async () => []);
jest.mock("helpers/hooks/useGetHistory", () => ({
  useGetHistory: () => ({ fetchData: mockFetchV1History }),
}));

jest.mock("helpers/hooks/useTokenDetails", () => ({
  useTokenDetails: () => ({ fetchData: jest.fn() }),
}));

// v1 grouping is not under test either
jest.mock("popup/helpers/account", () => ({
  ...jest.requireActual("popup/helpers/account"),
  sortOperationsByAsset: jest.fn(async () => ({})),
}));

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getAccountHistoryV2: jest.fn(async () => ({
    data: [],
    pagination: {
      next_cursor: null,
      prev_cursor: null,
      has_next: false,
      has_previous: false,
    },
  })),
}));

// buildTokenContext inside mapV2Page makes network calls — canned entries
// stand in; the mapping pipeline has its own suites.
const CANNED_ENTRY = { id: "tx-1" };
jest.mock("popup/helpers/history/mapPage", () => ({
  mapV2Page: jest.fn(async () => [CANNED_ENTRY]),
}));

const BALANCES = { balances: {}, icons: {} } as unknown as AccountBalances;

const renderHistoryHook = ({ use_history_v2 }: { use_history_v2: boolean }) => {
  const store = makeDummyStore({
    remoteConfig: { isInitialized: true, use_history_v2 },
    cache: { homeDomains: {}, tokensLists: {} },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useGetAccountHistoryData(), { wrapper });
};

describe("useGetAccountHistoryData — history version gating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppNetworkDetails = MAINNET_NETWORK_DETAILS;
  });

  it("fetches v2 — and never v1 — when the flag is on and the network is servable", async () => {
    const { result } = renderHistoryHook({ use_history_v2: true });

    let payload: unknown;
    await act(async () => {
      payload = await result.current.fetchData({ balances: BALANCES });
    });

    // The home screen used to call v1 unconditionally, disagreeing with the
    // History view about the same transactions whenever the flag was on.
    expect(getAccountHistoryV2).toHaveBeenCalledWith(
      PUBLIC_KEY,
      MAINNET_NETWORK_DETAILS,
      expect.objectContaining({ limit: expect.any(Number) }),
    );
    expect(mockFetchV1History).not.toHaveBeenCalled();
    expect(mapV2Page).toHaveBeenCalled();
    expect(payload).toEqual(
      expect.objectContaining({
        type: AppDataType.RESOLVED,
        historyEntries: [CANNED_ENTRY],
        operationsByAsset: null,
      }),
    );
  });

  it("fetches v1 when the flag is off", async () => {
    const { result } = renderHistoryHook({ use_history_v2: false });

    let payload: unknown;
    await act(async () => {
      payload = await result.current.fetchData({ balances: BALANCES });
    });

    expect(mockFetchV1History).toHaveBeenCalled();
    expect(getAccountHistoryV2).not.toHaveBeenCalled();
    expect(payload).toEqual(expect.objectContaining({ historyEntries: null }));
  });

  it("stays on v1 for a network the v2 backend cannot serve, even with the flag on", async () => {
    mockAppNetworkDetails = FUTURENET_NETWORK_DETAILS;
    const { result } = renderHistoryHook({ use_history_v2: true });

    await act(async () => {
      await result.current.fetchData({ balances: BALANCES });
    });

    // Same isHistoryV2Servable gate as the History view's router — v2 would
    // throw for Futurenet.
    expect(mockFetchV1History).toHaveBeenCalled();
    expect(getAccountHistoryV2).not.toHaveBeenCalled();
  });
});
