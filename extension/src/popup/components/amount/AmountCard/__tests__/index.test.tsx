import React from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";

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
    // The test i18n returns the key un-interpolated; the max-spendable amount
    // and symbol are interpolated at runtime.
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
    expect(screen.getByText("--")).toBeInTheDocument();
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
    // onFocus must NOT call select() — doing so highlights the whole amount
    // on the first toggle, which diverges from the crypto input's behavior.
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
    expect(screen.getByTestId("send-amount-amount-input")).toBeDisabled();
    fireEvent.click(screen.getByTestId("send-amount-edit-dest-asset"));
    expect(onSelectAsset).toHaveBeenCalledTimes(1);
  });

  // jsdom has no layout, so the mirrors' widths and the observer are stubbed.
  describe("input width", () => {
    const OriginalResizeObserver = global.ResizeObserver;
    let resizeCallbacks: ResizeObserverCallback[];
    let mirrorWidth: number;
    let offsetWidthSpy: jest.SpyInstance;

    beforeEach(() => {
      resizeCallbacks = [];
      global.ResizeObserver = class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallbacks.push(callback);
        }

        observe() {}

        unobserve() {}

        disconnect() {}
      } as unknown as typeof ResizeObserver;
      mirrorWidth = 0;
      offsetWidthSpy = jest
        .spyOn(HTMLElement.prototype, "offsetWidth", "get")
        .mockImplementation(() => mirrorWidth);
    });

    afterEach(() => {
      global.ResizeObserver = OriginalResizeObserver;
      offsetWidthSpy.mockRestore();
    });

    const renderCard = (amount: string) => (
      <Wrapper state={{}} routes={["/"]}>
        <AmountCard {...baseProps} amount={amount} />
      </Wrapper>
    );

    // Earn keeps its deposit screen mounted under a display: none step while a
    // swap resets the amount. Measured there, the mirror is 0 wide, and the
    // input kept that width once the screen was back, clipping its "0".
    it("re-sizes the input once a card hidden during a value change is shown", () => {
      mirrorWidth = 11;
      const { rerender } = render(renderCard("5"));
      const input = screen.getByTestId("send-amount-amount-input");
      expect(input).toHaveStyle({ width: "13px" });

      mirrorWidth = 0;
      rerender(renderCard(""));
      expect(input).toHaveStyle({ width: "2px" });

      mirrorWidth = 13;
      act(() => {
        resizeCallbacks.forEach((callback) =>
          callback([], {} as ResizeObserver),
        );
      });
      expect(input).toHaveStyle({ width: "15px" });
    });
  });
});
