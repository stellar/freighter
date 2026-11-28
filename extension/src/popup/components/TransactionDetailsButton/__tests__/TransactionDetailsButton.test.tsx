import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { TransactionDetailsButton } from "popup/components/TransactionDetailsButton";

describe("TransactionDetailsButton", () => {
  it("is a button that opens the details", () => {
    const onClick = jest.fn();
    render(<TransactionDetailsButton onClick={onClick} testId="details-btn" />);

    const button = screen.getByRole("button", { name: "Transaction details" });
    expect(button).toBe(screen.getByTestId("details-btn"));
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps a caller's class for its spacing", () => {
    render(
      <TransactionDetailsButton onClick={jest.fn()} className="Screen__btn" />,
    );

    expect(screen.getByRole("button")).toHaveClass(
      "TransactionDetailsButton",
      "Screen__btn",
    );
  });
});
