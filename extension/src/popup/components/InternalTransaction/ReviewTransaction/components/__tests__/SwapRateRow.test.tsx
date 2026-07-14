import React from "react";
import { render, screen } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import {
  SwapRateRow,
  getRateValueFontSizePx,
} from "popup/components/InternalTransaction/ReviewTransaction/components/SwapRateRow";

describe("getRateValueFontSizePx", () => {
  it("keeps the base size for short rate values", () => {
    expect(getRateValueFontSizePx("1 XLM ≈ 0.5 USDC")).toBe(14);
  });

  it("steps the font-size down as the value grows", () => {
    expect(getRateValueFontSizePx("x".repeat(30))).toBe(13);
    expect(getRateValueFontSizePx("x".repeat(40))).toBe(12);
    expect(getRateValueFontSizePx("x".repeat(60))).toBe(11);
  });
});

describe("SwapRateRow", () => {
  const renderRow = (
    props: Partial<React.ComponentProps<typeof SwapRateRow>>,
  ) =>
    render(
      <Wrapper state={{}} routes={["/"]}>
        <SwapRateRow
          srcCode="XLM"
          dstCode="USDC"
          sendAmount="2"
          destinationAmount="1"
          {...props}
        />
      </Wrapper>,
    );

  it("renders the rate value and the rate-row layout modifier", () => {
    const { container } = renderRow({});
    const value = screen.getByTestId("review-tx-rate");
    expect(value).toHaveTextContent("1 XLM ≈ 0.5 USDC");
    expect(
      container.querySelector(".ReviewTx__Details__Row--rate"),
    ).toBeInTheDocument();
  });

  it("derives the value font-size from the rendered rate length", () => {
    renderRow({
      srcCode: "LONGTOKENA",
      dstCode: "LONGTOKENB",
      sendAmount: "3",
      destinationAmount: "1",
    });
    const value = screen.getByTestId("review-tx-rate");
    // The applied font-size matches the scale for whatever rate string renders,
    // so a longer rate is automatically shrunk without cropping.
    expect(value.style.fontSize).toBe(
      `${getRateValueFontSizePx(value.textContent || "")}px`,
    );
  });
});
