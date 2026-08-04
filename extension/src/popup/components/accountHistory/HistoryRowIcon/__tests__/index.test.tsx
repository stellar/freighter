import React from "react";
import { render, screen } from "@testing-library/react";

import { HistoryRowIcon } from "popup/components/accountHistory/HistoryRowIcon";
import {
  ResolvedToken,
  RowIconDescriptor,
} from "popup/views/AccountHistory/model";

const token = (
  code: string,
  {
    icon = null,
    issuer = null,
  }: { icon?: string | null; issuer?: string | null } = {},
): ResolvedToken => ({
  code,
  contractId: `C_${code}`,
  issuer,
  icon,
  decimals: 7,
});

const renderIcon = (icon: RowIconDescriptor) =>
  render(<HistoryRowIcon icon={icon} />);

describe("HistoryRowIcon — asset variant", () => {
  it("renders a single token icon from its image url", () => {
    renderIcon({
      type: "asset",
      tokens: [token("USDC", { icon: "https://x/usdc.png" })],
    });

    const tokens = screen.getAllByTestId("history-row-icon-token");
    expect(tokens).toHaveLength(1);
    const img = screen.getByAltText("USDC") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://x/usdc.png");
  });

  it("renders XLM with the bundled Stellar logo, ignoring a null icon", () => {
    renderIcon({ type: "asset", tokens: [token("XLM")] });

    const img = screen.getByAltText("XLM") as HTMLImageElement;
    expect(img.getAttribute("src")).toBeTruthy();
  });

  it("falls back to a lettered placeholder when a non-XLM token has no icon", () => {
    renderIcon({ type: "asset", tokens: [token("ABC")] });

    expect(screen.queryByAltText("ABC")).toBeNull();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders an overlapping pair for a two-token (swap) descriptor", () => {
    renderIcon({
      type: "asset",
      tokens: [token("XLM"), token("USDC", { icon: "https://x/usdc.png" })],
    });

    expect(screen.getAllByTestId("history-row-icon-token")).toHaveLength(2);
    expect(screen.queryByTestId("history-row-icon-badge")).toBeNull();
  });

  it("stacks two icons and shows a +N badge for 3+ tokens", () => {
    renderIcon({
      type: "asset",
      tokens: [token("XLM"), token("USDC"), token("EURC"), token("BTC")],
    });

    expect(screen.getAllByTestId("history-row-icon-token")).toHaveLength(2);
    expect(screen.getByTestId("history-row-icon-badge")).toHaveTextContent(
      "+2",
    );
  });

  it("falls back to the contract glyph when no tokens resolved", () => {
    renderIcon({ type: "asset", tokens: [] });

    expect(screen.getByTestId("history-row-icon-contract")).toBeInTheDocument();
  });
});

describe("HistoryRowIcon — non-asset variants", () => {
  it("renders a protocol logo", () => {
    renderIcon({
      type: "protocol",
      src: "https://x/aqua.png",
      name: "Aquarius",
    });

    const img = screen.getByAltText("Aquarius") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://x/aqua.png");
  });

  it("renders the contract glyph", () => {
    renderIcon({ type: "contract" });
    expect(screen.getByTestId("history-row-icon-contract")).toBeInTheDocument();
  });

  it("renders the settings glyph", () => {
    renderIcon({ type: "settings", glyph: "generic" });
    expect(screen.getByTestId("history-row-icon-settings")).toBeInTheDocument();
  });

  it("renders a distinct settings glyph svg for each config type", () => {
    const glyphs = [
      "signer",
      "threshold",
      "data",
      "domain",
      "flag",
      "allowance",
      "claimable",
      "generic",
    ] as const;
    const svgs = glyphs.map((glyph) => {
      const { container, unmount } = renderIcon({ type: "settings", glyph });
      const svg = container.querySelector(
        '[data-testid="history-row-icon-settings"] svg',
      )?.outerHTML;
      unmount();
      return svg;
    });
    // every glyph renders an svg, and no two config glyphs share the same icon
    expect(svgs.every(Boolean)).toBe(true);
    expect(new Set(svgs).size).toBe(glyphs.length);
  });

  it("renders the failed glyph", () => {
    renderIcon({ type: "failed" });
    expect(screen.getByTestId("history-row-icon-failed")).toBeInTheDocument();
  });

  it("renders the account-create glyph", () => {
    renderIcon({ type: "account", variant: "create" });
    expect(
      screen.getByTestId("history-row-icon-account-create"),
    ).toBeInTheDocument();
  });

  it("renders the account-merge glyph", () => {
    renderIcon({ type: "account", variant: "merge" });
    expect(
      screen.getByTestId("history-row-icon-account-merge"),
    ).toBeInTheDocument();
  });
});
