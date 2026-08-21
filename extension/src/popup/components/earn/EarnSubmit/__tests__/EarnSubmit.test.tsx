import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { EarnSubmit } from "popup/components/earn/EarnSubmit";
import { initialState as earnInitialState } from "popup/ducks/earn";
import {
  initialState as transactionSubmissionInitialState,
  ShowOverlayStatus,
} from "popup/ducks/transactionSubmission";
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

const renderSubmit = ({
  xdr,
  // Defaults to `xdr`; pass separately to model the render the flow actually
  // performs, where the prop was captured before the device signed.
  xdrProp = xdr,
  hardwareWalletType = WalletType.NONE,
  hwStatus = ShowOverlayStatus.IDLE,
  lastSubmitFailed = false,
}: {
  xdr: string;
  xdrProp?: string;
  hardwareWalletType?: WalletType;
  hwStatus?: ShowOverlayStatus;
  lastSubmitFailed?: boolean;
}) =>
  render(
    <Wrapper
      routes={["/"]}
      state={{
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
            asset:
              "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
          },
          transactionSimulation: { response: null, preparedTransaction: xdr },
          hardwareWalletData: {
            status: hwStatus,
            transactionXDR: hwStatus === ShowOverlayStatus.IDLE ? "" : xdr,
            shouldSubmit: true,
          },
        },
        earn: { ...earnInitialState, pool: { id: POOL_ID }, lastSubmitFailed },
      }}
    >
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
