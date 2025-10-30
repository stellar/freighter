import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { AddressTile } from "../index";

// Mock the dependencies
jest.mock("popup/components/identicons/IdenticonImg", () => ({
  IdenticonImg: ({ publicKey }: { publicKey: string }) => (
    <div data-testid="identicon-img" data-public-key={publicKey}>
      Identicon
    </div>
  ),
}));

jest.mock("helpers/stellar", () => ({
  truncatedFedAddress: (address: string) => `truncated-fed-${address}`,
  truncatedPublicKey: (address: string) => `truncated-${address}`,
}));

jest.mock("popup/components/SelectionTile", () => ({
  SelectionTile: ({
    icon,
    primaryText,
    secondaryText,
    onClick,
    isEmpty,
    testId,
  }: any) => (
    <div
      data-testid={testId || "selection-tile"}
      className={`SelectionTile ${isEmpty ? "SelectionTile--empty" : ""}`}
      onClick={onClick}
    >
      <div data-testid="tile-icon">{icon}</div>
      <div data-testid="tile-primary">{primaryText}</div>
      {secondaryText && <div data-testid="tile-secondary">{secondaryText}</div>}
    </div>
  ),
}));

describe("AddressTile", () => {
  const mockOnClick = jest.fn();
  const mockAddress =
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  describe("with address (public key)", () => {
    it("renders address with truncated public key", () => {
      render(<AddressTile address={mockAddress} onClick={mockOnClick} />);

      expect(screen.getByTestId("address-tile")).toBeInTheDocument();
      expect(screen.getByTestId("tile-primary")).toHaveTextContent(
        `truncated-${mockAddress}`,
      );
      expect(screen.getByTestId("identicon-img")).toBeInTheDocument();
      expect(screen.queryByTestId("tile-secondary")).not.toBeInTheDocument();
    });

    it("passes correct publicKey to IdenticonImg", () => {
      render(<AddressTile address={mockAddress} onClick={mockOnClick} />);

      const identicon = screen.getByTestId("identicon-img");
      expect(identicon).toHaveAttribute("data-public-key", mockAddress);
    });

    it("calls onClick when clicked", () => {
      render(<AddressTile address={mockAddress} onClick={mockOnClick} />);

      fireEvent.click(screen.getByTestId("address-tile"));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("does not apply empty state", () => {
      render(<AddressTile address={mockAddress} onClick={mockOnClick} />);

      const tile = screen.getByTestId("address-tile");
      expect(tile).not.toHaveClass("SelectionTile--empty");
    });
  });

  describe("with federation address", () => {
    const mockFederationAddress = "user*stellar.org";

    it("renders with truncated federation address", () => {
      render(
        <AddressTile
          address={mockAddress}
          federationAddress={mockFederationAddress}
          onClick={mockOnClick}
        />,
      );

      expect(screen.getByTestId("tile-primary")).toHaveTextContent(
        `truncated-fed-${mockFederationAddress}`,
      );
      expect(screen.getByTestId("identicon-img")).toBeInTheDocument();
    });

    it("prefers federation address over public key for display", () => {
      render(
        <AddressTile
          address={mockAddress}
          federationAddress={mockFederationAddress}
          onClick={mockOnClick}
        />,
      );

      // Should show truncated federation address, not truncated public key
      expect(screen.getByTestId("tile-primary")).toHaveTextContent(
        `truncated-fed-${mockFederationAddress}`,
      );
      expect(screen.getByTestId("tile-primary")).not.toHaveTextContent(
        `truncated-${mockAddress}`,
      );
    });

    it("still passes address to IdenticonImg when federation address exists", () => {
      render(
        <AddressTile
          address={mockAddress}
          federationAddress={mockFederationAddress}
          onClick={mockOnClick}
        />,
      );

      const identicon = screen.getByTestId("identicon-img");
      expect(identicon).toHaveAttribute("data-public-key", mockAddress);
    });
  });

  describe("empty state (no address)", () => {
    it("renders empty state with default labels", () => {
      render(<AddressTile address="" onClick={mockOnClick} />);

      expect(screen.getByTestId("address-tile")).toBeInTheDocument();
      expect(screen.getByTestId("tile-primary")).toHaveTextContent("Send to");
      expect(screen.getByTestId("tile-secondary")).toHaveTextContent(
        "Choose Recipient",
      );
    });

    it("applies empty state to SelectionTile", () => {
      render(<AddressTile address="" onClick={mockOnClick} />);

      const tile = screen.getByTestId("address-tile");
      expect(tile).toHaveClass("SelectionTile--empty");
    });

    it("calls onClick in empty state", () => {
      render(<AddressTile address="" onClick={mockOnClick} />);

      fireEvent.click(screen.getByTestId("address-tile"));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("does not render IdenticonImg in empty state", () => {
      render(<AddressTile address="" onClick={mockOnClick} />);

      expect(screen.queryByTestId("identicon-img")).not.toBeInTheDocument();
    });
  });

  describe("IdenticonImg integration", () => {
    it("passes correct props to IdenticonImg for standard address", () => {
      render(<AddressTile address={mockAddress} onClick={mockOnClick} />);

      const identicon = screen.getByTestId("identicon-img");
      expect(identicon).toHaveAttribute("data-public-key", mockAddress);
    });

    it("passes correct props to IdenticonImg when federation address exists", () => {
      render(
        <AddressTile
          address={mockAddress}
          federationAddress="user*stellar.org"
          onClick={mockOnClick}
        />,
      );

      const identicon = screen.getByTestId("identicon-img");
      // Should still use the public key for the identicon, not the federation address
      expect(identicon).toHaveAttribute("data-public-key", mockAddress);
    });
  });

  describe("truncation helpers", () => {
    it("uses truncatedPublicKey for address display when no federation address", () => {
      render(<AddressTile address={mockAddress} onClick={mockOnClick} />);

      // Based on our mock, truncatedPublicKey returns "truncated-{address}"
      expect(screen.getByTestId("tile-primary")).toHaveTextContent(
        `truncated-${mockAddress}`,
      );
    });

    it("uses truncatedFedAddress when federation address is provided", () => {
      const federationAddress = "user*stellar.org";
      render(
        <AddressTile
          address={mockAddress}
          federationAddress={federationAddress}
          onClick={mockOnClick}
        />,
      );

      // Based on our mock, truncatedFedAddress returns "truncated-fed-{address}"
      expect(screen.getByTestId("tile-primary")).toHaveTextContent(
        `truncated-fed-${federationAddress}`,
      );
    });
  });
});
