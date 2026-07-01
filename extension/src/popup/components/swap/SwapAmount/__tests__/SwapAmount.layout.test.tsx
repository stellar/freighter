import React from "react";
import { render, screen } from "@testing-library/react";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper } from "popup/__testHelpers__";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";

const swapData = {
  type: AppDataType.RESOLVED,
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  networkDetails: { network: "TESTNET" },
  icons: {},
  userBalances: { balances: [] },
  tokenPrices: {},
};

describe("SwapAmount layout", () => {
  beforeEach(() => {
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: { state: RequestState.IDLE, data: null, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: swapData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it("renders two amount cards, percentage buttons and direction chevron", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <SwapAmount
          inputType="crypto"
          setInputType={jest.fn()}
          goBack={jest.fn()}
          goToNext={jest.fn()}
          goToEditSrc={jest.fn()}
          goToEditDst={jest.fn()}
        />
      </Wrapper>,
    );
    expect(screen.getByTestId("swap-sell-card")).toBeInTheDocument();
    expect(screen.getByTestId("swap-receive-card")).toBeInTheDocument();
    expect(screen.getByTestId("swap-direction-chevron")).toBeInTheDocument();
    expect(screen.getByTestId("swap-percentage-buttons")).toBeInTheDocument();
  });

  it("orders sell card, chevron, receive card, then percentage buttons", () => {
    render(
      <Wrapper state={{}} routes={["/"]}>
        <SwapAmount
          inputType="crypto"
          setInputType={jest.fn()}
          goBack={jest.fn()}
          goToNext={jest.fn()}
          goToEditSrc={jest.fn()}
          goToEditDst={jest.fn()}
        />
      </Wrapper>,
    );
    const sell = screen.getByTestId("swap-sell-card");
    const chevron = screen.getByTestId("swap-direction-chevron");
    const receive = screen.getByTestId("swap-receive-card");
    const pct = screen.getByTestId("swap-percentage-buttons");

    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(sell.compareDocumentPosition(chevron) & following).toBeTruthy();
    expect(chevron.compareDocumentPosition(receive) & following).toBeTruthy();
    expect(receive.compareDocumentPosition(pct) & following).toBeTruthy();
  });
});
