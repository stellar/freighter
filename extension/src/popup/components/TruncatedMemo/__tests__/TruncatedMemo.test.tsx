import React from "react";
import { render, screen } from "@testing-library/react";

import { TruncatedMemo } from "../index";

describe("TruncatedMemo", () => {
  it("renders the full memo and exposes it via title attribute", () => {
    const memo = "a very long memo value that may overflow";
    render(<TruncatedMemo memo={memo} data-testid="memo" />);
    const el = screen.getByTestId("memo");
    expect(el.textContent).toBe(memo);
    expect(el.getAttribute("title")).toBe(memo);
  });

  it("renders fallback when memo is missing and has no title attribute", () => {
    render(<TruncatedMemo memo="" data-testid="memo" />);
    const el = screen.getByTestId("memo");
    expect(el.textContent).toBeTruthy();
    expect(el.hasAttribute("title")).toBe(false);
  });

  it("uses custom fallback when provided", () => {
    render(<TruncatedMemo memo={null} fallback="—" data-testid="memo" />);
    expect(screen.getByTestId("memo").textContent).toBe("—");
  });

  it("does not mutate the memo (no trimming)", () => {
    const memo = "  whitespace padded memo  ";
    render(<TruncatedMemo memo={memo} data-testid="memo" />);
    const el = screen.getByTestId("memo");
    expect(el.getAttribute("title")).toBe(memo);
    expect(el.textContent).toBe(memo);
  });

  it("renders a span and applies the inline modifier when inline=true", () => {
    render(<TruncatedMemo memo="hello" inline data-testid="memo" />);
    const el = screen.getByTestId("memo");
    expect(el.tagName).toBe("SPAN");
    expect(el.className).toContain("TruncatedMemo--inline");
  });

  it("applies maxChars pre-truncation while preserving the full value in title", () => {
    const memo = "abcdefghijklmnop";
    render(<TruncatedMemo memo={memo} maxChars={6} data-testid="memo" />);
    const el = screen.getByTestId("memo");
    expect(el.textContent).toBe("abcdef…");
    expect(el.getAttribute("title")).toBe(memo);
  });

  it("does not apply maxChars when memo fits within the limit", () => {
    render(<TruncatedMemo memo="short" maxChars={10} data-testid="memo" />);
    expect(screen.getByTestId("memo").textContent).toBe("short");
  });

  it("treats maxChars={0} as no truncation", () => {
    const memo = "abcdef";
    render(<TruncatedMemo memo={memo} maxChars={0} data-testid="memo" />);
    expect(screen.getByTestId("memo").textContent).toBe(memo);
  });
});
