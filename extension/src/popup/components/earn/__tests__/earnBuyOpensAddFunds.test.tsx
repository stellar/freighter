import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { NetworkFeeSheet } from "popup/components/earn/EarnAmount/NetworkFeeSheet";
import { NotEnoughTokenSheet } from "popup/components/earn/EarnTokenPicker/NotEnoughTokenSheet";
import { NotEnoughVariant } from "popup/constants/earn";
import { ROUTES } from "popup/constants/routes";
import { trackEarnFundingActionSelected } from "popup/metrics/earn";
import { Wrapper } from "popup/__testHelpers__";

jest.mock("popup/metrics/earn", () => ({
  ...jest.requireActual("popup/metrics/earn"),
  trackEarnFundingActionSelected: jest.fn(),
}));

/** Renders where the router is, so a test can read where Buy went. */
const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
};

const renderAt = (sheet: React.ReactNode) =>
  render(
    <Wrapper
      routes={[ROUTES.earn]}
      state={{ settings: { networkDetails: MAINNET_NETWORK_DETAILS } }}
    >
      {sheet}
      <LocationProbe />
    </Wrapper>,
  );

const usdc = {
  assetId: "CUSDC",
  code: "USDC",
  issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  decimals: 7,
  total: "0",
  hasTrustline: false,
  apy: 0.1694,
  poolId: "CPOOL",
};

// Buy goes through the Add Funds screen, as on mobile, rather than opening
// Coinbase straight from the sheet: the screen is where a Coinbase session
// that can't be opened is reported, and where receiving is offered too.
describe("Earn's Buy buttons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("open Add Funds on the token from the Not enough sheet", async () => {
    renderAt(
      <NotEnoughTokenSheet
        option={usdc}
        variant={NotEnoughVariant.BUY_OR_TRANSFER}
        onClose={jest.fn()}
        onSwap={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByTestId("earn-not-enough-buy"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      `${ROUTES.addFunds}?token=USDC`,
    );
    expect(trackEarnFundingActionSelected).toHaveBeenCalledWith({
      assetCode: "USDC",
      action: "buy",
    });
  });

  it("open Add Funds on XLM from the network fee sheet", async () => {
    renderAt(<NetworkFeeSheet onClose={jest.fn()} canBuyXlm />);

    await userEvent.click(screen.getByTestId("earn-network-fee-buy"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      `${ROUTES.addFunds}?token=XLM`,
    );
  });
});
