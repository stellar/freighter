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
jest.mock("../../SwapTokenRow", () => ({
  SwapTokenRow: ({ code }: { code: string }) => (
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
