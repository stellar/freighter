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

  it("falls back to $0.00 when there is no price data at all", () => {
    // The non-Mainnet case: the hook never fetches, so there is no entry for
    // this account and nothing is loading. The cell must not be left blank.
    renderRow({ accountValue: undefined, isFetchingTokenPrices: false });

    expect(screen.getByTestId("wallet-row-balance")).toHaveTextContent("$0.00");
    expect(
      screen.queryByTestId("wallet-row-balance-spinner"),
    ).not.toBeInTheDocument();
  });

  it("falls back to $0.00 for an account whose fetch failed", () => {
    // The data hook writes "" when a per-account fetch throws; once the cycle
    // finishes that must read as a zero total, not an empty cell.
    renderRow({ accountValue: "", isFetchingTokenPrices: false });

    expect(screen.getByTestId("wallet-row-balance")).toHaveTextContent("$0.00");
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
