import React from "react";
import { render, screen } from "@testing-library/react";

import { TruncatedMemo } from "../index";

describe("TruncatedMemo", () => {
  it("renders the memo and sets title when memo is present", () => {
    const memo = "important memo";
    render(<TruncatedMemo memo={memo} data-testid="memo" />);
    const el = screen.getByTestId("memo");
    expect(el).toHaveTextContent(memo);
    expect(el).toHaveAttribute("title", memo);
  });

  it("renders the default fallback and omits title when memo is empty", () => {
    render(<TruncatedMemo memo="" data-testid="memo" />);
    const el = screen.getByTestId("memo");
    expect(el).toHaveTextContent("None");
    expect(el).not.toHaveAttribute("title");
  });

  it("renders a custom fallback when provided", () => {
    render(
      <TruncatedMemo
        memo={undefined}
        fallback="—"
        data-testid="memo"
      />,
    );
    const el = screen.getByTestId("memo");
    expect(el).toHaveTextContent("—");
    expect(el).not.toHaveAttribute("title");
  });

  it("preserves whitespace memos verbatim (does not trim user input)", () => {
    const memo = "  spaced  ";
    render(<TruncatedMemo memo={memo} data-testid="memo" />);
    const el = screen.getByTestId("memo");
    expect(el).toHaveAttribute("title", memo);
    expect(el).toHaveTextContent("spaced");
  });

  it("renders as a div by default and as a span when inline", () => {
    const { rerender } = render(
      <TruncatedMemo memo="x" data-testid="memo" />,
    );
    expect(screen.getByTestId("memo").tagName).toBe("DIV");

    rerender(<TruncatedMemo memo="x" inline data-testid="memo" />);
    expect(screen.getByTestId("memo").tagName).toBe("SPAN");
    expect(screen.getByTestId("memo")).toHaveClass("TruncatedMemo--inline");
  });
});
