import React from "react";
import { render, screen } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import { Summary } from "../index";

describe("Summary memo row", () => {
  const baseProps = {
    operationNames: ["payment"],
    fee: "100",
    sequenceNumber: "12345",
    xdr: "AAAABBBB",
  };

  it("hides the Memo row when there is no memo (matches mobile)", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <Summary {...baseProps} />
      </Wrapper>,
    );
    expect(screen.queryByTestId("MemoBlock")).toBeNull();
    expect(screen.queryByText("Memo")).toBeNull();
  });

  it("shows the Memo row with value and type when a memo is present", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <Summary {...baseProps} memo={{ value: "hello", type: "text" }} />
      </Wrapper>,
    );
    const memoBlock = screen.getByTestId("MemoBlock");
    expect(memoBlock).toHaveTextContent("hello");
    expect(memoBlock).toHaveTextContent("(MEMO_TEXT)");
  });
});
