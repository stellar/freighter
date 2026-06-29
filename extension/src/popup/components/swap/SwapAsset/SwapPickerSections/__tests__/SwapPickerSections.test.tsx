import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { SwapPickerSections } from "../index";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { term?: string }) =>
      opts?.term ? key.replace("{{term}}", opts.term) : key,
  }),
}));

// SwapTokenRow is unit-tested separately; stub it to a simple marker so these
// tests assert section structure, not row internals.
// "Your tokens" rows render through the shared BalanceRow; discover rows
// (Popular/Verified/Unverified) render through AssetListRow. Stub both to the
// same marker so section-structure assertions hold.
jest.mock("popup/components/BalanceRow", () => ({
  BalanceRow: ({ code }: { code: string }) => (
    <div data-testid={`row-${code}`} />
  ),
}));

jest.mock("popup/components/AssetListRow", () => ({
  AssetListRow: ({ code }: { code: string }) => (
    <div data-testid={`row-${code}`} />
  ),
}));

const rec = (code: string, isHeld = false) => ({
  canonical: `${code}:G123`,
  code,
  issuer: "G123",
  domain: "example.org",
  image: "",
  isHeld,
  isContract: false,
  requiresTrustline: false,
});

const emptyResult = {
  yourTokens: [],
  popular: [],
  verified: [],
  unverified: [],
  hadSorobanMatches: false,
  isFallback: false,
  isNewAccount: false,
};

const baseProps = {
  onClickAsset: jest.fn(),
  stellarExpertUrl: "https://stellar.expert/explorer/public",
  // Default to the destination picker so the Soroban-empty-state cases below
  // behave as before; the source picker is covered by a dedicated test.
  isDestination: true,
};

describe("SwapPickerSections", () => {
  it("idle: renders Your tokens then Popular sections in order", () => {
    render(
      <SwapPickerSections
        {...baseProps}
        searchTerm=""
        result={{
          ...emptyResult,
          yourTokens: [rec("USDC", true)],
          popular: [rec("AQUA")],
        }}
      />,
    );

    const headers = screen.getAllByTestId(/^swap-section-/);
    expect(headers[0]).toHaveAttribute(
      "data-testid",
      "swap-section-your-tokens",
    );
    expect(headers[1]).toHaveAttribute("data-testid", "swap-section-popular");
    expect(screen.getByTestId("row-USDC")).toBeInTheDocument();
    expect(screen.getByTestId("row-AQUA")).toBeInTheDocument();
  });

  it("new account: renders Popular only (no Your tokens header)", () => {
    render(
      <SwapPickerSections
        {...baseProps}
        searchTerm=""
        result={{ ...emptyResult, isNewAccount: true, popular: [rec("AQUA")] }}
      />,
    );

    expect(screen.queryByTestId("swap-section-your-tokens")).toBeNull();
    expect(screen.getByTestId("swap-section-popular")).toBeInTheDocument();
  });

  it("search active: renders Verified + Unverified with (i) info icons", () => {
    render(
      <SwapPickerSections
        {...baseProps}
        searchTerm="aq"
        result={{
          ...emptyResult,
          verified: [rec("AQUA")],
          unverified: [rec("SCAM")],
        }}
      />,
    );

    expect(
      screen.getByTestId("swap-section-verified-info"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("swap-section-unverified-info"),
    ).toBeInTheDocument();

    // tapping (i) opens the verified info sheet
    fireEvent.click(screen.getByTestId("swap-section-verified-info"));
    expect(screen.getByTestId("verified-token-info-sheet")).toBeInTheDocument();
  });

  it("generic empty state shows the search term", () => {
    render(
      <SwapPickerSections
        {...baseProps}
        searchTerm="zzz"
        result={emptyResult}
      />,
    );

    expect(screen.getByTestId("swap-picker-empty")).toHaveTextContent(
      "No tokens match zzz",
    );
  });

  it("Soroban empty state shown when hadSorobanMatches", () => {
    render(
      <SwapPickerSections
        {...baseProps}
        searchTerm="CABC"
        result={{ ...emptyResult, hadSorobanMatches: true }}
      />,
    );

    expect(screen.getByTestId("swap-picker-empty-soroban")).toBeInTheDocument();
  });

  it("Soroban empty state shown when the search term is a contract id with no results", () => {
    render(
      <SwapPickerSections
        {...baseProps}
        // A pasted contract id that returned no records (hadSorobanMatches false)
        searchTerm="CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA"
        result={{ ...emptyResult, hadSorobanMatches: false }}
      />,
    );

    expect(screen.getByTestId("swap-picker-empty-soroban")).toBeInTheDocument();
    expect(screen.queryByTestId("swap-picker-empty")).toBeNull();
  });

  it("source picker: a pasted contract id with no matches shows the generic empty state, not the Soroban one", () => {
    render(
      <SwapPickerSections
        {...baseProps}
        isDestination={false}
        searchTerm="CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA"
        result={{ ...emptyResult, hadSorobanMatches: false }}
      />,
    );

    // The Soroban "not supported" copy only makes sense on the swap-TO picker.
    expect(screen.queryByTestId("swap-picker-empty-soroban")).toBeNull();
    expect(screen.getByTestId("swap-picker-empty")).toBeInTheDocument();
  });

  it("soft fallback notice rendered when isFallback", () => {
    render(
      <SwapPickerSections
        {...baseProps}
        searchTerm=""
        result={{
          ...emptyResult,
          isFallback: true,
          yourTokens: [rec("USDC", true)],
        }}
      />,
    );

    expect(
      screen.getByTestId("swap-picker-fallback-notice"),
    ).toBeInTheDocument();
  });

  it("keeps held Your tokens visible but excludes hiddenAssets from discover sections", () => {
    render(
      <SwapPickerSections
        {...baseProps}
        searchTerm=""
        hiddenAssets={["XLM:G123", "AQUA:G123"]}
        result={{
          ...emptyResult,
          yourTokens: [rec("XLM", true), rec("USDC", true)],
          popular: [rec("AQUA"), rec("DOGET")],
        }}
      />,
    );

    // "Your tokens" is never filtered — the held XLM stays visible even though
    // it is the hidden (already-selected) source asset.
    expect(screen.getByTestId("row-XLM")).toBeInTheDocument();
    expect(screen.getByTestId("row-USDC")).toBeInTheDocument();
    // Discover sections still drop hidden assets (AQUA) but keep the rest.
    expect(screen.queryByTestId("row-AQUA")).toBeNull();
    expect(screen.getByTestId("row-DOGET")).toBeInTheDocument();
  });

  it("idle + new account + no popular: renders nothing (no generic empty state)", () => {
    render(
      <SwapPickerSections
        {...baseProps}
        searchTerm=""
        result={{
          ...emptyResult,
          isNewAccount: true,
          popular: [],
        }}
      />,
    );

    // Generic empty state with "No tokens match" should not render
    expect(screen.queryByTestId("swap-picker-empty")).toBeNull();
    // No sections should render
    expect(screen.queryByTestId(/^swap-section-/)).toBeNull();
  });
});
