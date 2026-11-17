import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import BigNumber from "bignumber.js";
import { Account } from "stellar-sdk";

import { TESTNET_NETWORK_DETAILS, NETWORKS } from "@shared/constants/stellar";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { getBlendSuppliedTokens } from "@shared/api/helpers/blend";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { simulateTransaction } from "@shared/api/internal";
import { showToast } from "popup/basics/shadcn/Toast";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { EarnAmount } from "popup/components/earn/EarnAmount";
import * as UseGetEarnAmountData from "popup/components/earn/EarnAmount/hooks/useGetEarnAmountData";
import * as BlendDeposit from "popup/helpers/blendDeposit";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import { initialState as earnInitialState } from "popup/ducks/earn";
import {
  initialState as transactionSubmissionInitialState,
  saveAmount,
} from "popup/ducks/transactionSubmission";
import {
  getTestStore,
  TEST_PUBLIC_KEY,
  TEST_USDC_CANONICAL,
  Wrapper,
} from "popup/__testHelpers__";

jest.mock("@shared/api/helpers/blend", () => ({
  getBlendSuppliedTokens: jest.fn(),
}));

jest.mock("@shared/api/helpers/stellarSdkServer", () => ({
  ...jest.requireActual("@shared/api/helpers/stellarSdkServer"),
  stellarSdkServer: jest.fn(),
}));

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  simulateTransaction: jest.fn(),
}));

