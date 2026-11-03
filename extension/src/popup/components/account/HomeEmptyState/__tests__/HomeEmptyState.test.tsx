import React from "react";
import { render, screen } from "@testing-library/react";

import { HomeEmptyState } from "popup/components/account/HomeEmptyState";

describe("HomeEmptyState", () => {
  it("renders its title, description and action", () => {
    render(
      <HomeEmptyState
        title="Activate your wallet"
        description="Add at least 2 XLM to get started"
        data-testid="card"
      >
        <button type="button">Add XLM</button>
      </HomeEmptyState>,
    );

    const card = screen.getByTestId("card");
    expect(card).toHaveTextContent("Activate your wallet");
    expect(card).toHaveTextContent("Add at least 2 XLM to get started");
    expect(screen.getByRole("button", { name: "Add XLM" })).toBeInTheDocument();
    expect(card).not.toHaveClass("HomeEmptyState--wide");
  });

  // The collectibles card pads its sides 32px rather than 24px.
  it("takes the wide padding when asked", () => {
    render(
      <HomeEmptyState title="t" description="d" isWide data-testid="card" />,
    );

    expect(screen.getByTestId("card")).toHaveClass("HomeEmptyState--wide");
  });

  // Both sparkles are in the DOM; the theme class on <body> picks one in CSS.
  it("carries the light and dark sparkle, hidden from screen readers", () => {
    const { container } = render(<HomeEmptyState title="t" description="d" />);

    const sparkle = container.querySelector(".HomeEmptyState__sparkle");
    expect(sparkle).toHaveAttribute("aria-hidden", "true");
    expect(sparkle?.querySelectorAll("img")).toHaveLength(2);
  });
});
