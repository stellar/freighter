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
} from "popup/helpers/hardwareConnect";
import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";

// Mutable so individual tests can pretend the device runs an older Stellar app.
// Must be `mock`-prefixed to be referenced from the jest.mock factory below.
let mockAppVersion = "6.0.3";
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
        Promise.resolve({
          version: mockAppVersion,
          hashSigningEnabled: true,
          maxDataSize: 1024,
        }),
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
      tx: StellarSDK.TransactionBuilder.fromXDR(
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
      tx: StellarSDK.TransactionBuilder.fromXDR(
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
    mockAppVersion = "6.0.3";
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
    mockAppVersion = "5.6.0";

    await expect(
      hardwareSignMessage[WalletType.LEDGER]({
        bipPath: "bip",
        message: "Hello, Stellar!",
      }),
    ).rejects.toThrow(UNSUPPORTED_SIGN_MESSAGE_APP_ERROR);

    expect(mockSignMessage).not.toHaveBeenCalled();
  });

  it("should sign on the minimum supported app version", async () => {
    mockAppVersion = MIN_SIGN_MESSAGE_APP_VERSION;

    const signature = await hardwareSignMessage[WalletType.LEDGER]({
      bipPath: "bip",
      message: "Hello, Stellar!",
    });

    expect(signature).toBe("signMessage");
  });

  it("should defer to the device when the version is unparseable", async () => {
    mockAppVersion = "not-a-version";

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

  it("should map the device's INS_NOT_SUPPORTED status word", () => {
    const message = parseWalletError[WalletType.LEDGER](
      new Error("Ledger device: INS_NOT_SUPPORTED (0x6d00)"),
    );

    expect(message).toBe(UPDATE_APP_MESSAGE);
  });

  it("should pass through unrelated errors untouched", () => {
    const message = parseWalletError[WalletType.LEDGER](
      new Error("Some other device failure"),
    );

    expect(message).toBe("Some other device failure");
  });
});
