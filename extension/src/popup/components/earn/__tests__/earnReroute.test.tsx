import React from "react";
import { render, screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { ROUTES } from "popup/constants/routes";
import { Wrapper } from "popup/__testHelpers__";
import { EarnAmount } from "popup/components/earn/EarnAmount";
import { EarnTokenPicker } from "popup/components/earn/EarnTokenPicker";

// A locked session: both data hooks resolve to a reroute to the unlock screen.
const mockRerouteState = {
  state: RequestState.SUCCESS,
  error: null,
  data: {
    type: AppDataType.REROUTE,
    shouldOpenTab: false,
    routeTarget: ROUTES.unlockAccount,
  },
};

jest.mock(
  "popup/components/earn/EarnTokenPicker/hooks/useGetEarnTokensData",
  () => ({
    useGetEarnTokensData: () => ({
      state: mockRerouteState,
      fetchData: jest.fn(),
    }),
  }),
);

jest.mock(
  "popup/components/earn/EarnAmount/hooks/useGetEarnAmountData",
  () => ({
    useGetEarnAmountData: () => ({
      state: mockRerouteState,
      fetchData: jest.fn(),
    }),
  }),
);

jest.mock("popup/helpers/useNetworkFees", () => ({
  ...jest.requireActual("popup/helpers/useNetworkFees"),
  useNetworkFees: () => ({ recommendedFee: "0.00001" }),
}));

let unlockLocation: ReturnType<typeof useLocation> | null = null;
const UnlockProbe = () => {
  unlockLocation = useLocation();
  return <div data-testid="unlock-probe" />;
};

const renderAt = (screenUnderTest: React.ReactElement) =>
  render(
    <Wrapper
      routes={[ROUTES.earn]}
      state={{ settings: { networkDetails: TESTNET_NETWORK_DETAILS } }}
    >
      <Routes>
        <Route path={ROUTES.earn} element={screenUnderTest} />
        <Route path={ROUTES.unlockAccount} element={<UnlockProbe />} />
      </Routes>
    </Wrapper>,
  );

// UnlockAccount sends the user back to `state.from` once the password is in,
// so a reroute that drops it strands them on Home instead of in Earn.
describe("Earn reroutes", () => {
  beforeEach(() => {
    unlockLocation = null;
  });

  it("the token picker remembers where it was", async () => {
    renderAt(
      <EarnTokenPicker
        onClose={jest.fn()}
        onSelect={jest.fn()}
        onSwapRequested={jest.fn()}
      />,
    );

    await screen.findByTestId("unlock-probe");
    const state = unlockLocation?.state as { from?: { pathname?: string } };
    expect(state?.from?.pathname).toBe(ROUTES.earn);
  });

  it("the amount screen remembers where it was", async () => {
    renderAt(
      <EarnAmount
        goBack={jest.fn()}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

    await screen.findByTestId("unlock-probe");
    const state = unlockLocation?.state as { from?: { pathname?: string } };
    expect(state?.from?.pathname).toBe(ROUTES.earn);
  });
});
