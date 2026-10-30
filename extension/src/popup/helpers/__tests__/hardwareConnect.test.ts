import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import * as StellarSDK from "stellar-sdk";
import {
  connectToLedgerTransport,
  createWalletConnection,
  getWalletPublicKey,
  hardwareSign,
  hardwareSignAuth,
  hardwareSignMessage,
  isDeviceRefusalError,
  parseWalletError,
  LEDGER_APP_NOT_OPEN_STATUS,
  MIN_SIGN_MESSAGE_APP_VERSION,
  UNSUPPORTED_SIGN_MESSAGE_APP_ERROR,
  UNVERIFIED_SIGN_MESSAGE_ERROR,
  MISMATCHED_HARDWARE_ACCOUNT_ERROR,
  OVERSIZED_SIGN_MESSAGE_ERROR,
  OTHER_LEDGER_APP_OPEN_ERROR,
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
// Defaults to echoing the bip path back as the key; tests that need the device
// to answer differently queue a one-off implementation.
const mockGetPublicKey = jest.fn();
const mockEchoPublicKey = (param: string) =>
  Promise.resolve({ rawPublicKey: Buffer.from(param) });

// Shape of the error @ledgerhq/errors raises for a non-success status word.
const mockStatusError = (statusCode: number) =>
  Object.assign(
    new Error(`Ledger device: UNKNOWN_ERROR (0x${statusCode.toString(16)})`),
    { statusCode },
  );

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
      getPublicKey: mockGetPublicKey,
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

beforeEach(() => {
  mockGetPublicKey.mockReset();
  mockGetPublicKey.mockImplementation(mockEchoPublicKey);
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

describe("when the Stellar app is not open", () => {
  const BIP_PATH = "44'/148'/0'";
  const OPEN_STELLAR_APP_APDU = [
    0xe0,
    0xd8,
    0x00,
    0x00,
    Buffer.from("Stellar", "ascii"),
  ];

  const makeTransport = (send: jest.Mock) => ({
    send,
    on: jest.fn(),
    off: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    device: { close: jest.fn().mockResolvedValue(undefined) },
  });

  const requestMock = TransportWebHID.request as jest.Mock;
  const createMock = TransportWebHID.create as jest.Mock;
  const reopenMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    reopenMock.mockReset();
    (TransportWebHID as any).open = reopenMock;
    mockGetPublicKey.mockRejectedValueOnce(
      mockStatusError(LEDGER_APP_NOT_OPEN_STATUS),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should ask the device to open it and carry on once it is running", async () => {
    const dashboard = makeTransport(
      jest.fn().mockResolvedValue(Buffer.from([])),
    );
    const relaunched = makeTransport(jest.fn());
    requestMock.mockResolvedValueOnce(dashboard);
    reopenMock.mockResolvedValue(relaunched);

    const connection = createWalletConnection[WalletType.LEDGER](BIP_PATH);
    await jest.advanceTimersByTimeAsync(1000);

    expect(await connection).toBe(
      StellarSDK.StrKey.encodeEd25519PublicKey(Buffer.from(BIP_PATH)),
    );
    expect(dashboard.send).toHaveBeenCalledWith(...OPEN_STELLAR_APP_APDU);
    expect(mockGetPublicKey).toHaveBeenCalledTimes(2);
  });

  it("should do the same when signing with an already-added account", async () => {
    const dashboard = makeTransport(
      jest.fn().mockResolvedValue(Buffer.from([])),
    );
    createMock.mockResolvedValueOnce(dashboard);
    reopenMock.mockResolvedValue(makeTransport(jest.fn()));

    const publicKey = getWalletPublicKey[WalletType.LEDGER](BIP_PATH);
    await jest.advanceTimersByTimeAsync(1000);

    expect(await publicKey).toBe(
      StellarSDK.StrKey.encodeEd25519PublicKey(Buffer.from(BIP_PATH)),
    );
    expect(dashboard.send).toHaveBeenCalledWith(...OPEN_STELLAR_APP_APDU);
  });

  it("should treat the device dropping off USB as the app launching", async () => {
    // The exchange never settles here, as happens when the device restarts
    // its USB stack before the reply gets out.
    const dashboard = makeTransport(jest.fn(() => new Promise(() => {})));
    requestMock.mockResolvedValueOnce(dashboard);
    reopenMock.mockResolvedValue(makeTransport(jest.fn()));

    const connection = createWalletConnection[WalletType.LEDGER](BIP_PATH);
    await jest.advanceTimersByTimeAsync(0);
    const [, onDisconnect] = dashboard.on.mock.calls.find(
      ([event]) => event === "disconnect",
    );
    onDisconnect();
    await jest.advanceTimersByTimeAsync(1000);

    await expect(connection).resolves.toBeDefined();
  });

  it("should keep looking while the device is re-enumerating", async () => {
    const dashboard = makeTransport(
      jest.fn().mockResolvedValue(Buffer.from([])),
    );
    requestMock.mockResolvedValueOnce(dashboard);
    reopenMock
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("The device is already open."))
      .mockResolvedValue(makeTransport(jest.fn()));

    const connection = createWalletConnection[WalletType.LEDGER](BIP_PATH);
    await jest.advanceTimersByTimeAsync(3000);

    await expect(connection).resolves.toBeDefined();
    expect(reopenMock).toHaveBeenCalledTimes(3);
  });

  it("should surface the original error when the user declines to open it", async () => {
    const dashboard = makeTransport(
      jest.fn().mockRejectedValue(mockStatusError(0x5501)),
    );
    requestMock.mockResolvedValueOnce(dashboard);

    const connection = createWalletConnection[WalletType.LEDGER](BIP_PATH);
    const assertion = expect(connection).rejects.toMatchObject({
      statusCode: LEDGER_APP_NOT_OPEN_STATUS,
    });
    await jest.advanceTimersByTimeAsync(0);

    await assertion;
    expect(reopenMock).not.toHaveBeenCalled();
    expect(mockGetPublicKey).toHaveBeenCalledTimes(1);
  });

  it("should give up when the prompt on the device goes unanswered", async () => {
    const dashboard = makeTransport(jest.fn(() => new Promise(() => {})));
    requestMock.mockResolvedValueOnce(dashboard);

    const connection = createWalletConnection[WalletType.LEDGER](BIP_PATH);
    const assertion = expect(connection).rejects.toMatchObject({
      statusCode: LEDGER_APP_NOT_OPEN_STATUS,
    });
    await jest.advanceTimersByTimeAsync(30000);

    await assertion;
    expect(reopenMock).not.toHaveBeenCalled();
    // transport.close() would wait forever on the unanswered exchange and
    // leave the device open for the next attempt to trip over.
    expect(dashboard.device.close).toHaveBeenCalled();
  });

  it("should release a device left open by an earlier attempt before connecting", async () => {
    const leftOpen = { close: jest.fn().mockResolvedValue(undefined) };
    (TransportWebHID.list as jest.Mock).mockResolvedValueOnce([leftOpen]);
    mockGetPublicKey.mockReset();
    mockGetPublicKey.mockImplementation(mockEchoPublicKey);
    requestMock.mockImplementationOnce(async () => {
      // WebHID returns the same device object, so it must be closed by now.
      expect(leftOpen.close).toHaveBeenCalled();
      return makeTransport(jest.fn());
    });

    await expect(
      createWalletConnection[WalletType.LEDGER](BIP_PATH),
    ).resolves.toBeDefined();
  });

  it("should give up when the device cannot be reached again", async () => {
    const dashboard = makeTransport(
      jest.fn().mockResolvedValue(Buffer.from([])),
    );
    requestMock.mockResolvedValueOnce(dashboard);
    reopenMock.mockResolvedValue(null);

    const connection = createWalletConnection[WalletType.LEDGER](BIP_PATH);
    const assertion = expect(connection).rejects.toMatchObject({
      statusCode: LEDGER_APP_NOT_OPEN_STATUS,
    });
    await jest.advanceTimersByTimeAsync(10000);

    await assertion;
    expect(mockGetPublicKey).toHaveBeenCalledTimes(1);
  });

  it("should not guess which device came back when two Ledgers are attached", async () => {
    const dashboard = makeTransport(
      jest.fn().mockResolvedValue(Buffer.from([])),
    );
    requestMock.mockResolvedValueOnce(dashboard);
    const attached = { close: jest.fn().mockResolvedValue(undefined) };
    const listMock = TransportWebHID.list as jest.Mock;
    listMock
      // The stale-device cleanup before connecting.
      .mockResolvedValueOnce([attached])
      .mockResolvedValue([attached, attached]);
    reopenMock.mockResolvedValue(makeTransport(jest.fn()));

    const connection = createWalletConnection[WalletType.LEDGER](BIP_PATH);
    const assertion = expect(connection).rejects.toMatchObject({
      statusCode: LEDGER_APP_NOT_OPEN_STATUS,
    });
    await jest.advanceTimersByTimeAsync(10000);

    await assertion;
    expect(reopenMock).not.toHaveBeenCalled();
    listMock.mockResolvedValue([attached]);
  });
});

describe("when another app is open", () => {
  const BIP_PATH = "44'/148'/0'";
  const GET_APP_NAME_APDU = [0xb0, 0x01, 0x00, 0x00];
  const QUIT_APP_APDU = [0xb0, 0xa7, 0x00, 0x00, undefined];
  const OPEN_STELLAR_APP_APDU = [
    0xe0,
    0xd8,
    0x00,
    0x00,
    Buffer.from("Stellar", "ascii"),
  ];

  // Reply to the app-name request: format, name length, name, version length,
  // version, status word.
  const appInfo = (name: string) =>
    Buffer.concat([
      Buffer.from([0x01, name.length]),
      Buffer.from(name, "ascii"),
      Buffer.from([0x05]),
      Buffer.from("1.0.0", "ascii"),
      Buffer.from([0x90, 0x00]),
    ]);

  // A device in the named app: answers the app-name request, and accepts
  // every other request unless told otherwise.
  const makeDevice = (name: string, otherReply?: () => Promise<Buffer>) => ({
    send: jest.fn((cla: number, ins: number) =>
      cla === 0xb0 && ins === 0x01
        ? Promise.resolve(appInfo(name))
        : (otherReply ?? (() => Promise.resolve(Buffer.from([0x90, 0x00]))))(),
    ),
    on: jest.fn(),
    off: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    device: { close: jest.fn().mockResolvedValue(undefined) },
  });

  const requestMock = TransportWebHID.request as jest.Mock;
  const reopenMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    reopenMock.mockReset();
    (TransportWebHID as any).open = reopenMock;
    // Ethereum reads Stellar's get-public-key request as a malformed one of
    // its own.
    mockGetPublicKey.mockRejectedValueOnce(mockStatusError(0x6a80));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should close it, open the Stellar app and carry on", async () => {
    const ethereum = makeDevice("Ethereum");
    const dashboard = makeDevice("BOLOS");
    requestMock.mockResolvedValueOnce(ethereum);
    reopenMock
      .mockResolvedValueOnce(dashboard)
      .mockResolvedValue(makeDevice("Stellar"));
    mockGetPublicKey.mockRejectedValueOnce(
      mockStatusError(LEDGER_APP_NOT_OPEN_STATUS),
    );

    const connection = createWalletConnection[WalletType.LEDGER](BIP_PATH);
    await jest.advanceTimersByTimeAsync(2000);

    expect(await connection).toBe(
      StellarSDK.StrKey.encodeEd25519PublicKey(Buffer.from(BIP_PATH)),
    );
    expect(ethereum.send).toHaveBeenCalledWith(...GET_APP_NAME_APDU);
    expect(ethereum.send).toHaveBeenCalledWith(...QUIT_APP_APDU);
    expect(dashboard.send).toHaveBeenCalledWith(...OPEN_STELLAR_APP_APDU);
    expect(mockGetPublicKey).toHaveBeenCalledTimes(3);
  });

  it("should ask the user to close it when it will not quit", async () => {
    const ethereum = makeDevice("Ethereum", () =>
      Promise.reject(mockStatusError(0x6d00)),
    );
    requestMock.mockResolvedValueOnce(ethereum);

    await expect(
      createWalletConnection[WalletType.LEDGER](BIP_PATH),
    ).rejects.toThrow(OTHER_LEDGER_APP_OPEN_ERROR);
    expect(reopenMock).not.toHaveBeenCalled();
  });

  it("should only try closing it once", async () => {
    const ethereum = makeDevice("Ethereum");
    requestMock.mockResolvedValueOnce(ethereum);
    // Still not Stellar after quitting, e.g. the app relaunched itself.
    reopenMock.mockResolvedValue(makeDevice("Ethereum"));
    mockGetPublicKey.mockRejectedValueOnce(mockStatusError(0x6a80));

    const connection = createWalletConnection[WalletType.LEDGER](BIP_PATH);
    const assertion = expect(connection).rejects.toMatchObject({
      statusCode: 0x6a80,
    });
    await jest.advanceTimersByTimeAsync(1000);

    await assertion;
    expect(mockGetPublicKey).toHaveBeenCalledTimes(2);
  });

  it("should not try to quit the dashboard on older firmware", async () => {
    // Older firmware names the dashboard "OLOS" plus a NUL byte.
    const dashboard = makeDevice("OLOS\u0000");
    requestMock.mockResolvedValueOnce(dashboard);

    await expect(
      createWalletConnection[WalletType.LEDGER](BIP_PATH),
    ).rejects.toMatchObject({ statusCode: 0x6a80 });
    expect(dashboard.send).not.toHaveBeenCalledWith(...QUIT_APP_APDU);
  });

  it("should pass on errors from the Stellar app itself", async () => {
    const stellar = makeDevice("Stellar");
    requestMock.mockResolvedValueOnce(stellar);

    await expect(
      createWalletConnection[WalletType.LEDGER](BIP_PATH),
    ).rejects.toMatchObject({ statusCode: 0x6a80 });
    expect(stellar.send).not.toHaveBeenCalledWith(...QUIT_APP_APDU);
  });

  it("should pass on the original error when the device will not say which app is open", async () => {
    // A locked device, for one, refuses every request.
    const locked = makeDevice("Stellar");
    locked.send.mockRejectedValue(mockStatusError(0x5515));
    requestMock.mockResolvedValueOnce(locked);

    await expect(
      createWalletConnection[WalletType.LEDGER](BIP_PATH),
    ).rejects.toMatchObject({ statusCode: 0x6a80 });
    expect(locked.send).toHaveBeenCalledTimes(1);
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

  it("should tell the user to open the Stellar app when it is closed", () => {
    // The status word comes from the Ledger OS, not the Stellar app, so the
    // library has no name for it and the raw text is all the user used to see.
    const message = parseWalletError[WalletType.LEDGER](
      mockStatusError(LEDGER_APP_NOT_OPEN_STATUS),
    );

    expect(message).toBe(
      "The Stellar app is not open on your Ledger. Open it on the device and try again.",
    );
    expect(message).not.toContain("UNKNOWN_ERROR");
  });

  it("should recognise a closed app from the message alone", () => {
    // HardwareSign hands this parser the message string it got back through
    // Redux, with no statusCode attached.
    const message = parseWalletError[WalletType.LEDGER](
      "Ledger device: UNKNOWN_ERROR (0x6511)",
    );

    expect(message).not.toContain("UNKNOWN_ERROR");
  });

  it("should tell the user to close another app that would not quit", () => {
    const message = parseWalletError[WalletType.LEDGER](
      new Error(OTHER_LEDGER_APP_OPEN_ERROR),
    );

    expect(message).toBe(
      "Another app is open on your Ledger. Close it, open the Stellar app and try again.",
    );
  });

  it("should tell the user to unlock a locked device", () => {
    // @ledgerhq/errors words this one itself, as LockedDeviceError.
    const message = parseWalletError[WalletType.LEDGER](
      new Error("Ledger device: Locked device (0x5515)"),
    );

    expect(message).toBe("Your Ledger is locked. Unlock it and try again.");
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

describe("isDeviceRefusalError", () => {
  // Telemetry uses this to tell a user decision from a fault: a decline is
  // reported as a rejection, everything else as a failure.
  it("recognises the refusal hw-app-str raises for the deny status word", () => {
    expect(isDeviceRefusalError(new Error("User refused the request"))).toBe(
      true,
    );
  });

  it("recognises the wording older apps and transports produced", () => {
    expect(
      isDeviceRefusalError(
        new Error("Transaction approval request was rejected"),
      ),
    ).toBe(true);
  });

  it("does not treat a missing device as a refusal", () => {
    expect(isDeviceRefusalError(new Error("No device selected"))).toBe(false);
  });

  it("does not treat the mismatched-account sentinel as a refusal", () => {
    // The wallet refuses here, not the user.
    expect(
      isDeviceRefusalError(new Error(MISMATCHED_HARDWARE_ACCOUNT_ERROR)),
    ).toBe(false);
  });

  it("handles a non-Error value without throwing", () => {
    expect(isDeviceRefusalError("User refused the request")).toBe(true);
    expect(isDeviceRefusalError(undefined)).toBe(false);
    expect(isDeviceRefusalError(null)).toBe(false);
  });
});
