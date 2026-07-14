import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { PercentageButtons } from "popup/components/amount/PercentageButtons";

describe("PercentageButtons", () => {
  it("renders 25/50/75/Max and fires onSelect with the right percentage", () => {
    const onSelect = jest.fn();
    render(<PercentageButtons onSelect={onSelect} />);

    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByTestId("SendAmountSetMax")).toBeInTheDocument();

    fireEvent.click(screen.getByText("25%"));
    fireEvent.click(screen.getByText("50%"));
    fireEvent.click(screen.getByText("75%"));
    fireEvent.click(screen.getByTestId("SendAmountSetMax"));

    expect(onSelect.mock.calls.map((c) => c[0])).toEqual([25, 50, 75, 100]);
  });
});
