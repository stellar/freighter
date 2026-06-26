import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import { TrustlineInfoSheet } from "../TrustlineInfoSheet";

describe("TrustlineInfoSheet", () => {
  it("renders the info sheet", () => {
    const onClose = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <TrustlineInfoSheet tokenCode="USDC" onClose={onClose} />
      </Wrapper>,
    );
    expect(screen.getByTestId("trustline-info-sheet")).toBeInTheDocument();
  });

  it("renders the reserve explanation", () => {
    const onClose = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <TrustlineInfoSheet tokenCode="USDC" onClose={onClose} />
      </Wrapper>,
    );
    expect(
      screen.getByText(
        "To hold {{code}} in your wallet, Stellar requires a trustline. 0.5 XLM will be reserved from your balance. You can get it back by removing the trustline after your {{code}} balance is zero.",
      ),
    ).toBeInTheDocument();
  });

  it("fires onClose when the close button is clicked", () => {
    const onClose = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <TrustlineInfoSheet tokenCode="USDC" onClose={onClose} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByTestId("trustline-info-sheet-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
