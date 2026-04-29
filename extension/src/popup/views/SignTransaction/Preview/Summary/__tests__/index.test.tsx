import React from "react";
import { render, screen } from "@testing-library/react";

import { Summary } from "popup/views/SignTransaction/Preview/Summary";

describe("SignTransaction/Preview/Summary memo display", () => {
  const baseProps = {
    operationNames: ["payment"],
    fee: "1000",
    sequenceNumber: "1",
    xdr: "AAAA",
  };

  it("renders the memo value with a truncating wrapper inside MemoBlock", () => {
    const longMemo = "a".repeat(80);
    render(
      <Summary {...baseProps} memo={{ value: longMemo, type: "text" }} />,
    );

    const memoBlock = screen.getByTestId("MemoBlock");
    expect(memoBlock).toBeInTheDocument();
    expect(memoBlock.textContent).toContain(longMemo);
    expect(memoBlock.textContent).toContain("MEMO_TEXT");

    const wrapper = memoBlock.querySelector(".TxInfoBlock__memo");
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveTextContent(longMemo);
  });

  it("sets the title attribute to the memo value when present", () => {
    const memoValue = "important payment reference";
    render(
      <Summary {...baseProps} memo={{ value: memoValue, type: "text" }} />,
    );

    const wrapper = screen
      .getByTestId("MemoBlock")
      .querySelector(".TxInfoBlock__memo");
    expect(wrapper).toHaveAttribute("title", memoValue);
  });

  it("omits the title attribute when memo is missing", () => {
    render(<Summary {...baseProps} />);

    const memoBlock = screen.getByTestId("MemoBlock");
    expect(memoBlock.textContent).toContain("None");

    const wrapper = memoBlock.querySelector(".TxInfoBlock__memo");
    expect(wrapper).not.toBeNull();
    expect(wrapper).not.toHaveAttribute("title");
  });

  it("omits the title attribute when memo is whitespace-only", () => {
    render(
      <Summary {...baseProps} memo={{ value: "   ", type: "text" }} />,
    );

    const wrapper = screen
      .getByTestId("MemoBlock")
      .querySelector(".TxInfoBlock__memo");
    expect(wrapper).not.toBeNull();
    expect(wrapper).not.toHaveAttribute("title");
  });
});
