import React from "react";
import { render, screen } from "@testing-library/react";

import { AccountPositions } from "popup/components/account/AccountPositions";
import { TEST_PUBLIC_KEY, Wrapper } from "popup/__testHelpers__";

const renderTab = (
  props: Partial<React.ComponentProps<typeof AccountPositions>>,
) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <AccountPositions
        positions={null}
        isLoading={false}
        hasError={false}
        {...props}
      />
    </Wrapper>,
  );

describe("AccountPositions", () => {
  it("spins while the request is in flight", () => {
    renderTab({ isLoading: true });

    expect(screen.getByTestId("account-positions-loader")).toBeInTheDocument();
    expect(screen.queryByText("No positions yet")).not.toBeInTheDocument();
  });

  it("shows an error rather than claiming the account has none", () => {
    // "Could not load" and "you have none" are different answers. Rendering the
    // empty state on a failure would assert something we do not know.
    renderTab({ hasError: true });

    expect(screen.getByTestId("account-positions-error")).toBeInTheDocument();
    expect(screen.queryByText("No positions yet")).not.toBeInTheDocument();
  });

  it("shows the empty state once a request lands with nothing", () => {
    renderTab({
      positions: {
        address: TEST_PUBLIC_KEY,
        totalValueUsd: null,
        netApy: null,
        positions: [],
        backstop: [],
      },
    });

    expect(screen.getByText("No positions yet")).toBeInTheDocument();
  });
});
