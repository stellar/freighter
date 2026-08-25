import React from "react";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { EarnSubmit } from "popup/components/earn/EarnSubmit";
import { useSubmitEarnTxData } from "popup/components/earn/EarnSubmit/hooks/useSubmitEarnTxData";
import { initialState as earnInitialState } from "popup/ducks/earn";
import {
  initialState as transactionSubmissionInitialState,
  ShowOverlayStatus,
} from "popup/ducks/transactionSubmission";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { Wrapper } from "popup/__testHelpers__";

const TEST_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const POOL_ID = "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";

// Two distinguishable envelopes, so the assertions can tell "what the flow was
// handed" apart from "what in-page signing produced".
const HW_SIGNED_XDR = "AAAA-signed-by-device";
const SOFTWARE_SIGNED_XDR = "AAAA-signed-in-page";

const mockSignSoroban = jest.fn();
const mockFetchBalances = jest.fn().mockResolvedValue({ balances: {} });

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  signFreighterSorobanTransaction: (...args: unknown[]) =>
    mockSignSoroban(...args),
}));

jest.mock("helpers/hooks/useGetBalances", () => ({
  ...jest.requireActual("helpers/hooks/useGetBalances"),
  useGetBalances: () => ({ fetchData: mockFetchBalances }),
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const mockFetch = jest.fn();

const { emitMetric } =
  jest.requireMock<typeof import("helpers/metrics")>("helpers/metrics");

const emittedMetricNames = () =>
  (emitMetric as jest.Mock).mock.calls.map(([name]) => name);

/**
 * A submission that has left but not landed, which is the only window in which
 * Close is offered. Resolve the returned deferred to settle it.
 */
const holdSubmission = () => {
  let settle: (value: unknown) => void = () => {};
  mockFetch.mockImplementation((url: string) => {
    if (!String(url).includes("/submit-tx")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return new Promise((resolve) => {
      settle = resolve;
    });
  });
  return {
    succeed: () =>
      settle({
        ok: true,
        json: () => Promise.resolve({ status: "PENDING", hash: "abc123" }),
      }),
    fail: () =>
      settle({
        ok: false,
        json: () => Promise.resolve({ extras: { result_codes: {} } }),
      }),
  };
};

/**
 * The store the flow hands this screen: an amount and asset already chosen, the
 * prepared envelope parked on `transactionSimulation`. Shared with the hook-level
 * tests below, which render the hook against the same state the component sees.
 */
const makeState = ({
  xdr,
  hardwareWalletType = WalletType.NONE,
  hwStatus = ShowOverlayStatus.IDLE,
  lastSubmitFailed = false,
}: {
  xdr: string;
  hardwareWalletType?: WalletType;
  hwStatus?: ShowOverlayStatus;
  lastSubmitFailed?: boolean;
}) => ({
  auth: {
    allAccounts: [{ publicKey: TEST_PUBLIC_KEY, hardwareWalletType }],
    publicKey: TEST_PUBLIC_KEY,
    bipPath: "44'/148'/0'",
  },
  settings: {
    networkDetails: TESTNET_NETWORK_DETAILS,
    isHashSigningEnabled: false,
  },
  transactionSubmission: {
    ...transactionSubmissionInitialState,
    transactionData: {
      ...transactionSubmissionInitialState.transactionData,
      amount: "0.5",
      asset: "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
    },
    transactionSimulation: { response: null, preparedTransaction: xdr },
    hardwareWalletData: {
      status: hwStatus,
      transactionXDR: hwStatus === ShowOverlayStatus.IDLE ? "" : xdr,
      shouldSubmit: true,
    },
  },
  earn: { ...earnInitialState, pool: { id: POOL_ID }, lastSubmitFailed },
});

const renderSubmit = ({
  xdr,
  // Defaults to `xdr`; pass separately to model the render the flow actually
  // performs, where the prop was captured before the device signed.
  xdrProp = xdr,
  ...stateOverrides
}: {
  xdr: string;
  xdrProp?: string;
  hardwareWalletType?: WalletType;
  hwStatus?: ShowOverlayStatus;
  lastSubmitFailed?: boolean;
}) =>
  render(
    <Wrapper routes={["/"]} state={makeState({ xdr, ...stateOverrides })}>
      <EarnSubmit xdr={xdrProp} onExit={jest.fn()} />
    </Wrapper>,
  );

const submittedXdrs = () =>
  mockFetch.mock.calls
    .filter(([url]) => String(url).includes("/submit-tx"))
    .map(([, options]) => JSON.parse(options.body).signed_xdr);

describe("EarnSubmit", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignSoroban.mockResolvedValue({
      signedTransaction: SOFTWARE_SIGNED_XDR,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "PENDING", hash: "abc123" }),
    });
    global.fetch = mockFetch as unknown as typeof global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("signs in the popup and submits once for a software wallet", async () => {
    renderSubmit({ xdr: "AAAA-unsigned" });

    await waitFor(() => expect(submittedXdrs()).toEqual([SOFTWARE_SIGNED_XDR]));
    expect(mockSignSoroban).toHaveBeenCalledTimes(1);
  });

  it("submits the device-signed envelope without signing again", async () => {
    // The signed envelope arrives through transactionSimulation, written there
    // by the review's HardwareSign overlay. Re-signing it in the popup is
    // impossible for a hardware account, so the hook must not try — and it must
    // read the envelope from redux, not from a prop that predates the signature.
    renderSubmit({
      xdr: HW_SIGNED_XDR,
      xdrProp: "AAAA-unsigned",
      hardwareWalletType: WalletType.LEDGER,
    });

    await waitFor(() => expect(submittedXdrs()).toEqual([HW_SIGNED_XDR]));
    expect(mockSignSoroban).not.toHaveBeenCalled();
  });

  it("never renders a second device overlay", async () => {
    // HardwareSign defers closeHwOverlay by 300ms while calling onSubmit
    // immediately, so this screen mounts while the status is still IN_PROGRESS.
    // An overlay here would auto-sign on mount and prompt the device twice.
    renderSubmit({
      xdr: HW_SIGNED_XDR,
      hardwareWalletType: WalletType.LEDGER,
      hwStatus: ShowOverlayStatus.IN_PROGRESS,
    });

    await waitFor(() => expect(submittedXdrs()).toEqual([HW_SIGNED_XDR]));
    expect(screen.queryByTestId("HardwareSign__internal")).toBeNull();
    expect(screen.getByTestId("earn-submit")).toBeDefined();
  });

  it("still reports the outcome of a deposit the user stopped watching", async () => {
    // Close navigates back to the account view; it does not close the popup, so
    // this hook's continuation keeps running. The dismissal is a UX signal, and
    // the completion that follows it is the truth — the deposit did land.
    const submission = holdSubmission();
    const { unmount } = renderSubmit({ xdr: "AAAA-unsigned" });

    const close = await screen.findByTestId("earn-submit-close");
    await userEvent.click(close);
    // What the Earn view does with onExit: this screen goes away.
    unmount();

    expect(emittedMetricNames()).toContain(METRIC_NAMES.earnDepositDismissed);
    expect(emittedMetricNames()).not.toContain(
      METRIC_NAMES.earnDepositCompleted,
    );

    await act(async () => {
      submission.succeed();
    });

    await waitFor(() =>
      expect(emittedMetricNames()).toContain(METRIC_NAMES.earnDepositCompleted),
    );
    expect(
      emittedMetricNames().filter(
        (name) => name === METRIC_NAMES.earnDepositCompleted,
      ),
    ).toHaveLength(1);
  });

  it("reports a failure that lands after the screen is gone", async () => {
    // The gap this closes: the Earn view owned earn.deposit_failed, and it
    // unmounts on close — so a post-close failure was silent while a post-close
    // success was not, biasing the funnel toward success.
    const submission = holdSubmission();
    const { unmount } = renderSubmit({ xdr: "AAAA-unsigned" });

    await userEvent.click(await screen.findByTestId("earn-submit-close"));
    unmount();

    await act(async () => {
      submission.fail();
    });

    await waitFor(() =>
      expect(emittedMetricNames()).toContain(METRIC_NAMES.earnDepositFailed),
    );
    expect(emittedMetricNames()).not.toContain(
      METRIC_NAMES.earnDepositCompleted,
    );
  });

  it("does not resubmit an envelope the network already rejected", async () => {
    // Second layer under the Earn view's step teardown: if anything remounts
    // this screen while a failure still stands, it must not replay the request.
    renderSubmit({ xdr: "AAAA-unsigned", lastSubmitFailed: true });

    await waitFor(() =>
      expect(screen.getByTestId("earn-submit")).toBeDefined(),
    );
    expect(submittedXdrs()).toEqual([]);
    expect(mockSignSoroban).not.toHaveBeenCalled();
  });
});
/**
 * The screen ands the hook's state together with redux `submitStatus`, and the
 * Earn view unmounts this step outright on a failure — so a wrong state here is
 * invisible through the DOM. These drive the hook directly to assert the signal
 * itself, which is what the screen's guards would otherwise be covering for.
 */
describe("useSubmitEarnTxData", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignSoroban.mockResolvedValue({
      signedTransaction: SOFTWARE_SIGNED_XDR,
    });
    global.fetch = mockFetch as unknown as typeof global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const renderSubmitHook = (xdr: string) =>
    renderHook(
      () =>
        useSubmitEarnTxData({
          isHardwareWallet: false,
          networkDetails: TESTNET_NETWORK_DETAILS,
          publicKey: TEST_PUBLIC_KEY,
          xdr,
          assetCode: "USDC",
          poolId: POOL_ID,
          apy: 0.05,
          viaSwap: false,
        }),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <Wrapper routes={["/"]} state={makeState({ xdr })}>
            {children}
          </Wrapper>
        ),
      },
    );

  it("reports an error state when the network rejects the submission", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ extras: { result_codes: {} } }),
    });
    const { result } = renderSubmitHook("AAAA-unsigned");

    await act(async () => {
      await result.current.fetchData();
    });

    expect(result.current.state.state).toBe(RequestState.ERROR);
  });

  it("reports a success state when the submission lands", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "PENDING", hash: "abc123" }),
    });
    const { result } = renderSubmitHook("AAAA-unsigned");

    await act(async () => {
      await result.current.fetchData();
    });

    expect(result.current.state.state).toBe(RequestState.SUCCESS);
  });
});
