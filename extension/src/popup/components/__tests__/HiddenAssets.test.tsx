import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BigNumber from "bignumber.js";

import {
  HiddenAssets,
  getHiddenAssetRows,
} from "popup/components/manageAssets/HiddenAssets";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { mockAccounts, TEST_PUBLIC_KEY, Wrapper } from "../../__testHelpers__";

const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const USDC_CANONICAL = `USDC:${USDC_ISSUER}`;
const KALE_CONTRACT =
  "CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ";
const KALE_CANONICAL = `KALE:${KALE_CONTRACT}`;

const balances = {
  balances: [
    {
      token: { type: "native", code: "XLM" },
      total: new BigNumber("50"),
      available: new BigNumber("50"),
    },
    {
      token: { code: "USDC", issuer: { key: USDC_ISSUER } },
      total: new BigNumber("100"),
      available: new BigNumber("100"),
    },
    {
      contractId: KALE_CONTRACT,
      symbol: "KALE",
      decimals: 7,
      total: new BigNumber("10"),
      available: new BigNumber("10"),
    },
    {
      liquidityPoolId: "lp-1",
      reserves: [],
      total: new BigNumber("1"),
      available: new BigNumber("1"),
    },
  ],
  isFunded: true,
  subentryCount: 2,
} as unknown as AccountBalances;

const state = {
  auth: {
    error: null,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    publicKey: TEST_PUBLIC_KEY,
    allAccounts: mockAccounts,
  },
  settings: {
    networkDetails: TESTNET_NETWORK_DETAILS,
  },
};

describe("getHiddenAssetRows", () => {
  it("keeps only the hidden classic and contract balances", () => {
    const rows = getHiddenAssetRows(
      balances.balances,
      (canonical) =>
        canonical === USDC_CANONICAL || canonical === KALE_CANONICAL,
    );

    expect(rows).toEqual([
      { code: "USDC", issuer: USDC_ISSUER, canonicalAsset: USDC_CANONICAL },
      { code: "KALE", issuer: KALE_CONTRACT, canonicalAsset: KALE_CANONICAL },
    ]);
  });

  it("never lists the native asset or LP shares", () => {
    expect(getHiddenAssetRows(balances.balances, () => true)).toHaveLength(2);
  });

  it("copes with missing balances", () => {
    expect(getHiddenAssetRows(undefined, () => true)).toEqual([]);
  });
});

describe("HiddenAssets", () => {
  it("renders the empty state when nothing is hidden", async () => {
    render(
      <Wrapper state={state} routes={[ROUTES.searchAsset]}>
        <HiddenAssets
          isOpen
          onClose={jest.fn()}
          balances={balances}
          isAssetHidden={() => false}
          onUnhide={jest.fn()}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Hidden tokens")).toBeInTheDocument();
    });
    expect(screen.getByTestId("hidden-assets-empty")).toHaveTextContent(
      "No hidden tokens",
    );
  });

  it("lists hidden tokens and unhides one from its row", async () => {
    const onUnhide = jest.fn();

    render(
      <Wrapper state={state} routes={[ROUTES.searchAsset]}>
        <HiddenAssets
          isOpen
          onClose={jest.fn()}
          balances={balances}
          isAssetHidden={(canonical) => canonical === USDC_CANONICAL}
          onUnhide={onUnhide}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("hidden-asset-USDC")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("hidden-asset-KALE")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("hidden-asset-unhide-USDC"));

    expect(onUnhide).toHaveBeenCalledWith({
      code: "USDC",
      canonicalAsset: USDC_CANONICAL,
    });
  });

  it("keeps the sheet closed until opened", () => {
    render(
      <Wrapper state={state} routes={[ROUTES.searchAsset]}>
        <HiddenAssets
          isOpen={false}
          onClose={jest.fn()}
          balances={balances}
          isAssetHidden={() => true}
          onUnhide={jest.fn()}
        />
      </Wrapper>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hidden-assets")).not.toBeInTheDocument();
  });
});
