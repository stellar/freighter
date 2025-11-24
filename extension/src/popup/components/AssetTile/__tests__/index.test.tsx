import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { AssetTile } from "../index";
import { makeDummyStore } from "popup/__testHelpers__";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";

jest.mock("popup/components/SelectionTile", () => ({
  SelectionTile: ({
    icon,
    primaryText,
    secondaryText,
    onClick,
    isEmpty,
    shouldUseIconWrapper,
    testId,
  }: any) => (
    <div
      data-testid={testId || "selection-tile"}
      className={`SelectionTile ${isEmpty ? "SelectionTile--empty" : ""}`}
      data-use-icon-wrapper={shouldUseIconWrapper}
      onClick={onClick}
    >
      <div data-testid="tile-icon">{icon}</div>
      <div data-testid="tile-primary">{primaryText}</div>
      {secondaryText && <div data-testid="tile-secondary">{secondaryText}</div>}
    </div>
  ),
}));

// Helper to render with Redux store
const renderWithStore = (component: React.ReactElement) => {
  const store = makeDummyStore({
    transactionSubmission: {
      ...transactionSubmissionInitialState,
      soroswapTokens: [],
    },
  });
  return render(<Provider store={store}>{component}</Provider>);
};

describe("AssetTile", () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  describe("with asset data", () => {
    const mockAsset = {
      code: "USDC",
      canonical:
        "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    };

    it("renders asset with all props", () => {
      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          balance="100.00"
          onClick={mockOnClick}
          testId="asset-tile-test"
        />,
      );

      expect(screen.getByTestId("asset-tile-test")).toBeInTheDocument();
      expect(screen.getByTestId("tile-primary")).toHaveTextContent("USDC");
      expect(screen.getByTestId("tile-secondary")).toHaveTextContent("100.00");
      expect(
        screen.getByTestId("AccountAssets__asset--loading-USDC"),
      ).toBeInTheDocument();
    });

    it("renders asset without balance", () => {
      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
        />,
      );

      expect(screen.getByTestId("tile-primary")).toHaveTextContent("USDC");
      expect(screen.queryByTestId("tile-secondary")).not.toBeInTheDocument();
    });

    it("calls onClick when clicked", () => {
      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
        />,
      );

      fireEvent.click(screen.getByTestId("selection-tile"));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("passes shouldUseIconWrapper={false} to SelectionTile", () => {
      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
        />,
      );

      const tile = screen.getByTestId("selection-tile");
      expect(tile).toHaveAttribute("data-use-icon-wrapper", "false");
    });

    it("does not apply empty state", () => {
      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
        />,
      );

      const tile = screen.getByTestId("selection-tile");
      expect(tile).not.toHaveClass("SelectionTile--empty");
    });
  });

  describe("with native asset (XLM)", () => {
    const nativeAsset = {
      code: "XLM",
      canonical: "native",
      issuer: "",
    };

    it("renders native asset correctly", () => {
      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={nativeAsset}
          assetIcon={null}
          balance="500.00"
          onClick={mockOnClick}
        />,
      );

      expect(screen.getByTestId("tile-primary")).toHaveTextContent("XLM");
      expect(screen.getByTestId("tile-secondary")).toHaveTextContent("500.00");
      expect(
        screen.getByTestId("AccountAssets__asset--loading-XLM"),
      ).toBeInTheDocument();
    });

    it("handles null assetIcon for native asset", () => {
      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={nativeAsset}
          assetIcon={null}
          onClick={mockOnClick}
        />,
      );

      const assetIcon = screen.getByTestId("AccountAssets__asset--loading-XLM");
      expect(assetIcon).toBeInTheDocument();
      // Native asset should still render with the default XLM icon
      const img = assetIcon.querySelector("img");
      expect(img).toHaveAttribute("alt", "XLM logo");
    });
  });

  describe("empty state (no asset)", () => {
    it("renders empty state with default labels", () => {
      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={null}
          assetIcon={null}
          onClick={mockOnClick}
        />,
      );

      expect(screen.getByTestId("tile-primary")).toHaveTextContent(
        "Select asset",
      );
      expect(screen.getByTestId("tile-secondary")).toHaveTextContent(
        "Choose asset",
      );
    });

    it("renders empty state with custom labels", () => {
      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={null}
          assetIcon={null}
          onClick={mockOnClick}
          emptyLabel="Receive"
          emptySubtext="Choose asset"
        />,
      );

      expect(screen.getByTestId("tile-primary")).toHaveTextContent("Receive");
      expect(screen.getByTestId("tile-secondary")).toHaveTextContent(
        "Choose asset",
      );
    });

    it("applies empty state to SelectionTile", () => {
      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={null}
          assetIcon={null}
          onClick={mockOnClick}
        />,
      );

      const tile = screen.getByTestId("selection-tile");
      expect(tile).toHaveClass("SelectionTile--empty");
    });

    it("calls onClick in empty state", () => {
      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={null}
          assetIcon={null}
          onClick={mockOnClick}
        />,
      );

      fireEvent.click(screen.getByTestId("selection-tile"));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("testId prop", () => {
    it("passes custom testId to SelectionTile", () => {
      const mockAsset = {
        code: "USDC",
        canonical:
          "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      };

      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
          testId="custom-asset-tile"
        />,
      );

      expect(screen.getByTestId("custom-asset-tile")).toBeInTheDocument();
    });

    it("works without testId", () => {
      const mockAsset = {
        code: "USDC",
        canonical:
          "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      };

      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
        />,
      );

      expect(screen.getByTestId("selection-tile")).toBeInTheDocument();
    });
  });

  describe("AssetIcon integration", () => {
    it("renders AssetIcon correctly for non-native asset", () => {
      const mockAsset = {
        code: "USDC",
        canonical:
          "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      };

      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
        />,
      );

      const assetIcon = screen.getByTestId(
        "AccountAssets__asset--loading-USDC",
      );
      expect(assetIcon).toBeInTheDocument();
      const img = assetIcon.querySelector("img");
      expect(img).toHaveAttribute("src", "https://example.com/usdc.png");
      expect(img).toHaveAttribute("alt", "USDC logo");
    });

    it("renders AssetIcon correctly for native asset", () => {
      const nativeAsset = {
        code: "XLM",
        canonical: "native",
        issuer: "",
      };

      renderWithStore(
        <AssetTile
          isSuspicious={false}
          asset={nativeAsset}
          assetIcon={null}
          onClick={mockOnClick}
        />,
      );

      const assetIcon = screen.getByTestId("AccountAssets__asset--loading-XLM");
      expect(assetIcon).toBeInTheDocument();
      const img = assetIcon.querySelector("img");
      expect(img).toHaveAttribute("alt", "XLM logo");
    });
  });
});
