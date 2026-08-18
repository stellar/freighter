import React from "react";
import { render, screen } from "@testing-library/react";

import { RequestState } from "constants/request";
import { Wrapper } from "popup/__testHelpers__";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";

describe("SwapAmount RequestState.ERROR", () => {
  beforeEach(() => {
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      simulationState: {
        state: RequestState.IDLE,
        data: null,
        error: null,
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the fetch-fail notification without throwing on RequestState.ERROR", () => {
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: {
        state: RequestState.ERROR,
        data: null,
        error: new Error("boom"),
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);

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

    expect(screen.getByTestId("swap-amount-fetch-fail")).toBeInTheDocument();
  });
});
