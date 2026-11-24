import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { AssetDetailSheet } from "popup/components/account/AssetDetail/AssetDetailSheet";
import { TokenChartSource } from "popup/components/account/TokenPriceChart/constants";
import { RequestState } from "constants/request";
import { Wrapper } from "popup/__testHelpers__";
import { ROUTES } from "popup/constants/routes";

const mockFetchData = jest.fn();
let mockState: { state: RequestState; data: unknown } = {
  state: RequestState.IDLE,
  data: null,
};

jest.mock("popup/views/Account/hooks/useGetAccountHistoryData", () => ({
  useGetAccountHistoryData: () => ({
    state: mockState,
    fetchData: mockFetchData,
  }),
}));

jest.mock("popup/components/account/AssetDetail", () => ({
  AssetDetail: ({
    selectedAsset,
    source,
    hasHistoryError,
    historyData,
    swapTo,
    isUnableToScan,
  }: any) => (
    <div
      data-testid="asset-detail"
      data-unable-to-scan={String(!!isUnableToScan)}
      data-asset={selectedAsset}
      data-source={source}
      data-error={String(hasHistoryError)}
      data-history={String(historyData)}
      data-swap-to={swapTo?.code ?? ""}
      onClick={swapTo?.onSelect}
    />
  ),
}));

jest.mock("popup/components/account/AssetDetail/NonHeldAssetDetail", () => ({
  NonHeldAssetDetail: ({ asset, source, swapTo }: any) => (
    <div
      data-testid="non-held-detail"
      data-asset={asset.canonical}
      data-source={source}
      data-swap-to={swapTo?.code ?? ""}
      onClick={swapTo?.onSelect}
    />
  ),
}));

const accountBalances = {
  balances: [
    {
      available: new BigNumber(10),
      token: { type: "native", code: "XLM" },
      total: new BigNumber(10),
    },
  ],
} as any;

const descriptor = (canonical: string) => ({
  canonical,
  code: canonical.split(":")[0],
});

const renderSheet = (
  asset: ReturnType<typeof descriptor> | null,
  onClose = jest.fn(),
  swapTo?: { code: string; side: "to" | "from"; onSelect: () => void },
) =>
  render(
    <Wrapper routes={[ROUTES.account]} state={{}}>
      <AssetDetailSheet
        asset={asset}
        accountBalances={accountBalances}
        source={TokenChartSource.SwapPicker}
        onClose={onClose}
        swapTo={swapTo}
      />
    </Wrapper>,
  );

describe("AssetDetailSheet", () => {
  beforeEach(() => {
    mockFetchData.mockReset();
    mockState = { state: RequestState.IDLE, data: null };
  });

  it("renders the held detail with cached history for a held canonical", () => {
    mockState = { state: RequestState.ERROR, data: null };
    renderSheet(descriptor("native"));

    const detail = screen.getByTestId("asset-detail");
    expect(detail.getAttribute("data-asset")).toBe("native");
    expect(detail.getAttribute("data-source")).toBe("swap_picker");
    expect(detail.getAttribute("data-error")).toBe("true");
    expect(screen.queryByTestId("non-held-detail")).toBeNull();
    expect(mockFetchData).toHaveBeenCalledTimes(1);
    expect(mockFetchData).toHaveBeenCalledWith({
      balances: accountBalances,
      useCache: true,
    });
  });

  it("fetches cached history once when held-ness resolves after the sheet opened", () => {
    const onClose = jest.fn();
    const asset = descriptor("native");
    const ui = (balances: any) => (
      <Wrapper routes={[ROUTES.account]} state={{}}>
        <AssetDetailSheet
          asset={asset}
          accountBalances={balances}
          source={TokenChartSource.SwapPicker}
          onClose={onClose}
        />
      </Wrapper>
    );
    const { rerender } = render(ui({ balances: [] }));
    expect(screen.getByTestId("non-held-detail")).toBeInTheDocument();
    expect(mockFetchData).not.toHaveBeenCalled();

    rerender(ui(accountBalances));
    expect(screen.getByTestId("asset-detail")).toBeInTheDocument();
    expect(mockFetchData).toHaveBeenCalledTimes(1);
    expect(mockFetchData).toHaveBeenCalledWith({
      balances: accountBalances,
      useCache: true,
    });
  });

  it("hands the record's unable-to-scan verdict to the held view", () => {
    renderSheet({ ...descriptor("native"), isUnableToScan: true } as any);

    expect(
      screen.getByTestId("asset-detail").getAttribute("data-unable-to-scan"),
    ).toBe("true");
  });

  it("renders the non-held detail for an unknown canonical", () => {
    renderSheet(
      descriptor(
        "ZZZ:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      ),
    );

    const detail = screen.getByTestId("non-held-detail");
    expect(detail.getAttribute("data-source")).toBe("swap_picker");
    expect(screen.queryByTestId("asset-detail")).toBeNull();
    expect(mockFetchData).not.toHaveBeenCalled();
  });

  it("hands swapTo to whichever view it renders", () => {
    const onSelect = jest.fn();
    const { unmount } = renderSheet(descriptor("native"), jest.fn(), {
      code: "XLM",
      side: "to",
      onSelect,
    });
    const held = screen.getByTestId("asset-detail");
    expect(held.getAttribute("data-swap-to")).toBe("XLM");
    fireEvent.click(held);
    expect(onSelect).toHaveBeenCalledTimes(1);
    unmount();

    renderSheet(
      descriptor(
        "ZZZ:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      ),
      jest.fn(),
      { code: "ZZZ", side: "to", onSelect },
    );
    expect(
      screen.getByTestId("non-held-detail").getAttribute("data-swap-to"),
    ).toBe("ZZZ");

    unmount();
    renderSheet(descriptor("native"));
    expect(
      screen.getByTestId("asset-detail").getAttribute("data-swap-to"),
    ).toBe("");
  });

  it("renders nothing while closed and calls onClose when the sheet closes", () => {
    const onClose = jest.fn();
    const { unmount } = renderSheet(null, onClose);
    expect(screen.queryByTestId("asset-detail")).toBeNull();
    expect(screen.queryByTestId("non-held-detail")).toBeNull();
    expect(mockFetchData).not.toHaveBeenCalled();
    unmount();

    renderSheet(descriptor("native"), onClose);
    fireEvent.keyDown(screen.getByTestId("asset-detail"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
