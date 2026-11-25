import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TESTNET_NETWORK_DETAILS, NETWORKS } from "@shared/constants/stellar";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { Earn } from "popup/views/Earn";
import { initialState as earnInitialState } from "popup/ducks/earn";
import {
  initialState as transactionSubmissionInitialState,
  submitFreighterTransaction,
} from "popup/ducks/transactionSubmission";
import { getTestStore, Wrapper } from "popup/__testHelpers__";

const TEST_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;

// jest.mock factories are hoisted and may only reach `mock`-prefixed bindings.
const mockPickerSelection = {
  option: {
    code: "XLM",
    issuer: "",
    assetId: "CXLM",
    poolId: POOL_ID,
    apy: 0.05,
  },
  resolved: {
    pool: { id: POOL_ID },
    publicKey: TEST_PUBLIC_KEY,
    networkDetails: TESTNET_NETWORK_DETAILS,
    balances: { balances: [] },
  },
};

jest.mock("popup/components/earn/EarnIntro/hooks/useEarnIntroSeen", () => ({
  useEarnIntroSeen: () => ({ hasSeenIntro: true, dismissIntro: jest.fn() }),
}));

jest.mock(
  "popup/components/earn/EarnTokenPicker/helpers/resolveSwapDestination",
  () => ({
    resolveSwapDestination: () =>
      Promise.resolve({ canonical: "USDC:GUSDC", details: null }),
  }),
);

jest.mock("popup/components/earn/EarnTokenPicker", () => ({
  EarnTokenPicker: ({
    onSelect,
    onSwapRequested,
  }: {
    onSelect: Function;
    onSwapRequested: Function;
  }) => (
    <>
      <button
        data-testid="stub-pick-token"
        onClick={() =>
          onSelect(mockPickerSelection.option, mockPickerSelection.resolved)
        }
      >
        pick
      </button>
      <button
        data-testid="stub-request-swap"
        onClick={() =>
          onSwapRequested(
            mockPickerSelection.option,
            mockPickerSelection.resolved,
          )
        }
      >
        swap
      </button>
    </>
  ),
}));

jest.mock("popup/components/earn/EarnAmount", () => ({
  EarnAmount: ({
    goBack,
    refreshKey,
  }: {
    goBack: () => void;
    refreshKey?: number;
  }) => (
    <button
      data-testid="stub-amount"
      data-refresh-key={String(refreshKey ?? 0)}
      onClick={goBack}
    >
      back
    </button>
  ),
}));

jest.mock("popup/components/earn/EarnSwap", () => ({
  EarnSwap: ({
    onCancel,
    onDone,
  }: {
    onCancel: () => void;
    onDone: (result: {
      fromCode: string;
      toCode: string;
      toAmount: string;
    }) => void;
  }) => (
    <div data-testid="stub-swap">
      <button
        data-testid="stub-swap-done"
        onClick={() =>
          onDone({ fromCode: "XLM", toCode: "USDC", toAmount: "5" })
        }
      >
        done
      </button>
      <button data-testid="stub-swap-cancel" onClick={onCancel}>
        close swap
      </button>
    </div>
  ),
}));

jest.mock("popup/basics/shadcn/Toast", () => ({
  showToast: jest.fn(),
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const renderEarn = () =>
  render(
    <Wrapper
      routes={["/earn"]}
      state={{
        auth: { allAccounts: [TEST_PUBLIC_KEY], publicKey: TEST_PUBLIC_KEY },
        settings: { networkDetails: TESTNET_NETWORK_DETAILS },
        transactionSubmission: transactionSubmissionInitialState,
        earn: { ...earnInitialState, hasSeenIntro: true },
      }}
    >
      <Earn />
    </Wrapper>,
  );

const amountRefreshKey = () =>
  screen.getByTestId("stub-amount").getAttribute("data-refresh-key");

/** Opens a token's deposit screen, then backs out to the picker. */
const visitAmountAndGoBack = async () => {
  await userEvent.click(screen.getByTestId("stub-pick-token"));
  expect(amountRefreshKey()).toBe("0");
  await userEvent.click(screen.getByTestId("stub-amount"));
};

const swapSubmitArgs = {
  publicKey: TEST_PUBLIC_KEY,
  signedXDR: "AAAA-swap",
  networkDetails: TESTNET_NETWORK_DETAILS,
};

// The deposit screen stays mounted behind the picker once visited, so a swap
// made from the picker has to tell it the balances changed. Otherwise the
// token the swap bought reads as 0 available on its deposit screen.
describe("Earn balances after a swap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refreshes the deposit screen when a swap completes", async () => {
    renderEarn();
    await visitAmountAndGoBack();

    await userEvent.click(screen.getByTestId("stub-request-swap"));
    await userEvent.click(await screen.findByTestId("stub-swap-done"));

    await waitFor(() => expect(amountRefreshKey()).toBe("1"));
  });

  it("refreshes the deposit screen when a swap closed in flight lands", async () => {
    renderEarn();
    await visitAmountAndGoBack();

    await userEvent.click(screen.getByTestId("stub-request-swap"));
    await screen.findByTestId("stub-swap");
    act(() => {
      getTestStore()!.dispatch(
        submitFreighterTransaction.pending("req-swap", swapSubmitArgs),
      );
    });
    await userEvent.click(screen.getByTestId("stub-swap-cancel"));
    await waitFor(() => expect(screen.queryByTestId("stub-swap")).toBeNull());

    act(() => {
      getTestStore()!.dispatch(
        submitFreighterTransaction.fulfilled(
          {} as any,
          "req-swap",
          swapSubmitArgs,
        ),
      );
    });

    await waitFor(() => expect(amountRefreshKey()).toBe("1"));
  });
});
