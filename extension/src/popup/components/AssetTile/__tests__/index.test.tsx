import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { AssetTile } from "../index";

// Mock the dependencies
jest.mock("popup/components/account/AccountAssets", () => ({
  AssetIcon: ({ code, icon }: { code: string; icon: string | null }) => (
    <div data-testid="asset-icon" data-code={code} data-icon={icon}>
      {code}
    </div>
  ),
}));

jest.mock("popup/components/SelectionTile", () => ({
  SelectionTile: ({
    icon,
    primaryText,
    secondaryText,
    onClick,
    isEmpty,
    useIconWrapper,
    testId,
  }: any) => (
    <div
      data-testid={testId || "selection-tile"}
      className={`SelectionTile ${isEmpty ? "SelectionTile--empty" : ""}`}
      data-use-icon-wrapper={useIconWrapper}
      onClick={onClick}
    >
      <div data-testid="tile-icon">{icon}</div>
      <div data-testid="tile-primary">{primaryText}</div>
      {secondaryText && <div data-testid="tile-secondary">{secondaryText}</div>}
    </div>
  ),
}));

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
      render(
        <AssetTile
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
      expect(screen.getByTestId("asset-icon")).toBeInTheDocument();
    });

    it("renders asset without balance", () => {
      render(
        <AssetTile
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
        />,
      );

      expect(screen.getByTestId("tile-primary")).toHaveTextContent("USDC");
      expect(screen.queryByTestId("tile-secondary")).not.toBeInTheDocument();
    });

    it("calls onClick when clicked", () => {
      render(
        <AssetTile
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
        />,
      );

      fireEvent.click(screen.getByTestId("selection-tile"));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("passes useIconWrapper={false} to SelectionTile", () => {
      render(
        <AssetTile
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
        />,
      );

      const tile = screen.getByTestId("selection-tile");
      expect(tile).toHaveAttribute("data-use-icon-wrapper", "false");
    });

    it("does not apply empty state", () => {
      render(
        <AssetTile
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
      render(
        <AssetTile
          asset={nativeAsset}
          assetIcon={null}
          balance="500.00"
          onClick={mockOnClick}
        />,
      );

      expect(screen.getByTestId("tile-primary")).toHaveTextContent("XLM");
      expect(screen.getByTestId("tile-secondary")).toHaveTextContent("500.00");
      expect(screen.getByTestId("asset-icon")).toBeInTheDocument();
    });

    it("handles null assetIcon for native asset", () => {
      render(
        <AssetTile
          asset={nativeAsset}
          assetIcon={null}
          onClick={mockOnClick}
        />,
      );

      const assetIcon = screen.getByTestId("asset-icon");
      expect(assetIcon.getAttribute("data-icon")).toBeNull();
    });
  });

  describe("empty state (no asset)", () => {
    it("renders empty state with default labels", () => {
      render(<AssetTile asset={null} assetIcon={null} onClick={mockOnClick} />);

      expect(screen.getByTestId("tile-primary")).toHaveTextContent(
        "Select asset",
      );
      expect(screen.getByTestId("tile-secondary")).toHaveTextContent(
        "Choose asset",
      );
    });

    it("renders empty state with custom labels", () => {
      render(
        <AssetTile
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
      render(<AssetTile asset={null} assetIcon={null} onClick={mockOnClick} />);

      const tile = screen.getByTestId("selection-tile");
      expect(tile).toHaveClass("SelectionTile--empty");
    });

    it("calls onClick in empty state", () => {
      render(<AssetTile asset={null} assetIcon={null} onClick={mockOnClick} />);

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

      render(
        <AssetTile
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

      render(
        <AssetTile
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
        />,
      );

      expect(screen.getByTestId("selection-tile")).toBeInTheDocument();
    });
  });

  describe("AssetIcon integration", () => {
    it("passes correct props to AssetIcon for non-native asset", () => {
      const mockAsset = {
        code: "USDC",
        canonical:
          "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      };

      render(
        <AssetTile
          asset={mockAsset}
          assetIcon="https://example.com/usdc.png"
          onClick={mockOnClick}
        />,
      );

      const assetIcon = screen.getByTestId("asset-icon");
      expect(assetIcon).toHaveAttribute("data-code", "USDC");
      expect(assetIcon).toHaveAttribute(
        "data-icon",
        "https://example.com/usdc.png",
      );
    });

    it("passes correct props to AssetIcon for native asset", () => {
      const nativeAsset = {
        code: "XLM",
        canonical: "native",
        issuer: "",
      };

      render(
        <AssetTile
          asset={nativeAsset}
          assetIcon={null}
          onClick={mockOnClick}
        />,
      );

      const assetIcon = screen.getByTestId("asset-icon");
      expect(assetIcon).toHaveAttribute("data-code", "XLM");
      expect(assetIcon.getAttribute("data-icon")).toBeNull();
    });
  });
});
