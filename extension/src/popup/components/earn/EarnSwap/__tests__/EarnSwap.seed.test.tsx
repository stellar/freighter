import React from "react";
import { render, screen } from "@testing-library/react";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { EarnSwap } from "popup/components/earn/EarnSwap";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { Wrapper } from "popup/__testHelpers__";

const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const USDC = `USDC:${USDC_ISSUER}`;
const EURC = "EURC:GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2";

// What the amount step saw on its first render: it starts fetching then.
const mockFirstSeen: { asset?: string; destinationAsset?: string } = {};
jest.mock("popup/components/swap/SwapAmount", () => ({
  SwapAmount: () => {
    const { useSelector } = jest.requireActual("react-redux");
    const { transactionSubmissionSelector } = jest.requireActual(
      "popup/ducks/transactionSubmission",
    );
    const { transactionData } = useSelector(transactionSubmissionSelector);
    if (!("asset" in mockFirstSeen)) {
      mockFirstSeen.asset = transactionData.asset;
      mockFirstSeen.destinationAsset = transactionData.destinationAsset;
    }
    return <div data-testid="stub-amount" />;
  },
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

describe("EarnSwap's seed", () => {
  it("is in Redux before the amount step first renders", async () => {
    render(
      <Wrapper
        routes={["/earn"]}
        state={{
          settings: { networkDetails: TESTNET_NETWORK_DETAILS },
          // Left over from an earlier swap.
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            transactionData: {
              ...transactionSubmissionInitialState.transactionData,
              asset: EURC,
              destinationAsset: EURC,
            },
          },
        }}
      >
        <EarnSwap
          sourceAsset="native"
          destinationAsset={USDC}
          destinationTokenDetails={null}
          onDone={jest.fn()}
          onCancel={jest.fn()}
        />
      </Wrapper>,
    );

    await screen.findByTestId("stub-amount");
    expect(mockFirstSeen).toEqual({ asset: "native", destinationAsset: USDC });
  });
});
