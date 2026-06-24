import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { XlmReserveSheet } from "../index";
import { openTab } from "popup/helpers/navigate";

jest.mock("popup/helpers/navigate", () => ({
  openTab: jest.fn(),
}));

const PUBLIC_KEY = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const HELP_URL = "https://example.test/why-xlm";

describe("XlmReserveSheet", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders the Swap-for-0.5-XLM action when a source qualifies", () => {
    const onSwapForReserve = jest.fn();
    render(
      <XlmReserveSheet
        canSwapForReserve
        onSwapForReserve={onSwapForReserve}
        publicKey={PUBLIC_KEY}
        helpUrl={HELP_URL}
        onClose={jest.fn()}
      />,
    );
    const btn = screen.getByTestId("XlmReserveSheet__swap-for-reserve");
    fireEvent.click(btn);
    expect(onSwapForReserve).toHaveBeenCalledTimes(1);
  });

  it("hides the Swap-for-0.5-XLM action when no source qualifies", () => {
    render(
      <XlmReserveSheet
        canSwapForReserve={false}
        publicKey={PUBLIC_KEY}
        helpUrl={HELP_URL}
        onClose={jest.fn()}
      />,
    );
    expect(
      screen.queryByTestId("XlmReserveSheet__swap-for-reserve"),
    ).toBeNull();
  });

  it("opens the help article in a new tab", () => {
    render(
      <XlmReserveSheet
        canSwapForReserve={false}
        publicKey={PUBLIC_KEY}
        helpUrl={HELP_URL}
        onClose={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("XlmReserveSheet__why-xlm"));
    expect(openTab).toHaveBeenCalledWith(HELP_URL);
  });
});
