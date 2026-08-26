import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { BlendCatalogPool } from "@shared/api/types/blend";
import { PoolDetailsSheet } from "popup/components/earn/PoolDetailsSheet";
import { BLEND_LENDING_DOCS_URL } from "popup/constants/externalLinks";
import { openTab } from "popup/helpers/navigate";
import { Wrapper } from "popup/__testHelpers__";

jest.mock("popup/helpers/navigate", () => ({
  ...jest.requireActual("popup/helpers/navigate"),
  openTab: jest.fn(),
}));

const pool: BlendCatalogPool = {
  id: "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD",
  name: "Fixed Pool v2",
  status: "ACTIVE",
  suppliedUsd: 50050000,
  borrowedUsd: 16150000,
  interestApy: 0.0424,
  netApy: 0.1694,
  backstopUsd: 1530000,
  reserves: [],
};

const renderSheet = (onClose = jest.fn()) =>
  render(
    <Wrapper
      routes={["/"]}
      state={{
        settings: { networkDetails: TESTNET_NETWORK_DETAILS, assetsLists: {} },
      }}
    >
      <PoolDetailsSheet pool={pool} onClose={onClose} />
    </Wrapper>,
  );

describe("PoolDetailsSheet", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders the pool-agnostic description for any pool", () => {
    renderSheet();
    expect(
      screen.getByText(
        "Deposit supported assets into this Blend pool to earn yield. APY may change over time. Withdraw anytime.",
      ),
    ).toBeInTheDocument();
  });

  it("opens Blend's lending docs in a new tab", () => {
    renderSheet();
    fireEvent.click(screen.getByTestId("earn-pool-docs-link"));
    expect(openTab).toHaveBeenCalledWith(BLEND_LENDING_DOCS_URL);
  });
});
