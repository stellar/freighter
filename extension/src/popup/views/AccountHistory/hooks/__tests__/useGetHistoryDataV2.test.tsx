import React from "react";
import { Provider } from "react-redux";
import { renderHook, act, waitFor } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import {
  MOCK_SELF,
  MOCK_XLM_SAC,
  mockHistoryTransactions,
  mockFetchAccountHistoryV2,
} from "@shared/api/fixtures/history-v2";
import {
  MOCK_ACCOUNT_2,
  mockPaymentReceived,
} from "@shared/api/fixtures/history-v2-scenarios";
import { V2AccountTransaction } from "@shared/api/types/backend-api";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { ROUTES } from "popup/constants/routes";
import { makeDummyStore } from "popup/__testHelpers__";

import {
  useGetHistoryDataV2,
  ResolvedHistoryV2,
  HistoryDataV2,
} from "../useGetHistoryDataV2";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockFetchAppData = jest.fn();
const mockFetchBalances = jest.fn();

jest.mock("helpers/hooks/useGetAppData", () => ({
  ...jest.requireActual("helpers/hooks/useGetAppData"),
  useGetAppData: () => ({ fetchData: mockFetchAppData }),
}));

jest.mock("helpers/hooks/useGetBalances", () => ({
  ...jest.requireActual("helpers/hooks/useGetBalances"),
  useGetBalances: () => ({ fetchData: mockFetchBalances }),
}));

// Keep the native token id aligned with the fixtures so classification and the
// dust filter behave as the mapper tests expect.
jest.mock("popup/helpers/searchAsset", () => {
  const actual = jest.requireActual("popup/helpers/searchAsset");
  const { MOCK_XLM_SAC } = jest.requireActual(
    "@shared/api/fixtures/history-v2",
  );
  return {
    ...actual,
    getNativeContractDetails: () => ({ contract: MOCK_XLM_SAC }),
  };
});

// Skip real (network-bound) token resolution — the mappers own that logic.
jest.mock("popup/helpers/history/tokenResolver", () => {
  const actual = jest.requireActual("popup/helpers/history/tokenResolver");
  const { MOCK_XLM_SAC, MOCK_YUSDC_SAC, MOCK_BLND_SAC, MOCK_CETES_SAC } =
    jest.requireActual("@shared/api/fixtures/history-v2");
  const { MOCK_USDC_SAC, MOCK_EURC_SAC } = jest.requireActual(
    "@shared/api/fixtures/history-v2-scenarios",
  );
  const token = (code: string, contractId: string) => ({
    code,
    contractId,
    issuer: null,
    icon: null,
    decimals: 7,
  });
  return {
    ...actual,
    buildTokenContext: () =>
      Promise.resolve(
        new Map([
          [MOCK_XLM_SAC, token("XLM", MOCK_XLM_SAC)],
          [MOCK_YUSDC_SAC, token("yUSDC", MOCK_YUSDC_SAC)],
          [MOCK_BLND_SAC, token("BLND", MOCK_BLND_SAC)],
          [MOCK_CETES_SAC, token("CETES", MOCK_CETES_SAC)],
          [MOCK_USDC_SAC, token("USDC", MOCK_USDC_SAC)],
          [MOCK_EURC_SAC, token("EURC", MOCK_EURC_SAC)],
        ]),
      ),
  };
});

// ── Fixtures / helpers ───────────────────────────────────────────────────────

const RESOLVED_APP_DATA = {
  type: AppDataType.RESOLVED,
  account: {
    publicKey: MOCK_SELF,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  },
  settings: { networkDetails: TESTNET_NETWORK_DETAILS },
};

const RESOLVED_BALANCES = {
  balances: [],
  isFunded: true,
  subentryCount: 0,
};

const preloadedState = {
  auth: {
    publicKey: MOCK_SELF,
    hasPrivateKey: true,
    allAccounts: [{ publicKey: MOCK_SELF }],
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  },
  cache: { tokenLists: [] },
  settings: { assetsLists: [], networkDetails: TESTNET_NETWORK_DETAILS },
  remoteConfig: { use_history_v2: true, isInitialized: true },
};

const renderV2Hook = (
  { isHideDustEnabled = false, pageSize = 10 } = {},
  state = preloadedState,
) => {
  const store = makeDummyStore(state);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(
    () => useGetHistoryDataV2({ isHideDustEnabled, pageSize }),
    { wrapper },
  );
};

