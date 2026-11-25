import React from "react";
import { render, screen } from "@testing-library/react";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper } from "popup/__testHelpers__";
import { EarnTokenPicker } from "popup/components/earn/EarnTokenPicker";

let mockState: { state: RequestState; data: unknown; error: unknown };

jest.mock(
  "popup/components/earn/EarnTokenPicker/hooks/useGetEarnTokensData",
  () => ({
    useGetEarnTokensData: () => ({ state: mockState, fetchData: jest.fn() }),
  }),
);

jest.mock("popup/helpers/useNetworkFees", () => ({
  useNetworkFees: () => ({ recommendedFee: "0.00001" }),
}));

const renderPicker = () =>
  render(
    <Wrapper
      routes={["/earn"]}
      state={{ settings: { networkDetails: TESTNET_NETWORK_DETAILS } }}
    >
      <EarnTokenPicker
        onClose={jest.fn()}
        onSelect={jest.fn()}
        onSwapRequested={jest.fn()}
      />
    </Wrapper>,
  );

describe("EarnTokenPicker's Deposit into chip", () => {
  it("stays behind the spinner while the list loads", () => {
    mockState = { state: RequestState.LOADING, data: null, error: null };

    renderPicker();

    expect(screen.getByTestId("earn-token-picker-loading")).toBeInTheDocument();
    expect(screen.queryByText("Deposit into")).not.toBeInTheDocument();
    expect(screen.queryByTestId("earn-protocol-chip")).not.toBeInTheDocument();
  });

  it("appears with the list, already naming the pool", () => {
    mockState = {
      state: RequestState.SUCCESS,
      error: null,
      data: {
        type: AppDataType.RESOLVED,
        publicKey: "G123",
        networkDetails: TESTNET_NETWORK_DETAILS,
        balances: { balances: [] },
        held: [],
        supported: [],
        // Already ending in "Pool", so the name shows as is (the tests'
        // translator doesn't interpolate).
        pool: { id: "C123", name: "Fixed v2.1 Pool", reserves: [] },
      },
    };

    renderPicker();

    expect(screen.getByText("Deposit into")).toBeInTheDocument();
    expect(screen.getByTestId("earn-protocol-chip")).toHaveTextContent(
      "Blend · Fixed v2.1 Pool",
    );
  });
});
