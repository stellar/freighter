import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { EditSettings } from "../index";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("EditSettings", () => {
  const defaultProps = {
    fee: "0.00005",
    defaultFee: "0.00001",
    timeout: 30,
    congestion: "Low",
    title: "Send Settings",
    onClose: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resets the fee input to the default fee", () => {
    render(<EditSettings {...defaultProps} />);

    const feeInput = screen.getByTestId("edit-tx-settings-fee-input");
    fireEvent.change(feeInput, { target: { value: "0.00009" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Default" })[0]);

    expect(feeInput).toHaveValue("0.00001");
  });

  it("disables save when the fee input is empty", () => {
    render(<EditSettings {...defaultProps} />);

    const feeInput = screen.getByTestId("edit-tx-settings-fee-input");
    fireEvent.change(feeInput, { target: { value: "" } });

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
