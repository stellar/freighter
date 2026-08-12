import { configureStore } from "@reduxjs/toolkit";
import { Keypair } from "stellar-sdk";

import {
  ConfigurableWalletType,
  WalletType,
} from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { encodeSep53Message } from "helpers/stellar";
import {
  reducer as transactionSubmissionReducer,
  signWithHardwareWallet,
} from "../transactionSubmission";

jest.mock("popup/helpers/hardwareConnect", () => ({
  ...jest.requireActual("popup/helpers/hardwareConnect"),
  hardwareSign: { Ledger: jest.fn() },
  hardwareSignAuth: { Ledger: jest.fn() },
  hardwareSignMessage: { Ledger: jest.fn() },
}));

const { hardwareSignMessage, hardwareSignAuth } = jest.requireMock<
  typeof import("popup/helpers/hardwareConnect")
>("popup/helpers/hardwareConnect");

const makeStore = () =>
  configureStore({
    reducer: { transactionSubmission: transactionSubmissionReducer },
  });

const MESSAGE = "Hello, Stellar!";

// Real keypairs, so the thunk's signature verification is exercised for real
// rather than against a mock-shaped stand-in.
const deviceKeypair = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 1));
const otherKeypair = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 2));

const signMessageArgs = {
  transactionXDR: MESSAGE,
  networkPassphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
  publicKey: deviceKeypair.publicKey(),
  bipPath: "44'/148'/0'",
  walletType: WalletType.LEDGER as ConfigurableWalletType,
  isHashSigningEnabled: false,
  isSignMessage: true,
};

describe("signWithHardwareWallet isSignMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("signs the raw message and returns a base64 signature", async () => {
    const signature = deviceKeypair.sign(encodeSep53Message(MESSAGE));
    (hardwareSignMessage[WalletType.LEDGER] as jest.Mock).mockResolvedValue(
      signature,
    );

    const store = makeStore();
    const res = await store.dispatch(signWithHardwareWallet(signMessageArgs));

    expect(hardwareSignMessage[WalletType.LEDGER]).toHaveBeenCalledWith({
      bipPath: "44'/148'/0'",
      message: MESSAGE,
    });
    expect(signWithHardwareWallet.fulfilled.match(res)).toBe(true);
    // Base64 rather than a Buffer, because runtime.sendMessage JSON-serializes
    // the payload on the way to the background script.
    expect(res.payload).toBe(signature.toString("base64"));
    expect(typeof res.payload).toBe("string");
  });

  it("refuses a signature produced by a different key than the one reported", async () => {
    // getWalletPublicKey and hardwareSignMessage each open their own device
    // connection, so a second Ledger — or a swap between the two calls — can
    // sign while the first key is still what gets reported as signerAddress.
    (hardwareSignMessage[WalletType.LEDGER] as jest.Mock).mockResolvedValue(
      otherKeypair.sign(encodeSep53Message(MESSAGE)),
    );

    const store = makeStore();
    const res = await store.dispatch(signWithHardwareWallet(signMessageArgs));

    expect(signWithHardwareWallet.rejected.match(res)).toBe(true);
    expect(res.payload).toEqual({
      errorMessage: "SIGN_MESSAGE_SIGNATURE_UNVERIFIED",
    });
  });

  it("refuses a signature over a different message", async () => {
    // Guards the digest agreement itself: the signature must cover exactly the
    // SEP-53 encoding of the message the user approved.
    (hardwareSignMessage[WalletType.LEDGER] as jest.Mock).mockResolvedValue(
      deviceKeypair.sign(encodeSep53Message("a different message")),
    );

    const store = makeStore();
    const res = await store.dispatch(signWithHardwareWallet(signMessageArgs));

    expect(signWithHardwareWallet.rejected.match(res)).toBe(true);
    // The correct device signed — it just did not produce the digest we
    // expected. Reporting a device mismatch here would send the user off to
    // swap hardware that was never the problem.
    expect(res.payload).toEqual({
      errorMessage: "SIGN_MESSAGE_SIGNATURE_UNVERIFIED",
    });
    expect(res.payload).not.toEqual({
      errorMessage: "MISMATCHED_HARDWARE_ACCOUNT",
    });
  });

  it("does not route a message through the auth-entry signer", async () => {
    (hardwareSignMessage[WalletType.LEDGER] as jest.Mock).mockResolvedValue(
      deviceKeypair.sign(encodeSep53Message(MESSAGE)),
    );

    const store = makeStore();
    await store.dispatch(signWithHardwareWallet(signMessageArgs));

    expect(hardwareSignAuth[WalletType.LEDGER]).not.toHaveBeenCalled();
  });

  it("rejects with the device error message when signing fails", async () => {
    (hardwareSignMessage[WalletType.LEDGER] as jest.Mock).mockRejectedValue(
      new Error("SIGN_MESSAGE_APP_VERSION_UNSUPPORTED"),
    );

    const store = makeStore();
    const res = await store.dispatch(signWithHardwareWallet(signMessageArgs));

    expect(signWithHardwareWallet.rejected.match(res)).toBe(true);
    expect(res.payload).toEqual({
      errorMessage: "SIGN_MESSAGE_APP_VERSION_UNSUPPORTED",
    });
  });
});
