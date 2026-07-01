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

  it("renders the insufficient-balance error when isAmountTooHigh is true", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard {...baseProps} isAmountTooHigh maxSpendableText="12.34" />
      </Wrapper>,
    );
    // The test i18n returns the key un-interpolated; assert the new copy is in
    // use (the max-spendable amount + symbol are interpolated at runtime).
    expect(
      screen.getByText(
        "Insufficient balance. Maximum spendable: {{amount}} {{symbol}}",
      ),
    ).toBeInTheDocument();
  });

  it("shows the fiat line but no input-type toggle when read-only", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard
          {...baseProps}
          supportsUsd
          fiatLineText="$1.23"
          isReadOnly
        />
      </Wrapper>,
    );
    expect(screen.getByText("$1.23")).toBeInTheDocument();
    expect(screen.queryByTestId("amount-fiat-toggle")).toBeNull();
  });

  it("always shows the fiat line (e.g. '--') even when USD is unavailable, without a toggle", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard {...baseProps} supportsUsd={false} fiatLineText="--" />
      </Wrapper>,
    );
    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.queryByTestId("amount-fiat-toggle")).toBeNull();
  });

  it("shows '--' as the fiat amount (not '$0.00') when the token has no USD price in fiat mode", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard
          {...baseProps}
          inputType="fiat"
          amountUsd="0.00"
          hasUsdPrice={false}
          isReadOnly
          fiatLineText="6.28 WSGBP"
        />
      </Wrapper>,
    );
    // The main fiat amount renders "--" rather than the "$0.00" input.
    expect(screen.getByText("--")).toBeInTheDocument();
    // No fiat amount input is rendered for a priceless token.
    expect(screen.queryByTestId("send-amount-amount-input")).toBeNull();
  });

  it("shows the input-type toggle when not read-only and USD is supported", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard {...baseProps} supportsUsd fiatLineText="$1.23" />
      </Wrapper>,
    );
    expect(screen.getByTestId("amount-fiat-toggle")).toBeInTheDocument();
  });

  it("renders a '+ Select' affordance (no asset code) and still fires onSelectAsset", () => {
    const onSelectAsset = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard {...baseProps} assetCode="" onSelectAsset={onSelectAsset} />
      </Wrapper>,
    );
    expect(screen.getByText("Select")).toBeInTheDocument();
    expect(screen.queryByText("XLM")).toBeNull();
    fireEvent.click(screen.getByTestId("send-amount-edit-dest-asset"));
    expect(onSelectAsset).toHaveBeenCalledTimes(1);
  });

  it("does not select-all the fiat amount on focus (matches the crypto input)", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard
          {...baseProps}
          inputType="fiat"
          amountUsd="12.34"
          supportsUsd
          fiatLineText="$1.23"
        />
      </Wrapper>,
    );
    const input = screen.getByTestId(
      "send-amount-amount-input",
    ) as HTMLInputElement;
    fireEvent.focus(input);
    // The previous fiat-only onFocus={e => e.target.select()} highlighted the
    // whole amount on the first toggle; the selection must stay collapsed.
    expect(input.selectionStart).toBe(input.selectionEnd);
  });

  it("fires onInputFocus/onInputBlur when the amount input gains/loses focus", () => {
    const onInputFocus = jest.fn();
    const onInputBlur = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard
          {...baseProps}
          autoFocus={false}
          onInputFocus={onInputFocus}
          onInputBlur={onInputBlur}
        />
      </Wrapper>,
    );
    const input = screen.getByTestId("send-amount-amount-input");
    fireEvent.focus(input);
    expect(onInputFocus).toHaveBeenCalledTimes(1);
    fireEvent.blur(input);
    expect(onInputBlur).toHaveBeenCalledTimes(1);
  });

  it("does not throw on focus/blur when the callbacks are omitted", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard {...baseProps} />
      </Wrapper>,
    );
    const input = screen.getByTestId("send-amount-amount-input");
    expect(() => {
      fireEvent.focus(input);
      fireEvent.blur(input);
    }).not.toThrow();
  });

  it("fires onSelectAsset when asset selector is clicked even with isReadOnly", () => {
    const onSelectAsset = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard {...baseProps} isReadOnly onSelectAsset={onSelectAsset} />
      </Wrapper>,
    );
    // The amount input must be disabled.
    expect(screen.getByTestId("send-amount-amount-input")).toBeDisabled();
    // The asset-selector button must still be clickable.
    fireEvent.click(screen.getByTestId("send-amount-edit-dest-asset"));
    expect(onSelectAsset).toHaveBeenCalledTimes(1);
  });
});
