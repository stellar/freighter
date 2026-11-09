import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

  it("resets the timeout input to the default timeout, not the saved one", () => {
    // defaultProps saves a custom 30s timeout
    render(<EditSettings {...defaultProps} />);

    const timeoutInput = screen.getByLabelText("Timeout (seconds)");
    fireEvent.change(timeoutInput, { target: { value: "45" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Default" })[1]);

    expect(timeoutInput).toHaveValue("180");
  });

  it.each(["0", ""])("rejects a timeout of %j", async (timeout) => {
    render(<EditSettings {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Timeout (seconds)"), {
      target: { value: timeout },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Timeout must be greater than 0"),
    ).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a timeout above a day", async () => {
    render(<EditSettings {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Timeout (seconds)"), {
      target: { value: "86401" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Timeout must be at most 86400 seconds"),
    ).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("saves a timeout of 86400 seconds", async () => {
    render(<EditSettings {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Timeout (seconds)"), {
      target: { value: "86400" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 86400 }),
      ),
    );
  });

  it("saves a timeout of 1 second", async () => {
    render(<EditSettings {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Timeout (seconds)"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 1 }),
      ),
    );
  });

  it.each([".", "0", "0.0000099"])("rejects a fee of %j", async (fee) => {
    render(<EditSettings {...defaultProps} />);

    fireEvent.change(screen.getByTestId("edit-tx-settings-fee-input"), {
      target: { value: fee },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Fee must be at least 0.00001 XLM"),
    ).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("saves the network minimum fee", async () => {
    render(<EditSettings {...defaultProps} />);

    fireEvent.change(screen.getByTestId("edit-tx-settings-fee-input"), {
      target: { value: "0.00001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ fee: "0.00001" }),
      ),
    );
  });

  it("disables save when the fee input is empty", () => {
    render(<EditSettings {...defaultProps} />);

    const feeInput = screen.getByTestId("edit-tx-settings-fee-input");
    fireEvent.change(feeInput, { target: { value: "" } });

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