const asResolved = (data: HistoryDataV2 | null): ResolvedHistoryV2 =>
  data as ResolvedHistoryV2;

const countEntries = (data: HistoryDataV2 | null) =>
  asResolved(data).sections.reduce((n, s) => n + s.entries.length, 0);

const nativeDustTx: V2AccountTransaction = {
  hash: "dusttxhash",
  fee_charged: "0",
  result_code: "tx_success",
  ledger_number: 60_000_000,
  ledger_created_at: "2024-05-01T00:00:00Z",
  is_fee_bump: false,
  ingested_at: "2024-05-01T00:00:01Z",
  operations: [],
  state_changes: [
    {
      variant: "BalanceChange",
      type: "BALANCE",
      reason: "CREDIT",
      token_id: MOCK_XLM_SAC,
      amount: "500000", // 0.05 XLM ≤ 0.1 dust threshold
      ledger_number: 60_000_000,
      ledger_created_at: "2024-05-01T00:00:00Z",
      ingested_at: "2024-05-01T00:00:01Z",
    },
  ],
};

beforeEach(() => {
  mockFetchAppData.mockResolvedValue(RESOLVED_APP_DATA);
  mockFetchBalances.mockResolvedValue(RESOLVED_BALANCES);
  jest
    .spyOn(ApiInternal, "getAccountHistoryWithFlag")
    .mockImplementation(
      async (_publicKey, _networkDetails, _useV2, params = {}) => ({
        version: "v2",
        page: await mockFetchAccountHistoryV2({
          limit: params.limit,
          cursor: params.cursor,
        }),
      }),
    );
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useGetHistoryDataV2 — initial fetch", () => {
  it("resolves the first page into month-grouped, non-fallback sections", async () => {
    const { result } = renderV2Hook({ pageSize: 10 });

    await act(async () => {
      await result.current.fetchData();
    });

    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    const data = asResolved(result.current.state.data);
    expect(data.type).toBe(AppDataType.RESOLVED);
    expect(data.fallbackToV1).toBe(false);
    expect(data.publicKey).toBe(MOCK_SELF);
    expect(countEntries(data)).toBe(10);
    expect(data.hasNextPage).toBe(true);
    // sections are keyed "{month}:{year}" and hold entries
    expect(data.sections.length).toBeGreaterThan(0);
    data.sections.forEach((section) => {
      expect(section.monthYear).toMatch(/^\d+:\d+$/);
      expect(section.entries.length).toBeGreaterThan(0);
    });
  });

  it("reads use_history_v2 from the store and forwards it to the router", async () => {
    const spy = jest.spyOn(ApiInternal, "getAccountHistoryWithFlag");
    const { result } = renderV2Hook({ pageSize: 10 });

    await act(async () => {
      await result.current.fetchData();
    });

    expect(spy).toHaveBeenCalledWith(MOCK_SELF, TESTNET_NETWORK_DETAILS, true, {
      limit: 10,
    });
  });

  it("groups a full single page into month sections", async () => {
    const { result } = renderV2Hook({ pageSize: 100 });

    await act(async () => {
      await result.current.fetchData();
    });

    expect(countEntries(result.current.state.data)).toBe(
      mockHistoryTransactions.length,
    );
    expect(asResolved(result.current.state.data).hasNextPage).toBe(false);
  });
});

