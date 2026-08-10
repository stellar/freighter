import { configureStore } from "@reduxjs/toolkit";

import {
  ConfigurableWalletType,
  WalletType,
} from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import {
  reducer as transactionSubmissionReducer,
  signWithHardwareWallet,
} from "../transactionSubmission";

jest.mock("popup/helpers/hardwareConnect", () => ({
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

const signMessageArgs = {
  transactionXDR: "Hello, Stellar!",
  networkPassphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
  publicKey: "GDQ6FCJPB5PWDXQNZKHGCM4FKMWJDNCSDSAKHOZPUEHFNMCRDDDA5PSC",
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
    const signature = Buffer.from("a-64-byte-signature");
    (hardwareSignMessage[WalletType.LEDGER] as jest.Mock).mockResolvedValue(
      signature,
    );

    const store = makeStore();
    const res = await store.dispatch(signWithHardwareWallet(signMessageArgs));

    expect(hardwareSignMessage[WalletType.LEDGER]).toHaveBeenCalledWith({
      bipPath: "44'/148'/0'",
      message: "Hello, Stellar!",
    });
    expect(signWithHardwareWallet.fulfilled.match(res)).toBe(true);
    // Base64 rather than a Buffer, because runtime.sendMessage JSON-serializes
    // the payload on the way to the background script.
    expect(res.payload).toBe(signature.toString("base64"));
    expect(typeof res.payload).toBe("string");
  });

  it("does not route a message through the auth-entry signer", async () => {
    (hardwareSignMessage[WalletType.LEDGER] as jest.Mock).mockResolvedValue(
      Buffer.from("sig"),
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
