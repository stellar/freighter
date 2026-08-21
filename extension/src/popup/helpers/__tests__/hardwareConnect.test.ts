import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import * as StellarSDK from "stellar-sdk";
import {
  connectToLedgerTransport,
  createWalletConnection,
  getWalletPublicKey,
  hardwareSign,
  hardwareSignAuth,
  hardwareSignMessage,
  parseWalletError,
  MIN_SIGN_MESSAGE_APP_VERSION,
  UNSUPPORTED_SIGN_MESSAGE_APP_ERROR,
  UNVERIFIED_SIGN_MESSAGE_ERROR,
  MISMATCHED_HARDWARE_ACCOUNT_ERROR,
  OVERSIZED_SIGN_MESSAGE_ERROR,
} from "popup/helpers/hardwareConnect";
import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";

// Mutable so individual tests can pretend the device runs a different Stellar
// app build. Must be `mock`-prefixed to be referenced from the jest.mock
// factory below.
let mockAppConfig: { version: string; maxDataSize?: number } = {
  version: "6.0.3",
  maxDataSize: 1024,
};
const mockSignMessage = jest.fn();

jest.mock("@ledgerhq/hw-transport-webhid", () => {
  return {
    list: jest.fn().mockResolvedValue([
      {
        close: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    ]),
    create: jest.fn().mockResolvedValue({
      close: jest.fn(),
    }),
    request: jest.fn().mockResolvedValue({
      close: jest.fn(),
    }),
  };
});

jest.mock("@ledgerhq/hw-app-str", () => {
  return jest.fn().mockImplementation(() => {
    return {
      getPublicKey: (param: string) =>
        Promise.resolve({
          rawPublicKey: Buffer.from(param),
        }),
      getAppConfiguration: () =>
        Promise.resolve({ hashSigningEnabled: true, ...mockAppConfig }),
      signTransaction: () => Promise.resolve({ signature: "signTransaction" }),
      signHash: () => Promise.resolve({ signature: "signHash" }),
      signSorobanAuthorization: () =>
        Promise.resolve({ signature: "signSorobanAuthorization" }),
      signMessage: mockSignMessage,
    };
  });
});

describe("connectToLedgerTransport", () => {
  it("should connect to the ledger transport", async () => {
    const transport = await connectToLedgerTransport();
    expect(transport).toBeDefined();
    expect(TransportWebHID.list).toHaveBeenCalled();
    expect(TransportWebHID.create).toHaveBeenCalled();
  });
});

describe("createWalletConnection", () => {
  const strKey = StellarSDK.StrKey;
  it("should create a wallet connection", async () => {
    const StrKeySpy = jest.spyOn(strKey, "encodeEd25519PublicKey" as any);
    const walletConnection =
      await createWalletConnection[WalletType.LEDGER]("test");

    expect(walletConnection).toBeDefined();
    expect(StrKeySpy).toHaveBeenCalledWith(Buffer.from("test"));
  });
});

describe("getWalletPublicKey", () => {
  const strKey = StellarSDK.StrKey;
  it("should get a wallet public key", async () => {
    const StrKeySpy = jest.spyOn(strKey, "encodeEd25519PublicKey" as any);
    const publicKey = await getWalletPublicKey[WalletType.LEDGER]("test");
    expect(publicKey).toBeDefined();
    expect(StrKeySpy).toHaveBeenCalledWith(Buffer.from("test"));
  });
});

describe("hardwareSign", () => {
  it("should sign a transaction", async () => {
    const signature = await hardwareSign[WalletType.LEDGER]({
      bipPath: "bip",
      tx: StellarSDK.TransactionBuilder.fromXdr(
        "AAAAAgAAAACdtkcf/ACLqOtoQjsJLphTtyieRSEnb9pnqaf7WLws3QAAAGQDAtjKAAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABgAAAAFVU0RDAAAAADuZETgO/piLoKiQDrHP5E82b32+lGvtB3JA9/Yk3xXFf/////////8AAAAAAAAAAA==",
        TESTNET_NETWORK_DETAILS.networkPassphrase,
      ),
      isHashSigningEnabled: false,
    });
    expect(signature).toBeDefined();
    expect(signature).toBe("signTransaction");
  });
  it("should sign a hash", async () => {
    const signature = await hardwareSign[WalletType.LEDGER]({
      bipPath: "bip",
      tx: StellarSDK.TransactionBuilder.fromXdr(
        "AAAAAgAAAACdtkcf/ACLqOtoQjsJLphTtyieRSEnb9pnqaf7WLws3QAAAGQDAtjKAAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABgAAAAFVU0RDAAAAADuZETgO/piLoKiQDrHP5E82b32+lGvtB3JA9/Yk3xXFf/////////8AAAAAAAAAAA==",
        TESTNET_NETWORK_DETAILS.networkPassphrase,
      ),
      isHashSigningEnabled: true,
    });
    expect(signature).toBeDefined();
    expect(signature).toBe("signHash");
  });
});

describe("hardwareSignAuth", () => {
  it("should sign a Soroban authorization", async () => {
    const signature = await hardwareSignAuth[WalletType.LEDGER]({
      bipPath: "bip",
      auth: Buffer.from("auth"),
    });
    expect(signature).toBeDefined();
    expect(signature).toBe("signSorobanAuthorization");
  });
});

describe("hardwareSignMessage", () => {
  beforeEach(() => {
    mockAppConfig = { version: "6.0.3", maxDataSize: 1024 };
    mockSignMessage.mockReset().mockResolvedValue({ signature: "signMessage" });
  });

  it("should send the raw message bytes to the device", async () => {
    const signature = await hardwareSignMessage[WalletType.LEDGER]({
      bipPath: "bip",
      message: "Hello, Stellar!",
    });

    expect(signature).toBe("signMessage");
    // The device applies the SEP-53 prefix and hashing itself, so it must
    // receive the unmodified UTF-8 message.
    expect(mockSignMessage).toHaveBeenCalledWith(
      "bip",
      Buffer.from("Hello, Stellar!", "utf8"),
    );
  });

  it("should preserve non-ASCII messages byte for byte", async () => {
    await hardwareSignMessage[WalletType.LEDGER]({
      bipPath: "bip",
      message: "café ☕",
    });

    expect(mockSignMessage).toHaveBeenCalledWith(
      "bip",
      Buffer.from("café ☕", "utf8"),
    );
  });

  it("should reject when the Stellar app predates SEP-53 signing", async () => {
    mockAppConfig = { version: "5.6.0", maxDataSize: 1024 };

    await expect(
      hardwareSignMessage[WalletType.LEDGER]({
        bipPath: "bip",
        message: "Hello, Stellar!",
      }),
    ).rejects.toThrow(UNSUPPORTED_SIGN_MESSAGE_APP_ERROR);

    expect(mockSignMessage).not.toHaveBeenCalled();
  });

  it("should sign on the minimum supported app version", async () => {
    mockAppConfig = {
      version: MIN_SIGN_MESSAGE_APP_VERSION,
      maxDataSize: 1024,
    };

    const signature = await hardwareSignMessage[WalletType.LEDGER]({
      bipPath: "bip",
      message: "Hello, Stellar!",
    });

    expect(signature).toBe("signMessage");
  });

  it("should refuse a message larger than the device can display", async () => {
    // maxDataSize comes back from the same getAppConfiguration call as version.
    mockAppConfig = { version: "6.0.3", maxDataSize: 8 };

    await expect(
      hardwareSignMessage[WalletType.LEDGER]({
        bipPath: "bip",
        message: "a message well past eight bytes",
      }),
    ).rejects.toThrow(OVERSIZED_SIGN_MESSAGE_ERROR);

    expect(mockSignMessage).not.toHaveBeenCalled();
  });

  it("should measure the limit in bytes, not characters", async () => {
    // "☕" is 3 UTF-8 bytes; 4 of them exceed an 8-byte device limit even though
    // the string is only 4 characters long.
    mockAppConfig = { version: "6.0.3", maxDataSize: 8 };

    await expect(
      hardwareSignMessage[WalletType.LEDGER]({
        bipPath: "bip",
        message: "☕☕☕☕",
      }),
    ).rejects.toThrow(OVERSIZED_SIGN_MESSAGE_ERROR);
  });

  it("should sign when an older app does not report a size limit", async () => {
    mockAppConfig = { version: "6.0.3", maxDataSize: undefined };

    const signature = await hardwareSignMessage[WalletType.LEDGER]({
      bipPath: "bip",
      message: "Hello, Stellar!",
    });

    expect(signature).toBe("signMessage");
  });

  it("should defer to the device when the version is unparseable", async () => {
    mockAppConfig = { version: "not-a-version", maxDataSize: 1024 };

    const signature = await hardwareSignMessage[WalletType.LEDGER]({
      bipPath: "bip",
      message: "Hello, Stellar!",
    });

    expect(signature).toBe("signMessage");
    expect(mockSignMessage).toHaveBeenCalled();
  });
});

describe("parseWalletError", () => {
  // i18n is not initialized under Jest, so t() returns the key and leaves
  // {{version}} uninterpolated — assert on the key itself.
  const UPDATE_APP_MESSAGE =
    "Update the Stellar app on your Ledger to version {{version}} or later to sign messages.";

  it("should ask the user to update an outdated Stellar app", () => {
    const message = parseWalletError[WalletType.LEDGER](
      new Error(UNSUPPORTED_SIGN_MESSAGE_APP_ERROR),
    );

    expect(message).toBe(UPDATE_APP_MESSAGE);
    expect(message).not.toContain(UNSUPPORTED_SIGN_MESSAGE_APP_ERROR);
  });

  it("should NOT claim a message-signing problem on a generic INS_NOT_SUPPORTED", () => {
    // 0x6d00 means "app does not know this instruction" — it also fires when
    // signing a Soroban auth entry on an older app, or with the wrong app open.
    // Claiming those users need 6.0.0 "to sign messages" would be wrong on both
    // counts, so this parser leaves the device's own wording alone.
    const message = parseWalletError[WalletType.LEDGER](
      new Error("Ledger device: INS_NOT_SUPPORTED (0x6d00)"),
    );

    expect(message).not.toBe(UPDATE_APP_MESSAGE);
    expect(message).toBe("Ledger device: INS_NOT_SUPPORTED (0x6d00)");
  });

  it("should not blame the device when a signature fails to verify", () => {
    // A failed verify also fires for a device whose SEP-53 digest disagrees
    // with ours, where the attached device is the right one. Telling that user
    // to connect a different device sends them down a dead end.
    const unverified = parseWalletError[WalletType.LEDGER](
      new Error(UNVERIFIED_SIGN_MESSAGE_ERROR),
    );
    const mismatched = parseWalletError[WalletType.LEDGER](
      new Error(MISMATCHED_HARDWARE_ACCOUNT_ERROR),
    );

    expect(unverified).not.toBe(mismatched);
    expect(unverified).not.toContain(UNVERIFIED_SIGN_MESSAGE_ERROR);
    expect(unverified).toContain("could not be verified");
  });

  it("should translate a device rejection", () => {
    // Declining on the device is the one error users hit on purpose.
    // hw-app-str maps the deny status word to StellarUserRefusedError with
    // this exact text, for every sign call — see remapErrors in its Str.js.
    const message = parseWalletError[WalletType.LEDGER](
      new Error("User refused the request"),
    );

    expect(message).toBe("Request rejected on your device.");
    expect(message).not.toContain("User refused the request");
  });

  it("should pass through unrelated errors untouched", () => {
    const message = parseWalletError[WalletType.LEDGER](
      new Error("Some other device failure"),
    );

    expect(message).toBe("Some other device failure");
  });
});
