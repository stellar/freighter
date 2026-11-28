import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import BigNumber from "bignumber.js";
import { Account } from "stellar-sdk";

import { TESTNET_NETWORK_DETAILS, NETWORKS } from "@shared/constants/stellar";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { getBlendSuppliedTokens } from "@shared/api/helpers/blend";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { simulateTransaction } from "@shared/api/internal";
import { emitMetric } from "helpers/metrics";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { EarnAmount } from "popup/components/earn/EarnAmount";
import * as UseGetEarnAmountData from "popup/components/earn/EarnAmount/hooks/useGetEarnAmountData";
import * as BlendDeposit from "popup/helpers/blendDeposit";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import { initialState as earnInitialState } from "popup/ducks/earn";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { getTestStore, TEST_PUBLIC_KEY, Wrapper } from "popup/__testHelpers__";

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

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;
// The native SAC on testnet, the reserve an XLM deposit goes to.
const TESTNET_NATIVE_SAC =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// 101 XLM over a 1 XLM reserve: Max is 99.99999 XLM, once the 0.00001 XLM
// inclusion fee is out.
const earnAmountData = {
  type: AppDataType.RESOLVED,
  publicKey: TEST_PUBLIC_KEY,
  networkDetails: TESTNET_NETWORK_DETAILS,
  balances: {
    balances: [
      {
        token: { type: "native", code: "XLM" },
        total: new BigNumber("101"),
        available: new BigNumber("101"),
        minimumBalance: new BigNumber("1"),
        blockaidData: {},
      },
    ],
    icons: {},
  },
  tokenPrices: {},
};

const renderXlmDeposit = () =>
  render(
    <Wrapper
      state={
        {
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            transactionData: {
              ...transactionSubmissionInitialState.transactionData,
              asset: "native",
              destination: POOL_ID,
            },
          },
          earn: {
            ...earnInitialState,
            pool: null,
            selectedAssetId: TESTNET_NATIVE_SAC,
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

/** Each build in turn reports these resource fees, in stroops. */
const measureFees = (...stroops: string[]) => {
  stroops.forEach((minResourceFee) => {
    (simulateTransaction as jest.Mock).mockImplementationOnce(
      async ({ xdr }: { xdr: string }) => ({
        ok: true,
        response: {
          preparedTransaction: xdr,
          simulationResponse: { minResourceFee },
        },
      }),
    );
  });
};

const builtAmounts = () =>
  (BlendDeposit.buildAndSimulateBlendDeposit as jest.Mock).mock.calls.map(
    ([args]) => args.amount,
  );

const feeShortfallsShown = () =>
  (emitMetric as jest.Mock).mock.calls.filter(
    ([name, props]) =>
      name === "earn.xlm_fee_insufficient_shown" &&
      props?.reason === "fee_not_covered",
  );

const pressReview = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId("earn-amount-btn-continue"));
  });
};

// Max fills the whole spendable XLM, which leaves nothing for the resource
// fee, known only once simulation returns. The deposit is lowered by that fee
// and built again, as on mobile.
describe("EarnAmount's XLM deposit at Max", () => {
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
    (getBlendSuppliedTokens as jest.Mock).mockResolvedValue("0");
  });
  afterEach(() => jest.restoreAllMocks());

  it("is lowered by the measured fee, built again and reviewed", async () => {
    // 0.0546395 XLM, both times.
    measureFees("546395", "546395");
    renderXlmDeposit();
    fireEvent.click(screen.getByTestId("SendAmountSetMax"));

    await pressReview();

    await waitFor(() => expect(isReviewOpen()).toBe(true));
    expect(builtAmounts()).toEqual(["99.99999", "99.9453505"]);
    expect(getTestStore()!.getState().earn.reviewedAmount).toBe("99.9453505");
    expect(
      getTestStore()!.getState().transactionSubmission.transactionData.amount,
    ).toBe("99.9453505");
    expect(feeShortfallsShown()).toHaveLength(0);
  });

  it("asks for a smaller deposit when the lowered one is still short", async () => {
    // The second build measures a higher fee than the first.
    measureFees("500000", "600000");
    renderXlmDeposit();
    fireEvent.click(screen.getByTestId("SendAmountSetMax"));

    await pressReview();

    await waitFor(() => expect(builtAmounts()).toHaveLength(2));
    // The test translations leave `{{amount}}` as it is.
    expect(
      await screen.findByText(/Reduce your deposit by at least/),
    ).toBeInTheDocument();
    expect(isReviewOpen()).toBe(false);
    expect(feeShortfallsShown()).toHaveLength(1);
  });

  it("leaves a typed amount for the user to lower", async () => {
    measureFees("546395");
    renderXlmDeposit();
    fireEvent.change(screen.getByTestId("send-amount-amount-input"), {
      target: { value: "99.99" },
    });

    await pressReview();

    expect(
      await screen.findByText(/Reduce your deposit by at least/),
    ).toBeInTheDocument();
    expect(builtAmounts()).toEqual(["99.99"]);
    expect(isReviewOpen()).toBe(false);
    expect(feeShortfallsShown()).toHaveLength(1);
  });
});
