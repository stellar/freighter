import React from "react";
import { render, screen } from "@testing-library/react";

import { RequestState } from "constants/request";
import { Wrapper } from "popup/__testHelpers__";
import { SendAmount } from "popup/components/send/SendAmount";
import * as UseGetSendAmountData from "popup/components/send/SendAmount/hooks/useSendAmountData";

describe("SendAmount RequestState.ERROR", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the fetch-fail notification without throwing on RequestState.ERROR", () => {
    jest
      .spyOn(UseGetSendAmountData, "useGetSendAmountData")
      .mockReturnValue({
        state: {
          state: RequestState.ERROR,
          data: null,
          error: new Error("boom"),
        },
        fetchData: jest.fn().mockResolvedValue(undefined),
      } as any);

    render(
      <Wrapper state={{}} routes={["/"]}>
        <SendAmount
          goBack={jest.fn()}
          goToNext={jest.fn()}
          goToChooseDest={jest.fn()}
          goToChooseAsset={jest.fn()}
          simulationState={
            {
              state: RequestState.IDLE,
              data: null,
              error: null,
            } as any
          }
          fetchSimulationData={jest.fn().mockResolvedValue(undefined)}
          networkCongestion={"LOW" as any}
          recommendedFee="0.00001"
        />
      </Wrapper>,
    );

    expect(
      screen.getByTestId("send-amount-fetch-fail"),
    ).toBeInTheDocument();
  });
});
