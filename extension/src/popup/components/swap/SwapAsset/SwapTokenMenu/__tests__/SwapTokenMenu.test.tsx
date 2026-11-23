import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { openTab } from "popup/helpers/navigate";
import { SwapTokenMenu } from "../index";

jest.mock("popup/helpers/navigate", () => ({ openTab: jest.fn() }));

const EXPERT = "https://stellar.expert/explorer/public";

const viewOnExpert = (code: string, issuerKey: string) => {
  render(
    <SwapTokenMenu
      code={code}
      issuerKey={issuerKey}
      stellarExpertUrl={EXPERT}
    />,
  );
  fireEvent.click(screen.getByTestId(`SwapTokenRow-${code}-menu`));
  fireEvent.click(screen.getByTestId(`SwapTokenRow-${code}-view-expert`));
};

describe("SwapTokenMenu", () => {
  afterEach(() => jest.clearAllMocks());

  it("opens a classic asset's stellar.expert page", () => {
    const issuer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
    viewOnExpert("USDC", issuer);

    expect(openTab).toHaveBeenCalledWith(`${EXPERT}/asset/USDC-${issuer}`);
  });

  it("opens a contract token's stellar.expert contract page", () => {
    const contract = "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV";
    viewOnExpert("TKN", contract);

    expect(openTab).toHaveBeenCalledWith(`${EXPERT}/contract/${contract}`);
  });
});
