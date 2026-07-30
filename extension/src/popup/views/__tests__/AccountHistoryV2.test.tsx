import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { AccountHistoryV2 } from "../AccountHistory/AccountHistoryV2";
import { HistoryEntry } from "../AccountHistory/model";

const mockUseGetHistoryDataV2 = jest.fn();
const mockFetchData = jest.fn().mockResolvedValue(undefined);
const mockFetchNextPage = jest.fn().mockResolvedValue(undefined);

jest.mock("popup/views/AccountHistory/hooks/useGetHistoryDataV2", () => ({
  useGetHistoryDataV2: (...args: unknown[]) => mockUseGetHistoryDataV2(...args),
}));

jest.mock("popup/views/AccountHistory/AccountHistoryLegacy", () => ({
  AccountHistoryLegacy: () => <div data-testid="legacy-history" />,
}));

jest.mock("popup/helpers/route", () => ({
  reRouteOnboarding: jest.fn(),
}));

jest.mock("popup/helpers/navigate", () => ({
  openTab: jest.fn(),
}));

jest.mock("react-redux", () => ({
  useSelector: () => ({ isHideDustEnabled: false }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("popup/components/Loading", () => ({
  Loading: () => <div data-testid="loading" />,
}));

jest.mock("popup/basics/layout/View", () => ({
  View: {
    AppHeader: ({ pageTitle }: { pageTitle: string }) => (
      <div data-testid="app-header">{pageTitle}</div>
    ),
    Content: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="content">{children}</div>
    ),
  },
}));

jest.mock("popup/components/SlideupModal", () => ({
  SlideupModal: ({
    isModalOpen,
    children,
  }: {
    isModalOpen: boolean;
    children: React.ReactNode;
  }) => (isModalOpen ? <div data-testid="slideup">{children}</div> : null),
}));

jest.mock("popup/components/accountHistory/HistoryItemV2", () => ({
  HistoryItemV2: ({
    entry,
    onClick,
  }: {
    entry: { id: string; primaryText: string };
    onClick: (id: string) => void;
  }) => (
    <button
      type="button"
      data-testid={`row-${entry.id}`}
      onClick={() => onClick(entry.id)}
    >
      {entry.primaryText}
    </button>
  ),
}));

jest.mock("popup/components/accountHistory/TransactionDetailSheet", () => ({
  TransactionDetailSheet: ({
    entry,
  }: {
    entry: { details: { title: string } };
  }) => <div data-testid="detail-sheet">{entry.details.title}</div>,
}));

const makeEntry = (id: string, primaryText: string): HistoryEntry =>
  ({
    id,
    kind: "sent",
    createdAt: "2024-05-27T10:00:00Z",
    rowIcon: { type: "contract" },
    primaryText,
    secondaryText: "Sent",
    secondaryIcon: "sent",
    amounts: null,
    details: {
      title: `Detail ${primaryText}`,
      status: "success",
      fee: "0.00001",
      rate: null,
      contractId: null,
      functionName: null,
      protocol: null,
      counterparty: null,
      balanceChanges: [],
      stateChangeCards: [],
      operations: [],
    },
  }) as HistoryEntry;

const reducerState = (
  overrides: Partial<{
    sections: { monthYear: string; entries: HistoryEntry[] }[];
    fallbackToV1: boolean;
    hasNextPage: boolean;
  }> = {},
) => ({
  state: RequestState.SUCCESS,
  data: {
    type: AppDataType.RESOLVED,
    publicKey: "G1",
    applicationState: "MNEMONIC_PHRASE_CONFIRMED",
    balances: {},
    sections: overrides.sections ?? [],
    fallbackToV1: overrides.fallbackToV1 ?? false,
    hasNextPage: overrides.hasNextPage ?? false,
  },
  error: null,
});

// The hook returns { state: <reducerState>, fetchData, fetchNextPage,
// isLoadingMore } where <reducerState> is { state: RequestState, data, error }.
const mockHook = (state: unknown, isLoadingMore = false) => {
  mockUseGetHistoryDataV2.mockReturnValue({
    state,
    fetchData: mockFetchData,
    fetchNextPage: mockFetchNextPage,
    isLoadingMore,
  });
};

const renderView = () =>
  render(
    <MemoryRouter>
      <AccountHistoryV2 />
    </MemoryRouter>,
  );

describe("AccountHistoryV2", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // jsdom lacks IntersectionObserver.
    (global as any).IntersectionObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  it("shows the loading state while idle/loading", () => {
    mockHook({ state: RequestState.LOADING, data: null, error: null });
    renderView();
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("triggers the initial fetch on mount", () => {
    mockHook(reducerState());
    renderView();
    expect(mockFetchData).toHaveBeenCalledTimes(1);
  });

  it("renders month sections with their rows", () => {
    mockHook(
      reducerState({
        sections: [
          {
            monthYear: "4:2024",
            entries: [makeEntry("tx-1", "XLM"), makeEntry("tx-2", "USDC")],
          },
        ],
      }),
    );
    renderView();

    expect(screen.getByTestId("AccountHistoryV2")).toBeInTheDocument();
    expect(screen.getByText("May")).toBeInTheDocument();
    expect(screen.getByTestId("row-tx-1")).toHaveTextContent("XLM");
    expect(screen.getByTestId("row-tx-2")).toHaveTextContent("USDC");
  });

  it("shows the empty state when there are no sections", () => {
    mockHook(reducerState({ sections: [] }));
    renderView();
    expect(screen.getByText("No transactions to show")).toBeInTheDocument();
  });

  it("falls back to the legacy history when fallbackToV1 is set", () => {
    mockHook(reducerState({ fallbackToV1: true }));
    renderView();
    expect(screen.getByTestId("legacy-history")).toBeInTheDocument();
    expect(screen.queryByTestId("AccountHistoryV2")).toBeNull();
  });

  it("renders the infinite-scroll sentinel when another page exists", () => {
    mockHook(
      reducerState({
        sections: [
          { monthYear: "4:2024", entries: [makeEntry("tx-1", "XLM")] },
        ],
        hasNextPage: true,
      }),
    );
    renderView();
    expect(screen.getByTestId("AccountHistoryV2-sentinel")).toBeInTheDocument();
  });

  it("does not render the sentinel on the last page", () => {
    mockHook(
      reducerState({
        sections: [
          { monthYear: "4:2024", entries: [makeEntry("tx-1", "XLM")] },
        ],
        hasNextPage: false,
      }),
    );
    renderView();
    expect(screen.queryByTestId("AccountHistoryV2-sentinel")).toBeNull();
  });

  it("opens the detail modal for the clicked entry", () => {
    mockHook(
      reducerState({
        sections: [
          { monthYear: "4:2024", entries: [makeEntry("tx-1", "XLM")] },
        ],
      }),
    );
    renderView();

    expect(screen.queryByTestId("AccountHistoryV2-detail")).toBeNull();
    fireEvent.click(screen.getByTestId("row-tx-1"));
    expect(screen.getByTestId("AccountHistoryV2-detail")).toHaveTextContent(
      "Detail XLM",
    );
  });

  it("shows the error empty-state on a failed fetch", () => {
    mockHook({ state: RequestState.ERROR, data: null, error: new Error("x") });
    renderView();
    expect(screen.getByText("No transactions to show")).toBeInTheDocument();
    expect(screen.queryByTestId("AccountHistoryV2")).toBeInTheDocument();
  });
});
