import React from "react";
import { render, screen } from "@testing-library/react";

import { Asset, Networks } from "stellar-sdk";

import { AssetAbout } from "popup/components/account/AssetAbout";

const CLASSIC_ISSUER =
  "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const CONTRACT_ID = "CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ";
const PUBNET_PASSPHRASE = Networks.PUBLIC;
/** XLM's own Stellar Asset Contract on pubnet — a contract id that is native. */
const NATIVE_SAC = Asset.native().contractId(PUBNET_PASSPHRASE);

describe("AssetAbout", () => {
  it("renders issuer, type, and domain for a classic asset", () => {
    render(
      <AssetAbout
        networkPassphrase={PUBNET_PASSPHRASE}
        token={`USDC:${CLASSIC_ISSUER}`}
        assetDomain="centre.io"
      />,
    );

    expect(screen.getByTestId("AssetAbout")).toBeDefined();
    expect(screen.getByText("Issuer")).toBeInTheDocument();
    expect(screen.getByTestId("AssetAbout__issuer").textContent).toContain(
      "GCK3",
    );
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Stellar Classic")).toBeInTheDocument();
    expect(screen.getByText("Domain")).toBeInTheDocument();
    expect(screen.getByText("centre.io")).toBeInTheDocument();
  });

  it("renders the contract id and Soroban type for a contract token", () => {
    render(
      <AssetAbout
        networkPassphrase={PUBNET_PASSPHRASE}
        token={`DT:${CONTRACT_ID}`}
        assetDomain=""
      />,
    );

    expect(screen.getByTestId("AssetAbout__issuer").textContent).toContain(
      "CCXV",
    );
    expect(screen.getByText("Soroban")).toBeInTheDocument();
    // No domain data — the row is omitted, not rendered empty.
    expect(screen.queryByText("Domain")).toBeNull();
  });

  it("finds the contract id of a token whose symbol contains a colon", () => {
    render(
      <AssetAbout
        networkPassphrase={PUBNET_PASSPHRASE}
        token={`A:B:${CONTRACT_ID}`}
        assetDomain=""
      />,
    );

    expect(screen.getByTestId("AssetAbout__issuer").textContent).toBe(
      "IssuerCCXV…NGBJ",
    );
    expect(screen.getByText("Soroban")).toBeInTheDocument();
  });

  it("classifies a bare contract id as Soroban, like the analytics dimension", () => {
    // Both client forms of a contract token exist; the About card must agree
    // with `getTokenType` (which drives `token_type` on token_chart.loaded)
    // rather than re-deriving classification from a colon split.
    render(
      <AssetAbout
        networkPassphrase={PUBNET_PASSPHRASE}
        token={CONTRACT_ID}
        assetDomain=""
      />,
    );

    expect(screen.getByText("Soroban")).toBeInTheDocument();
    expect(screen.queryByText("Stellar Classic")).toBeNull();
    expect(screen.getByTestId("AssetAbout__issuer").textContent).toContain(
      "CCXV",
    );
  });

  it("renders XLM with a Native type and no issuer row", () => {
    render(
      <AssetAbout
        networkPassphrase={PUBNET_PASSPHRASE}
        token="native"
        assetDomain=""
      />,
    );

    expect(screen.getByTestId("AssetAbout")).toBeDefined();
    expect(screen.queryByText("Issuer")).toBeNull();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Native")).toBeInTheDocument();
  });

  it("treats XLM's own SAC contract id as Native, not Soroban", () => {
    // The SAC is a contract id by shape, so a classifier that only looks at
    // the prefix labels native XLM "Soroban" here — on the card and in the
    // frozen `token_type` analytics dimension alike.
    render(
      <AssetAbout
        networkPassphrase={PUBNET_PASSPHRASE}
        token={NATIVE_SAC}
        assetDomain=""
      />,
    );

    expect(screen.getByText("Native")).toBeInTheDocument();
    expect(screen.queryByText("Soroban")).toBeNull();
  });

  it("shows no Issuer row for XLM's SAC in the SYMBOL:CONTRACTID form", () => {
    // Contract balances are canonicalized `symbol:contractId`, so the native
    // SAC reaches this card as `XLM:C…`. A colon check alone would render an
    // Issuer row under a Type row reading "Native".
    render(
      <AssetAbout
        networkPassphrase={PUBNET_PASSPHRASE}
        token={`XLM:${NATIVE_SAC}`}
        assetDomain=""
      />,
    );

    expect(screen.getByText("Native")).toBeInTheDocument();
    expect(screen.queryByText("Issuer")).toBeNull();
    expect(screen.queryByText("Soroban")).toBeNull();
  });

  it("renders no Domain row for useAssetDomain's single-space sentinel", () => {
    render(
      <AssetAbout
        networkPassphrase={PUBNET_PASSPHRASE}
        token={`USDC:${CLASSIC_ISSUER}`}
        assetDomain=" "
      />,
    );

    expect(screen.queryByText("Domain")).toBeNull();
  });

  it("still classifies a non-native contract id as Soroban", () => {
    render(
      <AssetAbout
        networkPassphrase={PUBNET_PASSPHRASE}
        token={CONTRACT_ID}
        assetDomain=""
      />,
    );

    expect(screen.getByText("Soroban")).toBeInTheDocument();
    expect(screen.queryByText("Native")).toBeNull();
  });
});
