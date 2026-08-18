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

const renderOverlay = ({
  message = "Hello, Stellar!",
}: { message?: string } = {}) =>
  render(
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
        uuid="test-uuid"
      />
    </Wrapper>,
  );

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
