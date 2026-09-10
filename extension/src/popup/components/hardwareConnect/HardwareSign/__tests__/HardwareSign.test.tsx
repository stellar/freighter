import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { Keypair } from "stellar-sdk";

import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { Wrapper } from "popup/__testHelpers__";
import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { encodeSep53Message } from "helpers/stellar";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";

// Real keypairs: the thunk verifies the signature against the reported signer,
// so a stand-in Buffer would be rejected before the UI ever settles.
const deviceKeypair = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 1));
const TEST_PUBLIC_KEY = deviceKeypair.publicKey();
const OTHER_PUBLIC_KEY = Keypair.fromRawEd25519Seed(
  Buffer.alloc(32, 2),
).publicKey();

const mockGetWalletPublicKey = jest.fn();
const mockHardwareSignMessage = jest.fn();

jest.mock("popup/helpers/hardwareConnect", () => {
  const actual = jest.requireActual("popup/helpers/hardwareConnect");
  return {
    ...actual,
    getWalletPublicKey: {
      Ledger: (...args: unknown[]) => mockGetWalletPublicKey(...args),
    },
    hardwareSignMessage: {
      Ledger: (...args: unknown[]) => mockHardwareSignMessage(...args),
    },
  };
});

jest.mock("@shared/api/internal", () => ({
  handleSignedHwPayload: jest.fn().mockResolvedValue(undefined),
}));

const { handleSignedHwPayload } = jest.requireMock<
  typeof import("@shared/api/internal")
>("@shared/api/internal");

const mockHandleSignedHwPayload = handleSignedHwPayload as jest.MockedFunction<
  typeof handleSignedHwPayload
>;

// Assert against the real schema builders rather than a stubbed emitter: the
// point of the hardware telemetry is that it produces the SAME event name and
// properties as the software-key path, and popup/metrics/signing is where that
// equivalence lives.
jest.mock("helpers/metrics", () => {
  const actual = jest.requireActual("helpers/metrics");
  return { ...actual, emitMetric: jest.fn() };
});

const { emitMetric } =
  jest.requireMock<typeof import("helpers/metrics")>("helpers/metrics");
const mockEmitMetric = emitMetric as jest.MockedFunction<typeof emitMetric>;

const DAPP_URL = "https://example.com/sign";

const renderOverlay = (
  opts: {
    message?: string;
    uuid?: string;
    url?: string;
    isInternal?: boolean;
  } = {},
) => {
  const {
    message = "Hello, Stellar!",
    uuid = "test-uuid",
    isInternal = false,
  } = opts;
  // A default parameter cannot tell "not specified" (use the default dApp url)
  // from an explicit `undefined` (the view parsed no url out of the request),
  // since both trigger the default. Check for the key instead.
  const url = "url" in opts ? opts.url : DAPP_URL;

  return render(
    <Wrapper
      routes={["/"]}
      state={{
        auth: {
          allAccounts: [TEST_PUBLIC_KEY],
          publicKey: TEST_PUBLIC_KEY,
          bipPath: "44'/148'/0'",
        },
        settings: {
          networkDetails: TESTNET_NETWORK_DETAILS,
          isHashSigningEnabled: false,
        },
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          hardwareWalletData: {
            ...transactionSubmissionInitialState.hardwareWalletData,
            transactionXDR: message,
            shouldSubmit: false,
          },
        },
      }}
    >
      <HardwareSign
        walletType={WalletType.LEDGER}
        isSignMessage
        uuid={uuid}
        url={url}
        isInternal={isInternal}
      />
    </Wrapper>,
  );
};

describe("HardwareSign message signing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHardwareSignMessage.mockImplementation(({ message }) =>
      Promise.resolve(deviceKeypair.sign(encodeSep53Message(message))),
    );
  });

  it("shows the failure from the automatic attempt without clicking Detect device", async () => {
    // handleSign runs from a mount effect. Before this was fixed the error
    // block was gated behind the Detect button, so an immediate failure left
    // the overlay reading "Connect device to computer" with no explanation.
    mockGetWalletPublicKey.mockRejectedValue(new Error("No device selected"));

    renderOverlay();

    await waitFor(() => {
      expect(screen.getByText(/No device detected/)).toBeDefined();
    });
  });

  it("refuses to sign when the device derives a different account", async () => {
    // The guard's whole scope: the attached device must be the account the
    // popup says it is signing as. It deliberately does not see the dApp's
    // requested account — signFlowAccountSelector activates that when the
    // wallet holds it and otherwise leaves the active account alone, the same
    // as for software keys, and the true signer goes back as signerAddress for
    // the dApp to check. Comparing the raw request here would dead-end every
    // address the selector cannot match, muxed (M...) addresses included, on an
    // error telling the user to swap hardware that was never the problem.
    mockGetWalletPublicKey.mockResolvedValue(OTHER_PUBLIC_KEY);

    renderOverlay();

    await waitFor(() => {
      expect(
        screen.getByText(/does not match the selected account/),
      ).toBeDefined();
    });

    // The point of the guard: no signature is ever produced for the wrong key.
    expect(mockHardwareSignMessage).not.toHaveBeenCalled();
  });

  it("signs when the device matches the active account", async () => {
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);

    renderOverlay();

    await waitFor(() => {
      expect(mockHardwareSignMessage).toHaveBeenCalledWith({
        bipPath: "44'/148'/0'",
        message: "Hello, Stellar!",
      });
    });
  });

  it("signs an empty message instead of waiting for a payload that never changes", async () => {
    // A SEP-53 message may legitimately be "". The mount effect used to gate on
    // a truthy payload, which left the overlay idle on a connected device.
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);

    renderOverlay({ message: "" });

    await waitFor(() => {
      expect(mockHardwareSignMessage).toHaveBeenCalledWith({
        bipPath: "44'/148'/0'",
        message: "",
      });
    });
  });

  it("reports the verified signer address to the background", async () => {
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);

    renderOverlay();

    await waitFor(() => {
      expect(handleSignedHwPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          signerAddress: TEST_PUBLIC_KEY,
          uuid: "test-uuid",
        }),
      );
    });
  });

  it("tells the user to review a message, not a transaction", async () => {
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);

    renderOverlay();

    await waitFor(() => {
      expect(screen.getByText("Review message on device")).toBeDefined();
    });
    expect(screen.queryByText("Review transaction on device")).toBeNull();
  });
});

