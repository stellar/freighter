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

  it("renders the 0.5 XLM reserve line and the refundable line", () => {
    const onClose = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <TrustlineInfoSheet tokenCode="USDC" onClose={onClose} />
      </Wrapper>,
    );
    expect(
      screen.getByText(
        "To hold a new asset, your account locks a one-time 0.5 XLM reserve for its trustline.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This reserve is refundable. Remove the trustline later to get it back.",
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
