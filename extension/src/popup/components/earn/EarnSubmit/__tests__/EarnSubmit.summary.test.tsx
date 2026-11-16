import React from "react";
import { render, screen } from "@testing-library/react";

import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { EarnSubmit } from "popup/components/earn/EarnSubmit";
import * as UseSubmitEarnTxData from "popup/components/earn/EarnSubmit/hooks/useSubmitEarnTxData";
import { initialState as earnInitialState } from "popup/ducks/earn";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import {
  TEST_PUBLIC_KEY,
  TEST_USDC_CANONICAL,
  Wrapper,
} from "popup/__testHelpers__";

// The global mock returns keys as is, which would hide the interpolated amount
// this checks.
jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({
    t: (key: string, values: Record<string, unknown> = {}) =>
      Object.entries(values).reduce(
        (text, [name, value]) => text.split(`{{${name}}}`).join(String(value)),
        key,
      ),
    i18n: { changeLanguage: () => Promise.resolve() },
  }),
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const renderSubmit = (amount: string) =>
  render(
    <Wrapper
      routes={["/"]}
      state={{
        auth: {
          allAccounts: [
            { publicKey: TEST_PUBLIC_KEY, hardwareWalletType: WalletType.NONE },
          ],
          publicKey: TEST_PUBLIC_KEY,
        },
        settings: { networkDetails: TESTNET_NETWORK_DETAILS },
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            amount,
            asset: TEST_USDC_CANONICAL,
          },
        },
        earn: { ...earnInitialState, pool: null },
      }}
    >
      <EarnSubmit xdr="AAAA" onExit={jest.fn()} />
    </Wrapper>,
  );

describe("EarnSubmit summary", () => {
  beforeEach(() => {
    // Held in flight: the summary is the same in both states, and nothing is
    // submitted.
    jest.spyOn(UseSubmitEarnTxData, "useSubmitEarnTxData").mockReturnValue({
      state: { state: RequestState.LOADING, data: null, error: null },
      fetchData: jest.fn(),
    } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it("shows an amount of 1,000 or more as the input showed it", () => {
    // Redux holds the amount as typed, with its thousands separator.
    renderSubmit("1,234.56");

    expect(screen.getByTestId("earn-submit")).not.toHaveTextContent("NaN");
    expect(screen.getByText("1,234.56 USDC to Blend pool")).toBeInTheDocument();
  });
});
