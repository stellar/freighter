import React from "react";
import { render, screen } from "@testing-library/react";

import { RebrandNotice } from "../index";

describe("RebrandNotice", () => {
  it("announces the rebrand next to a decorative icon", () => {
    const { container } = render(<RebrandNotice size="sm" />);

    expect(screen.getByText("Freighter is now Varial")).toBeInTheDocument();
    expect(container.querySelector(".RebrandNotice__icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it.each(["sm", "md"] as const)(
    "sets the sentence at SDS's %s text size",
    (size) => {
      render(<RebrandNotice size={size} />);

      expect(screen.getByText("Freighter is now Varial")).toHaveClass(
        `Text--${size}`,
      );
    },
  );
});