// The test Wrapper mounts no Toaster; the tests render what the toast would.
jest.mock("popup/basics/shadcn/Toast", () => ({
  ...jest.requireActual("popup/basics/shadcn/Toast"),
  showToast: jest.fn(),
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;
const USDC_SAC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";

const earnAmountData = {
  type: AppDataType.RESOLVED,
  publicKey: TEST_PUBLIC_KEY,
  networkDetails: TESTNET_NETWORK_DETAILS,
  balances: {
    balances: [
      {
        token: { type: "native", code: "XLM" },
        total: new BigNumber("100"),
        available: new BigNumber("100"),
        blockaidData: {},
      },
      {
        token: { code: "USDC", issuer: { key: USDC_ISSUER } },
        total: new BigNumber("5000"),
        available: new BigNumber("5000"),
        blockaidData: {},
      },
    ],
    icons: {},
  },
  tokenPrices: { [TEST_USDC_CANONICAL]: { currentPrice: "1" } },
};

const renderAmount = () =>
  render(
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
          earn: {
            ...earnInitialState,
            pool: null,
            selectedAssetId: USDC_SAC,
            selectedAssetApy: 0.05,
            currentPositionTokens: "0",
          },
        } as any
      }
      routes={["/"]}
    >
      <EarnAmount
        goBack={jest.fn()}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    </Wrapper>,
  );

const isReviewOpen = () =>
  Boolean(
    screen
      .getByTestId("earn-review")
      .closest(".SlideupModal")
      ?.classList.contains("open"),
  );

/** Opens Review on a 100 USDC deposit, then its settings sheet. */
const openSettingsFromReview = async () => {
  renderAmount();
  fireEvent.change(screen.getByTestId("send-amount-amount-input"), {
    target: { value: "100" },
  });
  await act(async () => {
    fireEvent.click(screen.getByTestId("earn-amount-btn-continue"));
  });
  await waitFor(() => expect(isReviewOpen()).toBe(true));
  expect(screen.getByTestId("earn-review-confirm")).not.toBeDisabled();

  await act(async () => {
    fireEvent.click(screen.getByTestId("earn-review-settings-btn"));
  });
  await waitFor(() => expect(isReviewOpen()).toBe(false));
};

const saveFee = async (fee: string) => {
  const feeInput = await screen.findByTestId("edit-tx-settings-fee-input");
  fireEvent.change(feeInput, { target: { value: fee } });
  await act(async () => {
    fireEvent.click(screen.getByText("Save"));
  });
};

/** The title of the toast shown last. */
const lastToastText = () => {
  const calls = (showToast as jest.Mock).mock.calls;
  const { container } = render(calls[calls.length - 1][0]("toast"));
  return container.textContent;
};

/** A simulation the test resolves itself, to act while the build is in flight. */
const deferSimulation = () => {
  let resolve: () => void = () => {};
  (simulateTransaction as jest.Mock).mockImplementationOnce(
    ({ xdr }: { xdr: string }) =>
      new Promise((done) => {
        resolve = () =>
          done({
            ok: true,
            response: {
              preparedTransaction: xdr,
              simulationResponse: { minResourceFee: "10000" },
            },
          });
      }),
  );
  return () => resolve();
};

describe("EarnAmount reviewed amount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseGetEarnAmountData, "useGetEarnAmountData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: earnAmountData,
        error: null,
      },
      fetchData: jest.fn().mockResolvedValue(earnAmountData),
    } as any);
    jest.spyOn(BlendDeposit, "buildAndSimulateBlendDeposit");
    (stellarSdkServer as jest.Mock).mockReturnValue({
      loadAccount: jest
        .fn()
        .mockResolvedValue(new Account(TEST_PUBLIC_KEY, "1")),
    });
    (simulateTransaction as jest.Mock).mockImplementation(
      async ({ xdr }: { xdr: string }) => ({
        ok: true,
        response: {
          preparedTransaction: xdr,
          simulationResponse: { minResourceFee: "10000" },
        },
      }),
    );
    (getBlendSuppliedTokens as jest.Mock).mockResolvedValue("0");
  });
  afterEach(() => jest.restoreAllMocks());

  it("keeps Review closed when the amount changes while the deposit is built", async () => {
    // The amount and the percentage buttons stay live during the build. A
    // Review opened on the old build would show the new amount and sign the
    // old one.
    renderAmount();
    const input = screen.getByTestId("send-amount-amount-input");
    fireEvent.change(input, { target: { value: "100" } });

    const finishBuild = deferSimulation();
    await act(async () => {
      fireEvent.click(screen.getByTestId("earn-amount-btn-continue"));
    });
    fireEvent.change(input, { target: { value: "300" } });
    await act(async () => {
      finishBuild();
    });

    await waitFor(() =>
      expect(screen.getByTestId("earn-amount-btn-continue")).not.toBeDisabled(),
    );
    expect(isReviewOpen()).toBe(false);
    expect(getTestStore()!.getState().earn.reviewedAmount).toBeNull();

    // The CTA builds the amount the field says now, and Review shows it.
    await act(async () => {
      fireEvent.click(screen.getByTestId("earn-amount-btn-continue"));
    });
    await waitFor(() => expect(isReviewOpen()).toBe(true));
    expect(BlendDeposit.buildAndSimulateBlendDeposit).toHaveBeenLastCalledWith(
      expect.objectContaining({ amount: "300" }),
    );
    expect(screen.getByTestId("earn-review-amount")).toHaveTextContent(
      "300.00 USDC",
    );
    expect(getTestStore()!.getState().earn.reviewedAmount).toBe("300");
  });

  it("shows the amount the deposit was built with, not the field", async () => {
    renderAmount();
    fireEvent.change(screen.getByTestId("send-amount-amount-input"), {
      target: { value: "100" },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("earn-amount-btn-continue"));
    });
    await waitFor(() => expect(isReviewOpen()).toBe(true));

    act(() => {
      getTestStore()!.dispatch(saveAmount("250"));
    });

    expect(screen.getByTestId("earn-review-amount")).toHaveTextContent(
      "100.00 USDC",
    );
  });

  it("rebuilds the deposit with a fee saved from the review's settings", async () => {
    renderAmount();
    fireEvent.change(screen.getByTestId("send-amount-amount-input"), {
      target: { value: "100" },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("earn-amount-btn-continue"));
    });
    await waitFor(() => expect(isReviewOpen()).toBe(true));
    expect(BlendDeposit.buildAndSimulateBlendDeposit).toHaveBeenCalledWith(
      expect.objectContaining({ transactionFee: "0.00001" }),
    );

    // The gear leaves the review for the shared settings sheet.
    await act(async () => {
      fireEvent.click(screen.getByTestId("earn-review-settings-btn"));
    });
    await waitFor(() => expect(isReviewOpen()).toBe(false));

    const feeInput = await screen.findByTestId("edit-tx-settings-fee-input");
    fireEvent.change(feeInput, { target: { value: "0.01" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });

    // Rebuilt with the saved fee and the reviewed amount before Review comes
    // back, so Confirm signs the new transaction.
    await waitFor(() => expect(isReviewOpen()).toBe(true));
    expect(BlendDeposit.buildAndSimulateBlendDeposit).toHaveBeenCalledTimes(2);
    expect(BlendDeposit.buildAndSimulateBlendDeposit).toHaveBeenLastCalledWith(
      expect.objectContaining({ amount: "100", transactionFee: "0.01" }),
    );
    expect(
      getTestStore()!.getState().transactionSubmission.transactionData
        .transactionFee,
    ).toBe("0.01");
    expect(screen.getByTestId("earn-review-confirm")).not.toBeDisabled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("brings Review back with Confirm off when the settings rebuild fails", async () => {
    await openSettingsFromReview();

    // The pool rejects the rebuilt deposit.
    (simulateTransaction as jest.Mock).mockResolvedValueOnce({
      ok: false,
      response: "Pool is frozen",
    });
    await saveFee("0.01");

    // Review is back, but the deposit it shows was built with the old fee, so
    // there is nothing to sign. A toast says why.
    await waitFor(() => expect(isReviewOpen()).toBe(true));
    expect(screen.getByTestId("earn-review-confirm")).toBeDisabled();
    // The reason is the toast's; the amount screen behind Review stays clear.
    expect(
      within(screen.getByTestId("earn-amount")).queryByText("Pool is frozen"),
    ).not.toBeInTheDocument();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(lastToastText()).toContain("Pool is frozen");

    // A save that rebuilds cleanly turns Confirm back on.
    await act(async () => {
      fireEvent.click(screen.getByTestId("earn-review-settings-btn"));
    });
    await waitFor(() => expect(isReviewOpen()).toBe(false));
    await saveFee("0.001");
    await waitFor(() => expect(isReviewOpen()).toBe(true));
    await waitFor(() =>
      expect(screen.getByTestId("earn-review-confirm")).not.toBeDisabled(),
    );
  });

  it("says XLM can't pay a saved fee it can't cover", async () => {
    await openSettingsFromReview();

    // More than the 100 XLM the account holds.
    await saveFee("150");

    await waitFor(() => expect(isReviewOpen()).toBe(true));
    expect(screen.getByTestId("earn-review-confirm")).toBeDisabled();
    expect(lastToastText()).toContain("Not enough XLM for network fees");
    // Nothing was simulated with a fee the account cannot pay.
    expect(BlendDeposit.buildAndSimulateBlendDeposit).toHaveBeenCalledTimes(1);
  });
});
