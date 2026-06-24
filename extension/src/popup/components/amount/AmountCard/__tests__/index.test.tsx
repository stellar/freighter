import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import { AmountCard } from "popup/components/amount/AmountCard";
import { SecurityLevel } from "popup/constants/blockaid";

const baseProps = {
  label: "Sending",
  availableBalanceText: "100 XLM available",
  availableBalanceFontSizePx: 14,
  inputType: "crypto" as const,
  amount: "5",
  amountUsd: "0.00",
  amountFontSizeClass: "lg" as const,
  assetCode: "XLM",
  assetIcon: null,
  assetIcons: {},
  assetIssuerKey: undefined,
  supportsUsd: false,
  fiatLineText: "",
  isAmountTooHigh: false,
  cryptoDecimals: 7,
  onAmountChange: jest.fn(),
  onAmountUsdChange: jest.fn(),
  onToggleInputType: jest.fn(),
  onSelectAsset: jest.fn(),
};

describe("AmountCard", () => {
  it("renders the label, balance line and asset code", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard {...baseProps} />
      </Wrapper>,
    );
    expect(screen.getByText("Sending")).toBeInTheDocument();
    expect(screen.getByText("100 XLM available")).toBeInTheDocument();
    expect(screen.getByText("XLM")).toBeInTheDocument();
  });

  it("fires onAmountChange when the crypto input changes", () => {
    const onAmountChange = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard {...baseProps} amount="" onAmountChange={onAmountChange} />
      </Wrapper>,
    );
    fireEvent.change(screen.getByTestId("send-amount-amount-input"), {
      target: { value: "12" },
    });
    expect(onAmountChange).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "12" }),
    );
  });

  it("overlays the scam-asset badge when securityLevel is MALICIOUS", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard {...baseProps} securityLevel={SecurityLevel.MALICIOUS} />
      </Wrapper>,
    );
    expect(screen.getByTestId("ScamAssetIcon")).toBeInTheDocument();
  });

  it("renders the too-high error when isAmountTooHigh is true", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard {...baseProps} isAmountTooHigh />
      </Wrapper>,
    );
    expect(
      screen.getByText("You don’t have enough {{asset}} in your account"),
    ).toBeInTheDocument();
  });
});
