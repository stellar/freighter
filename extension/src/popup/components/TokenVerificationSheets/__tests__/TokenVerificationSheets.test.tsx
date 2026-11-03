import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { VerifiedTokenInfoSheet, UnverifiedTokenInfoSheet } from "../index";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("Token info sheets", () => {
  it("VerifiedTokenInfoSheet renders its copy when open", () => {
    render(<VerifiedTokenInfoSheet isOpen onClose={jest.fn()} />);
    expect(screen.getByText("Verified token")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Varial uses asset lists to verify assets before interactions. You can define your own assets lists in Settings.",
      ),
    ).toBeInTheDocument();
  });

  it("UnverifiedTokenInfoSheet renders its caution copy when open", () => {
    render(<UnverifiedTokenInfoSheet isOpen onClose={jest.fn()} />);
    expect(screen.getByText("Unverified token")).toBeInTheDocument();
    expect(
      screen.getByText(
        "These assets are not on any of your lists. Proceed with caution before adding.",
      ),
    ).toBeInTheDocument();
  });

  it("VerifiedTokenInfoSheet closes from its X, its only button", () => {
    const mockOnClose = jest.fn();
    render(<VerifiedTokenInfoSheet isOpen onClose={mockOnClose} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("UnverifiedTokenInfoSheet closes from its X, its only button", () => {
    const mockOnClose = jest.fn();
    render(<UnverifiedTokenInfoSheet isOpen onClose={mockOnClose} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
