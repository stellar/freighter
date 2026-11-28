import React from "react";
import BigNumber from "bignumber.js";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Asset } from "stellar-sdk";

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

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
}));

jest.mock("popup/helpers/useNetworkFees", () => ({
  useNetworkFees: () => ({ recommendedFee: "0.00001" }),
}));

const XLM_SAC = Asset.native().contractId(
  TESTNET_NETWORK_DETAILS.networkPassphrase,
);

/** An account with one trustline holds 1.5 XLM it can't spend. */
const MINIMUM_BALANCE = "1.5";

const xlmRow = (total: string) => ({
  assetId: XLM_SAC,
  code: "XLM",
  decimals: 7,
  total,
  hasTrustline: true,
  apy: 0.05,
  poolId: "CPOOL",
});

const showPicker = (xlmTotal: string) => {
  mockState = {
    state: RequestState.SUCCESS,
    error: null,
    data: {
      type: AppDataType.RESOLVED,
      publicKey: "G123",
      networkDetails: TESTNET_NETWORK_DETAILS,
      balances: {
        balances: [
          {
            token: { type: "native", code: "XLM" },
            total: new BigNumber(xlmTotal),
            available: new BigNumber(xlmTotal).minus(MINIMUM_BALANCE),
            minimumBalance: new BigNumber(MINIMUM_BALANCE),
          },
        ],
      },
      // The data hook lists XLM as held whenever its total is above zero.
      held: [xlmRow(xlmTotal)],
      supported: [],
      pool: { id: "CPOOL", name: "Fixed v2.1 Pool", reserves: [] },
    },
  };

  const onSelect = jest.fn();
  render(
    <Wrapper
      routes={["/earn"]}
      state={{ settings: { networkDetails: TESTNET_NETWORK_DETAILS } }}
    >
      <EarnTokenPicker
        onClose={jest.fn()}
        onSelect={onSelect}
        onSwapRequested={jest.fn()}
      />
    </Wrapper>,
  );
  return { onSelect };
};

const getSection = (title: string) =>
  screen.getByText(title).closest(".EarnTokenPicker__section") as HTMLElement;

describe("EarnTokenPicker with XLM held as minimum balance", () => {
  it("lists XLM with nothing spendable under the other tokens", () => {
    const { onSelect } = showPicker(MINIMUM_BALANCE);

    expect(screen.getByTestId("earn-token-empty")).toBeInTheDocument();
    expect(screen.queryByText("In your wallet")).not.toBeInTheDocument();
    const row = within(getSection("Supported tokens")).getByTestId(
      "earn-token-row-XLM",
    );
    expect(row).toHaveTextContent("0 XLM");

    // Its tap offers ways to get more, not an amount screen it can't use.
    fireEvent.click(row);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId("earn-not-enough-sheet")).toBeInTheDocument();
  });

  it("keeps XLM in the wallet while some of it is spendable", () => {
    const { onSelect } = showPicker("3");

    const row = within(getSection("In your wallet")).getByTestId(
      "earn-token-row-XLM",
    );
    expect(row).toHaveTextContent("1.49999 XLM");

    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
