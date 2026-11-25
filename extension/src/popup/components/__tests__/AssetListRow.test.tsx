import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { AssetListRow } from "popup/components/AssetListRow";

jest.mock("popup/components/account/AccountAssets", () => ({
  AssetIcon: () => null,
}));

describe("AssetListRow", () => {
  it("makes a clickable body reachable and operable from the keyboard", () => {
    const onClick = jest.fn();
    render(<AssetListRow code="USDC" bodyTestId="row-body" onClick={onClick} />);

    const body = screen.getByTestId("row-body");
    expect(body.getAttribute("role")).toBe("button");
    expect(body.getAttribute("tabindex")).toBe("0");

    fireEvent.keyDown(body, { key: "Enter" });
    fireEvent.keyDown(body, { key: "Enter", repeat: true });
    fireEvent.keyDown(body, { key: " " });
    fireEvent.keyDown(body, { key: "a" });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("leaves a body without a click handler out of the tab order", () => {
    render(<AssetListRow code="USDC" bodyTestId="row-body" />);

    const body = screen.getByTestId("row-body");
    expect(body.getAttribute("role")).toBeNull();
    expect(body.getAttribute("tabindex")).toBeNull();
  });
});
