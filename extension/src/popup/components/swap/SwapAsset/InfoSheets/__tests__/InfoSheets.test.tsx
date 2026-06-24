import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { VerifiedTokenInfoSheet, UnverifiedTokenInfoSheet } from "../index";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("Token info sheets", () => {
  it("VerifiedTokenInfoSheet renders its copy when open", () => {
    render(<VerifiedTokenInfoSheet isOpen onClose={jest.fn()} />);
    expect(
      screen.getByText(
        "Freighter uses asset lists to verify assets before interactions.",
      ),
    ).toBeInTheDocument();
  });

  it("UnverifiedTokenInfoSheet renders its caution copy when open", () => {
    render(<UnverifiedTokenInfoSheet isOpen onClose={jest.fn()} />);
    expect(
      screen.getByText(
        "These tokens are not on any of your lists. Proceed with caution.",
      ),
    ).toBeInTheDocument();
  });

  it("VerifiedTokenInfoSheet calls onClose when dismiss button is clicked", () => {
    const mockOnClose = jest.fn();
    render(<VerifiedTokenInfoSheet isOpen onClose={mockOnClose} />);
    const dismissButton = screen.getByText("Got it");
    fireEvent.click(dismissButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("UnverifiedTokenInfoSheet calls onClose when dismiss button is clicked", () => {
    const mockOnClose = jest.fn();
    render(<UnverifiedTokenInfoSheet isOpen onClose={mockOnClose} />);
    const dismissButton = screen.getByText("Got it");
    fireEvent.click(dismissButton);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