describe("useGetHistoryDataV2 — pagination", () => {
  it("appends the next page and advances hasNextPage", async () => {
    const { result } = renderV2Hook({ pageSize: 10 });

    await act(async () => {
      await result.current.fetchData();
    });
    expect(countEntries(result.current.state.data)).toBe(10);
    expect(asResolved(result.current.state.data).hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(countEntries(result.current.state.data)).toBe(20);
    expect(asResolved(result.current.state.data).hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    // the remaining fixtures land on the last page, then no more pages
    expect(countEntries(result.current.state.data)).toBe(
      mockHistoryTransactions.length,
    );
    expect(asResolved(result.current.state.data).hasNextPage).toBe(false);
  });

  it("is a no-op when there is no next cursor", async () => {
    const spy = jest.spyOn(ApiInternal, "getAccountHistoryWithFlag");
    const { result } = renderV2Hook({ pageSize: 100 });

    await act(async () => {
      await result.current.fetchData();
    });
    expect(spy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    // no cursor after a single full page → the router isn't hit again
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("keeps the current list when a page fetch fails", async () => {
    const { result } = renderV2Hook({ pageSize: 10 });

    await act(async () => {
      await result.current.fetchData();
    });
    const before = countEntries(result.current.state.data);

    jest
      .spyOn(ApiInternal, "getAccountHistoryWithFlag")
      .mockRejectedValueOnce(new Error("network"));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(result.current.state.state).toBe<RequestState>(RequestState.SUCCESS);
    expect(countEntries(result.current.state.data)).toBe(before);
  });
});

describe("useGetHistoryDataV2 — dust filter", () => {
  const pageWithDust = async () => ({
    version: "v2" as const,
    page: {
      data: [nativeDustTx, mockPaymentReceived],
      pagination: {
        next_cursor: null,
        prev_cursor: null,
        has_next: false,
        has_previous: false,
      },
    },
  });

  it("keeps native dust when hide-dust is off", async () => {
    jest
      .spyOn(ApiInternal, "getAccountHistoryWithFlag")
      .mockImplementation(pageWithDust);
    const { result } = renderV2Hook({ isHideDustEnabled: false });

    await act(async () => {
      await result.current.fetchData();
    });

    expect(countEntries(result.current.state.data)).toBe(2);
  });

  it("removes native dust when hide-dust is on", async () => {
    jest
      .spyOn(ApiInternal, "getAccountHistoryWithFlag")
      .mockImplementation(pageWithDust);
    const { result } = renderV2Hook({ isHideDustEnabled: true });

    await act(async () => {
      await result.current.fetchData();
    });

    expect(countEntries(result.current.state.data)).toBe(1);
  });
});

describe("useGetHistoryDataV2 — v1 fallback & routing", () => {
  it("maps v1 router payloads into redesigned history sections", async () => {
    jest.spyOn(ApiInternal, "getAccountHistoryWithFlag").mockResolvedValue({
      version: "v1",
      operations: [
        {
          account: MOCK_SELF,
          amount: "2.0000000",
          asset_type: "native",
          created_at: "2024-05-01T00:00:00Z",
          from: MOCK_ACCOUNT_2,
          id: "v1-op",
          paging_token: "v1-op",
          source_account: MOCK_ACCOUNT_2,
          to: MOCK_SELF,
          transaction_hash: "v1-tx",
          transaction_successful: true,
          type: "payment",
          type_i: 1,
          transaction_attr: {
            fee_charged: "100",
            hash: "v1-tx",
            ledger: 123,
            operation_count: 1,
          },
        } as any,
      ],
    });
    const { result } = renderV2Hook();

    await act(async () => {
      await result.current.fetchData();
    });

    const data = asResolved(result.current.state.data);
    expect(data.fallbackToV1).toBe(false);
    expect(data.hasNextPage).toBe(false);
    expect(countEntries(data)).toBe(1);
    expect(data.sections[0].entries[0]).toEqual(
      expect.objectContaining({
        id: "v1-tx",
        kind: "received",
        primaryText: "XLM",
      }),
    );
    expect(data.sections[0].entries[0].details.counterparty).toBe(
      MOCK_ACCOUNT_2,
    );
  });

  it("keeps redesigned mode with empty sections when v1 returns no operations", async () => {
    jest
      .spyOn(ApiInternal, "getAccountHistoryWithFlag")
      .mockResolvedValue({ version: "v1", operations: [] });
    const { result } = renderV2Hook();

    await act(async () => {
      await result.current.fetchData();
    });

    const data = asResolved(result.current.state.data);
    expect(data.fallbackToV1).toBe(false);
    expect(data.sections).toEqual([]);
    expect(data.hasNextPage).toBe(false);
  });

  it("passes through a re-route without fetching history", async () => {
    const spy = jest.spyOn(ApiInternal, "getAccountHistoryWithFlag");
    mockFetchAppData.mockResolvedValue({
      type: AppDataType.REROUTE,
      routeTarget: ROUTES.unlockAccount,
      shouldOpenTab: false,
    });
    const { result } = renderV2Hook();

    await act(async () => {
      await result.current.fetchData();
    });

    expect(result.current.state.data?.type).toBe(AppDataType.REROUTE);
    expect(spy).not.toHaveBeenCalled();
  });

  it("surfaces an error state when the history fetch rejects", async () => {
    jest
      .spyOn(ApiInternal, "getAccountHistoryWithFlag")
      .mockRejectedValue(new Error("boom"));
    const { result } = renderV2Hook();

    await act(async () => {
      await result.current.fetchData();
    });

    await waitFor(() =>
      expect(result.current.state.state).toBe<RequestState>(RequestState.ERROR),
    );
  });
});
