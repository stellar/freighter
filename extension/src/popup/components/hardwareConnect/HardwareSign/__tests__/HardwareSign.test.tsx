import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { Wrapper, TEST_PUBLIC_KEY } from "popup/__testHelpers__";
import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";

const OTHER_PUBLIC_KEY =
  "GDQ6FCJPB5PWDXQNZKHGCM4FKMWJDNCSDSAKHOZPUEHFNMCRDDDA5PSC";

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

const renderOverlay = () =>
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
            transactionXDR: "Hello, Stellar!",
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
    mockHardwareSignMessage.mockResolvedValue(Buffer.from("signature"));
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

  it("tells the user to review a message, not a transaction", async () => {
    mockGetWalletPublicKey.mockResolvedValue(TEST_PUBLIC_KEY);

    renderOverlay();

    await waitFor(() => {
      expect(screen.getByText("Review message on device")).toBeDefined();
    });
    expect(screen.queryByText("Review transaction on device")).toBeNull();
  });
});