describe("HardwareSign message signing telemetry", () => {
  // Regression cover for the hole this suite's flows used to have: a hardware
  // signer produced no signing.* event at all, because useSetupSigningFlow
  // diverts them to this overlay and never dispatches the signBlob thunk the
  // popup/metrics/access.ts handlers are keyed on. The funnel therefore showed
  // hardware rejections with no matching approvals.
  beforeEach(() => {
    jest.clearAllMocks();
    mockHardwareSignMessage.mockImplementation(({ message }) =>
      Promise.resolve(deviceKeypair.sign(encodeSep53Message(message))),
    );
    // clearAllMocks does not drain a queued *Once implementation, so restore
    // the resolving default explicitly for the rejection case below.
    mockHandleSignedHwPayload.mockResolvedValue(undefined);
  });

  it("emits signing.message_approved once the payload reaches the background", async () => {
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);

    renderOverlay();

    await waitFor(() => {
      expect(mockEmitMetric).toHaveBeenCalledWith("signing.message_approved", {
        message_type: "blob",
        origin: "example.com",
      });
    });
  });

  it("does not emit the approval when the background rejects the payload", async () => {
    // The signature was good, but the dApp's request was never resolved. The
    // software path emits nothing on approval here either.
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);
    mockHandleSignedHwPayload.mockRejectedValueOnce(
      new Error("Request expired"),
    );

    renderOverlay();

    await waitFor(() => {
      expect(mockEmitMetric).toHaveBeenCalledWith("signing.message_failed", {
        message_type: "blob",
        reason_code: "Request expired",
        origin: "example.com",
      });
    });
    expect(mockEmitMetric).not.toHaveBeenCalledWith(
      "signing.message_approved",
      expect.anything(),
    );
  });

  it("emits signing.message_failed when no device is attached", async () => {
    mockGetWalletPublicKey.mockRejectedValue(new Error("No device selected"));

    renderOverlay();

    await waitFor(() => {
      expect(mockEmitMetric).toHaveBeenCalledWith("signing.message_failed", {
        message_type: "blob",
        reason_code: "No device selected",
        origin: "example.com",
      });
    });
  });

  it("emits signing.message_rejected when the user declines on the device", async () => {
    // A decline is a user decision, not a fault. hw-app-str raises
    // StellarUserRefusedError for the deny status word, so this must land on
    // the same event as pressing reject in the popup — and carry no
    // reason_code, since there is nothing to report.
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);
    mockHardwareSignMessage.mockRejectedValue(
      new Error("User refused the request"),
    );

    renderOverlay();

    await waitFor(() => {
      expect(mockEmitMetric).toHaveBeenCalledWith("signing.message_rejected", {
        message_type: "blob",
        origin: "example.com",
      });
    });
    expect(mockEmitMetric).not.toHaveBeenCalledWith(
      "signing.message_failed",
      expect.anything(),
    );
  });

  it("still reports a decline as a rejection on the legacy message", async () => {
    // Older apps and transports worded the same decision differently.
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);
    mockHardwareSignMessage.mockRejectedValue(
      new Error("Transaction approval request was rejected"),
    );

    renderOverlay();

    await waitFor(() => {
      expect(mockEmitMetric).toHaveBeenCalledWith("signing.message_rejected", {
        message_type: "blob",
        origin: "example.com",
      });
    });
  });

  it("emits signing.message_failed when the device derives a different account", async () => {
    mockGetWalletPublicKey.mockResolvedValue(OTHER_PUBLIC_KEY);

    renderOverlay();

    await waitFor(() => {
      expect(mockEmitMetric).toHaveBeenCalledWith(
        "signing.message_failed",
        expect.objectContaining({
          message_type: "blob",
          origin: "example.com",
        }),
      );
    });
  });

  it("omits origin when the flow has no dApp url", async () => {
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);

    renderOverlay({ url: undefined });

    await waitFor(() => {
      expect(mockEmitMetric).toHaveBeenCalledWith("signing.message_approved", {
        message_type: "blob",
      });
    });
  });

  it("emits no signing event for an internal flow", async () => {
    // Internal send/swap/trustline steps report their outcome as
    // payment.completed / swap.completed / asset.added instead.
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);

    renderOverlay({ isInternal: true, uuid: undefined, url: undefined });

    await waitFor(() => {
      expect(mockHardwareSignMessage).toHaveBeenCalled();
    });
    expect(mockEmitMetric).not.toHaveBeenCalled();
  });
});
