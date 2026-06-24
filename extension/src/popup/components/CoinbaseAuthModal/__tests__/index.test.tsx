import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";

import { CoinbaseAuthModal } from "../index";

describe("CoinbaseAuthModal", () => {
  const onAuthorize = jest.fn();
  const onCancel = jest.fn();

  const defaultProps = {
    isOpen: true,
    accountName: "Account 1",
    accountPublicKey:
      "GADUITGN4NNFLI4M3HKUUTQELHRQGFPDLW5MXM5R5SLPDFTPCKQ5MBAS",
    networkName: "Main Net",
    isLoading: false,
    onAuthorize,
    onCancel,
  };

  beforeEach(() => {
    onAuthorize.mockClear();
    onCancel.mockClear();
  });

  it("renders the Coinbase identity, allow text, account and network details", () => {
    render(<CoinbaseAuthModal {...defaultProps} />);

    expect(screen.getByText("Coinbase")).toBeInTheDocument();
    expect(screen.getByText("app.coinbase.com")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Allow site to view your wallet address, balance, activity and request approval for transactions.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Account 1")).toBeInTheDocument();
    expect(screen.getByText("Main Net")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Authorize")).toBeInTheDocument();
  });

  it("does not render the 'once per account' sentence", () => {
    render(<CoinbaseAuthModal {...defaultProps} />);

    expect(screen.queryByText(/only required once per account/i)).toBeNull();
  });

  it("calls onAuthorize when Authorize is clicked", () => {
    render(<CoinbaseAuthModal {...defaultProps} />);

    fireEvent.click(screen.getByText("Authorize"));
    expect(onAuthorize).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Cancel is clicked", () => {
    render(<CoinbaseAuthModal {...defaultProps} />);

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders an error message when provided", () => {
    render(
      <CoinbaseAuthModal
        {...defaultProps}
        errorMessage="Something went wrong"
      />,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <CoinbaseAuthModal {...defaultProps} isOpen={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
