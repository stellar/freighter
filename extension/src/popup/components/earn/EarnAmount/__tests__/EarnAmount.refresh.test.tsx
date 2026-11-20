import React from "react";
import { render } from "@testing-library/react";

import { NETWORKS } from "@shared/constants/stellar";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { RequestState } from "constants/request";
import { EarnAmount } from "popup/components/earn/EarnAmount";
import * as UseGetEarnAmountData from "popup/components/earn/EarnAmount/hooks/useGetEarnAmountData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import { initialState as earnInitialState } from "popup/ducks/earn";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { TEST_USDC_CANONICAL, Wrapper } from "popup/__testHelpers__";

jest.mock("@shared/api/helpers/blend", () => ({
  getBlendSuppliedTokens: jest.fn().mockResolvedValue("0"),
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;

const amountScreen = (refreshKey: number) => (
  <Wrapper
    state={
      {
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset: TEST_USDC_CANONICAL,
            destination: POOL_ID,
            isToken: true,
          },
        },
        earn: { ...earnInitialState, currentPositionTokens: "0" },
      } as any
    }
    routes={["/"]}
  >
    <EarnAmount
      goBack={jest.fn()}
      onClose={jest.fn()}
      onConfirm={jest.fn()}
      refreshKey={refreshKey}
    />
  </Wrapper>
);

describe("EarnAmount balance refresh", () => {
  const fetchData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    fetchData.mockResolvedValue(undefined);
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseGetEarnAmountData, "useGetEarnAmountData").mockReturnValue({
      state: { state: RequestState.LOADING, data: null, error: null },
      fetchData,
    } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  // The screen stays mounted behind the picker, so a swap made from there
  // reaches it only through the key. Without it, the token the swap bought
  // reads as 0 available.
  it("loads its balances again when the refresh key changes", () => {
    const { rerender } = render(amountScreen(0));
    expect(fetchData).toHaveBeenCalledTimes(1);

    rerender(amountScreen(0));
    expect(fetchData).toHaveBeenCalledTimes(1);

    rerender(amountScreen(1));
    expect(fetchData).toHaveBeenCalledTimes(2);
  });
});
