import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import { WalletRow } from "popup/components/account/WalletRow";

const PUBLIC_KEY = "GDF3ZEFYPUBLICKEYFORTESTINGONLYAAAAAAAAAAAAAAAAAAAAAAAAA";

const renderRow = (props: Partial<React.ComponentProps<typeof WalletRow>>) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <WalletRow
        isFetchingTokenPrices={false}
        hasPriceFeed
        accountName="Account 1"
        isImported={false}
        isSelected={false}
        publicKey={PUBLIC_KEY}
        onClick={() => {}}
        {...props}
      />
    </Wrapper>,
  );

describe("WalletRow balance cell", () => {
  it("shows a spinner while this account's total is still pending", () => {
    renderRow({ accountValue: undefined, isFetchingTokenPrices: true });

    expect(
      screen.getByTestId("wallet-row-balance-spinner"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("wallet-row-balance")).not.toHaveTextContent("$");
  });

  it("shows the total once it has arrived, even while other rows load", () => {
    // Totals arrive in batches, so a resolved row must render its value while
    // the global fetching flag is still true for the accounts behind it.
    renderRow({ accountValue: "$1,149.23", isFetchingTokenPrices: true });

    expect(screen.getByTestId("wallet-row-balance")).toHaveTextContent(
      "$1,149.23",
    );
    expect(
      screen.queryByTestId("wallet-row-balance-spinner"),
    ).not.toBeInTheDocument();
  });

  it("shows $0.00 where the network has no price feed", () => {
    // No prices exist to fetch, so zero is the accurate total rather than a
    // stand-in for one that could not be read.
    renderRow({
      accountValue: undefined,
      isFetchingTokenPrices: false,
      hasPriceFeed: false,
    });

    expect(screen.getByTestId("wallet-row-balance")).toHaveTextContent("$0.00");
    expect(
      screen.queryByTestId("wallet-row-balance-spinner"),
    ).not.toBeInTheDocument();
  });

  it("shows -- for an account whose fetch failed", () => {
    // "" is what the data hook writes when a per-account fetch throws. On a
    // network that does price tokens, that is an unknown total, not zero.
    renderRow({ accountValue: "", isFetchingTokenPrices: false });

    const cell = screen.getByTestId("wallet-row-balance");
    expect(cell).toHaveTextContent("--");
    expect(cell).not.toHaveTextContent("$");
  });

  it("keeps showing the spinner for a failed row while the cycle runs", () => {
    // "" is indistinguishable from "not yet fetched" here, and the remaining
    // batches may still resolve, so the row keeps spinning until they do.
    renderRow({ accountValue: "", isFetchingTokenPrices: true });

    expect(
      screen.getByTestId("wallet-row-balance-spinner"),
    ).toBeInTheDocument();
  });

  it("still reports the selected account and fires onClick", () => {
    const onClick = jest.fn();
    renderRow({ accountValue: "$1.00", isSelected: true, onClick });

    expect(screen.getByTestId("wallet-row-select")).toHaveAttribute(
      "aria-current",
      "true",
    );
    fireEvent.click(screen.getByTestId("wallet-row-select"));
    expect(onClick).toHaveBeenCalledWith(PUBLIC_KEY);
  });
});
