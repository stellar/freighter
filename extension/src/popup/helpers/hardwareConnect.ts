import { FeeBumpTransaction, Transaction, StrKey } from "stellar-sdk";
import semver from "semver";
import {
  ConfigurableWalletType,
  WalletType,
} from "@shared/constants/hardwareWallet";
import i18n from "popup/helpers/localizationConfig";

/* Ledger Imports */
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import LedgerApi from "@ledgerhq/hw-app-str";

import LedgerLogo from "popup/assets/ledger-logo.png";
/* end Ledger imports */

// SEP-53 message signing (APDU 0x0C) landed in the Ledger Stellar app v6.0.0.
// Older apps reject the instruction with INS_NOT_SUPPORTED, which reads as an
// opaque transport error, so we check the version up front instead.
export const MIN_SIGN_MESSAGE_APP_VERSION = "6.0.0";

// Sentinel thrown by hardwareSignMessage and mapped to a user-facing string in
// parseWalletError.
export const UNSUPPORTED_SIGN_MESSAGE_APP_ERROR =
  "SIGN_MESSAGE_APP_VERSION_UNSUPPORTED";

// Sentinel thrown when the attached device derives a different key than the
// account the user is approving with. See the check in HardwareSign, which
// reads the device key before signing and refuses outright.
export const MISMATCHED_HARDWARE_ACCOUNT_ERROR = "MISMATCHED_HARDWARE_ACCOUNT";

// Sentinel raised when a returned signature does not verify against the key we
// are about to report as the signer. Distinct from the mismatch above: that one
// is a key we read and compared, this one is a signature we cannot attribute.
// A device swapped between connections is only one cause — a device whose
// SEP-53 digest disagrees with encodeSep53Message, or one that returns a
// malformed signature, lands here too, and for those the correct device is
// already attached. See the verification in signWithHardwareWallet.
export const UNVERIFIED_SIGN_MESSAGE_ERROR =
  "SIGN_MESSAGE_SIGNATURE_UNVERIFIED";

// Sentinel thrown when a message exceeds the device's own byte limit, which
// getAppConfiguration reports alongside the version.
export const OVERSIZED_SIGN_MESSAGE_ERROR = "SIGN_MESSAGE_TOO_LARGE";

// Status word the Ledger OS answers with when a Stellar APDU arrives while the
// device is on its dashboard, i.e. no app is open. The Stellar app never sees
// the request, so hw-app-str has no mapping for it and it surfaces as
// "Ledger device: UNKNOWN_ERROR (0x6511)".
export const LEDGER_APP_NOT_OPEN_STATUS = 0x6511;

// Sentinel thrown when another app (Ethereum, Bitcoin, ...) is open on the
// device and could not be closed for us. That app answers our requests with
// errors of its own, which say nothing useful about the real problem.
export const OTHER_LEDGER_APP_OPEN_ERROR = "LEDGER_OTHER_APP_OPEN";

// The name the Stellar app is installed under, which is what the OS matches
// the open-app request against.
const LEDGER_STELLAR_APP_NAME = "Stellar";

// The name the device reports for itself while it is on the dashboard.
const LEDGER_DASHBOARD_NAME = "BOLOS";

// How long to wait for the user to answer the open-app prompt on the device
// before giving up and asking them to open the app themselves.
const OPEN_APP_TIMEOUT_MS = 30000;

// Launching an app makes the device drop off USB and come back, so the old
// transport is dead and the new one takes a moment to appear.
const REOPEN_POLL_INTERVAL_MS = 1000;
const REOPEN_POLL_ATTEMPTS = 10;

// Messages that mean the user declined on the device rather than something
// going wrong. hw-app-str raises StellarUserRefusedError("User refused the
// request") for the deny status word (0x6985) on every sign call; the second
// string is what older apps and transports produced for the same decision.
// Kept next to parseWalletError, which matches the same two strings, so the
// two never drift apart.
const DEVICE_REFUSAL_MESSAGES = [
  "User refused the request",
  "Transaction approval request was rejected",
];

/**
 * True when a hardware error is the user declining on the device.
 *
 * A decline is a user decision, so telemetry reports it as a rejection, the
 * same as pressing reject in the popup. Every other hardware error — no device
 * attached, a transport fault, the wrong device, an app too old — is a failure
 * the user did not choose. Matching on the message is the only signal
 * available: the deny status word reaches us already wrapped in an Error.
 */
export const isDeviceRefusalError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return DEVICE_REFUSAL_MESSAGES.some((refusal) => message.includes(refusal));
};

/*
 ** HELPER METHODS
 */

type CreateWalletConnection = {
  [key in ConfigurableWalletType]: (bipPath?: string) => Promise<string>;
};

// Close existing connections to avoid "device already open" error. A failed
// attempt can leave the device open, and WebHID hands the same device object
// back on the next attempt, so every connect has to start from here.
const closeLedgerDevices = async () => {
  const existingTransports = await TransportWebHID.list();
  await Promise.all(
    existingTransports.map((existingTransport) =>
      existingTransport.close().catch(() => {
        // Ignore close errors - device might already be closed
      }),
    ),
  );
};

// To communicate with an existing ledger connection, we need to close existing connections first
export const connectToLedgerTransport = async () => {
  await closeLedgerDevices();

  return TransportWebHID.create();
};

type LedgerTransport = Awaited<ReturnType<typeof TransportWebHID.create>>;

const isAppNotOpenError = (error: unknown): boolean =>
  (error as { statusCode?: number } | null)?.statusCode ===
  LEDGER_APP_NOT_OPEN_STATUS;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/*
 * Asks the device which app is running. Every app answers this, as does the
 * dashboard, which reports itself as "BOLOS".
 * @returns {string | null} The app name, or null if the device did not answer.
 */
const getRunningAppName = async (
  transport: LedgerTransport,
): Promise<string | null> => {
  try {
    // Reply: format byte, name length, name, version length, version, ...
    const response = await transport.send(0xb0, 0x01, 0x00, 0x00);
    const nameLength = response[1];
    return response.subarray(2, 2 + nameLength).toString("ascii");
  } catch (e) {
    return null;
  }
};

/*
 * Sends a request that makes the device switch apps, then reconnects once it
 * comes back. Switching apps makes the device drop off USB, so the transport
 * passed in is released either way.
 * @param {LedgerTransport} transport - A transport to the device.
 * @param {number} cla - The request's class byte.
 * @param {number} ins - The request's instruction byte.
 * @param {Buffer} data - The request's payload.
 * @returns {LedgerTransport | null} A transport to the device in its new app,
 * or null if the device refused (declined, not installed), never answered, or
 * could not be reached again without a new permission prompt.
 */
const switchLedgerApp = async (
  transport: LedgerTransport,
  cla: number,
  ins: number,
  data?: Buffer,
): Promise<LedgerTransport | null> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let onDisconnect: (() => void) | undefined;
  // transport.close() waits for the exchange in flight, which never settles if
  // the device went away or the prompt was left unanswered, and would leave the
  // device open. Closing the device itself does not wait.
  const release = () => {
    (transport as TransportWebHID).device.close().catch(() => {
      // Ignore close errors - the device has usually already gone away
    });
  };

  try {
    // The device confirms with a status word, then drops off USB to switch
    // apps. On some firmware the drop wins and the exchange never settles, so
    // a disconnect counts as the switch happening too.
    const outcome = await Promise.race([
      transport
        .send(cla, ins, 0x00, 0x00, data)
        .then(() => "launching" as const),
      new Promise<"launching">((resolve) => {
        onDisconnect = () => resolve("launching");
        transport.on("disconnect", onDisconnect);
      }),
      new Promise<"timeout">((resolve) => {
        timeoutId = setTimeout(() => resolve("timeout"), OPEN_APP_TIMEOUT_MS);
      }),
    ]);
    if (outcome === "timeout") {
      return null;
    }
  } catch (e) {
    // A status word means the device answered and did not switch: the user
    // declined, or the app is not installed. Any other failure is the
    // connection dropping mid-exchange as the device switches.
    if ((e as { statusCode?: number } | null)?.statusCode !== undefined) {
      return null;
    }
  } finally {
    clearTimeout(timeoutId);
    if (onDisconnect) {
      transport.off("disconnect", onDisconnect);
    }
    release();
  }

  // openConnected rather than create: it only returns a device the user has
  // already granted, where create falls back to a permission prompt that
  // needs a user gesture we no longer have.
  for (let attempt = 0; attempt < REOPEN_POLL_ATTEMPTS; attempt += 1) {
    await wait(REOPEN_POLL_INTERVAL_MS);
    const reopened = await TransportWebHID.openConnected().catch(() => null);
    if (reopened) {
      return reopened;
    }
  }

  return null;
};

// Asks the Ledger OS to launch the Stellar app, which the user confirms on the
// device. Only answered on the dashboard.
const openStellarApp = (transport: LedgerTransport) =>
  switchLedgerApp(
    transport,
    0xe0,
    0xd8,
    Buffer.from(LEDGER_STELLAR_APP_NAME, "ascii"),
  );

// Asks the running app to quit back to the dashboard. No confirmation needed.
const quitLedgerApp = (transport: LedgerTransport) =>
  switchLedgerApp(transport, 0xb0, 0xa7);

/*
 * Reads the public key, getting the Stellar app open first if it is not:
 * launching it from the dashboard, or closing another app that is in the way.
 * Every Ledger flow reads the key before doing anything else, so this is the
 * one place those cases need handling.
 */
const getLedgerPublicKey = async (
  transport: LedgerTransport,
  bipPath: string,
  canQuitOtherApp = true,
): Promise<{ rawPublicKey: Buffer }> => {
  try {
    return await new LedgerApi(transport).getPublicKey(bipPath);
  } catch (e) {
    if (isAppNotOpenError(e)) {
      const reopened = await openStellarApp(transport);
      if (!reopened) {
        throw e;
      }
      return new LedgerApi(reopened).getPublicKey(bipPath);
    }

    // Another app answers our request with an error of its own (Ethereum
    // reads it as a malformed request, 0x6a80), so ask which app replied.
    // A Stellar app error, a locked device or a lost connection are real and
    // go back to the caller as they are.
    if (!canQuitOtherApp) {
      throw e;
    }
    const appName = await getRunningAppName(transport);
    if (
      !appName ||
      appName === LEDGER_STELLAR_APP_NAME ||
      appName === LEDGER_DASHBOARD_NAME
    ) {
      throw e;
    }
    const dashboard = await quitLedgerApp(transport);
    if (!dashboard) {
      throw new Error(OTHER_LEDGER_APP_OPEN_ERROR);
    }
    // Back on the dashboard, which the app-not-open path above takes from here.
    return getLedgerPublicKey(dashboard, bipPath, false);
  }
};

/*
 * Establishes a connection to the hardware wallet's account using the wallet's API
 * @param {string} bipPath - The bip path to pass to the API (optional).
 * @returns {string} A string representation of the public key.
 */
export const createWalletConnection: CreateWalletConnection = {
  [WalletType.LEDGER]: async (bipPath = "") => {
    await closeLedgerDevices();
    const transport = await TransportWebHID.request();
    const response = await getLedgerPublicKey(transport, bipPath);

    return StrKey.encodeEd25519PublicKey(response.rawPublicKey);
  },
};

type GetWalletPublicKey = {
  [key in ConfigurableWalletType]: (bipPath?: string) => Promise<string>;
};

/*
 * Retrieves a public key after the connection to the wallet has been established
 * @param {string} bipPath - The bip path to pass to the API (optional).
 * @returns {string} A string representation of the public key.
 */
export const getWalletPublicKey: GetWalletPublicKey = {
  [WalletType.LEDGER]: async (bipPath = "") => {
    const transport = await connectToLedgerTransport();
    const response = await getLedgerPublicKey(transport, bipPath);

    return StrKey.encodeEd25519PublicKey(response.rawPublicKey);
  },
};

interface HardwareSignParams {
  bipPath?: string;
  tx: Transaction | FeeBumpTransaction;
  isHashSigningEnabled?: boolean;
}

type HardwareSign = {
  [key in ConfigurableWalletType]: ({
    bipPath,
    tx,
  }: HardwareSignParams) => Promise<Buffer>;
};

/*
 * Returns a signature from the hardware wallet
 * @param {string} bipPath - The bip path to pass to the API (optional).
 * @param {Transaction} tx - The transaction that will be signed by the wallet.
 * @returns {Buffer} A signature that will be added to the Transaction.
 */
export const hardwareSign: HardwareSign = {
  [WalletType.LEDGER]: async ({
    bipPath = "",
    tx,
    isHashSigningEnabled,
  }: HardwareSignParams) => {
    const transport = await connectToLedgerTransport();
    const ledgerApi = new LedgerApi(transport);
    // @ledgerhq/hw-app-str still types these as Buffer; the SDK now hands
    // back Uint8Array, so re-wrap at the boundary.
    const result = isHashSigningEnabled
      ? await ledgerApi.signHash(bipPath, Buffer.from(tx.hash()))
      : await ledgerApi.signTransaction(
          bipPath,
          Buffer.from(tx.signatureBase()),
        );

    return result.signature;
  },
};

interface HardwareSignAuthParams {
  bipPath?: string;
  auth: Buffer;
  isHashSigningEnabled?: boolean;
}

type HardwareSignAuth = {
  [key in ConfigurableWalletType]: ({
    bipPath,
    auth,
  }: HardwareSignAuthParams) => Promise<Buffer>;
};

/*
 * Returns a Soroban auth entry signature from the hardware wallet
 * @param {string} bipPath - The bip path to pass to the API (optional).
 * @param {Buffer} auth - The authorization that will be signed by the wallet.
 * @returns {Buffer} A signature that will be added to the Transaction.
 */
export const hardwareSignAuth: HardwareSignAuth = {
  [WalletType.LEDGER]: async ({
    bipPath = "",
    auth,
  }: HardwareSignAuthParams) => {
    const transport = await connectToLedgerTransport();
    const ledgerApi = new LedgerApi(transport);

    const result = await ledgerApi.signSorobanAuthorization(bipPath, auth);
    return result.signature;
  },
};

interface HardwareSignMessageParams {
  bipPath?: string;
  message: string;
}

type HardwareSignMessage = {
  [key in ConfigurableWalletType]: ({
    bipPath,
    message,
  }: HardwareSignMessageParams) => Promise<Buffer>;
};

/*
 * Returns a SEP-53 message signature from the hardware wallet
 * @param {string} bipPath - The bip path to pass to the API (optional).
 * @param {string} message - The message that will be signed by the wallet.
 * @returns {Buffer} A signature over the SEP-53 encoded message.
 */
export const hardwareSignMessage: HardwareSignMessage = {
  [WalletType.LEDGER]: async ({
    bipPath = "",
    message,
  }: HardwareSignMessageParams) => {
    const transport = await connectToLedgerTransport();
    const ledgerApi = new LedgerApi(transport);

    // An unparseable version is not a reason to refuse — fall through and let
    // the device answer, since it rejects the instruction itself if too old.
    const { version, maxDataSize } = await ledgerApi.getAppConfiguration();
    if (
      semver.valid(version) &&
      semver.lt(version, MIN_SIGN_MESSAGE_APP_VERSION)
    ) {
      throw new Error(UNSUPPORTED_SIGN_MESSAGE_APP_ERROR);
    }

    // The device applies the SEP-53 prefix and hashing itself and displays the
    // message for review, so it receives the raw UTF-8 bytes. The resulting
    // signature matches what encodeSep53Message produces for a local key.
    const messageBytes = Buffer.from(message, "utf8");

    // Older apps do not report maxDataSize; when they do, checking it here
    // turns the device's opaque 0xb004 rejection into an actionable message.
    if (maxDataSize && messageBytes.length > maxDataSize) {
      throw new Error(OVERSIZED_SIGN_MESSAGE_ERROR);
    }

    const result = await ledgerApi.signMessage(bipPath, messageBytes);
    return result.signature;
  },
};

/*
 ** UI ELEMENTS
 */

type WalletAssets = {
  [key in ConfigurableWalletType]: {
    // hardware wallet's logo. Recommended size: 223 x 60
    logo: string;
  };
};

/*
  Hardware wallet image for UI 
*/
export const walletAssets: WalletAssets = {
  [WalletType.LEDGER]: {
    logo: LedgerLogo,
  },
};

type PluginWalletInfo = {
  [key in ConfigurableWalletType]: {
    // brieflly describe how a user should connec their wallet
    instruction: string;
    link: {
      // a link to the wallet's website for more info
      href: string;
      // Call To Action text for the above the link
      text: string;
    };
  };
};

/*
  Hardware wallet instructions
*/
export const pluginWalletInfo: PluginWalletInfo = {
  [WalletType.LEDGER]: {
    instruction: i18n.t(
      "Make sure your Ledger wallet is connected to your computer and the Stellar app is open on the Ledger wallet.",
    ),
    link: {
      href: "https://www.ledger.com/stellar-wallet",
      text: i18n.t("Learn more about using Ledger"),
    },
  },
};

type ParseWalletError = {
  [key in ConfigurableWalletType]: (err: any) => string;
};

/*
 * Parses errors from the wallet's API and presents a user readable message
 * @param {any} error - The error surfaced from the wallet's API.
 * @returns {string} A short string describing the error.
 */
export const parseWalletError: ParseWalletError = {
  [WalletType.LEDGER]: (err: any) => {
    const message = err.message || err;
    const defaultErr = i18n.t("Error connecting. Please try again.");
    if (!message) {
      return defaultErr;
    }
    if (message.indexOf("No device selected") > -1) {
      return `${i18n.t("No device detected.")} ${i18n.t(
        "Please make sure your device is connected and the Stellar app is open on it.",
      )}`;
    }
    if (message.indexOf("Incorrect length") > -1) {
      return i18n.t(
        "Connect device to computer and open the Stellar app on it",
      );
    }
    // The Ledger OS answers this for any request while the PIN screen is up.
    if (message.indexOf("(0x5515)") > -1) {
      return i18n.t("Your Ledger is locked. Unlock it and try again.");
    }
    // Matched on the text rather than statusCode because HardwareSign passes
    // errors through Redux as a bare message string. Reaching here means the
    // open-app request in getLedgerPublicKey did not get the app running.
    if (message.indexOf("(0x6511)") > -1) {
      return i18n.t(
        "The Stellar app is not open on your Ledger. Open it on the device and try again.",
      );
    }
    if (message.indexOf(OTHER_LEDGER_APP_OPEN_ERROR) > -1) {
      return i18n.t(
        "Another app is open on your Ledger. Close it, open the Stellar app and try again.",
      );
    }
    // Declining on the device is the one "error" every hardware user will hit
    // deliberately. hw-app-str funnels the deny status word (0x6985) through a
    // shared remapErrors for every sign call, so this covers transactions and
    // auth entries as well as messages — none of which were translated before,
    // because the branch below matches a string the pinned library never
    // throws. Kept anyway in case an older app or transport still produces it.
    if (message.indexOf("User refused the request") > -1) {
      return i18n.t("Request rejected on your device.");
    }
    if (message.indexOf("Transaction approval request was rejected") > -1) {
      return i18n.t("Transaction Rejected");
    }
    // Raised by the preflight in hardwareSignMessage. Deliberately not matched
    // on the device's generic INS_NOT_SUPPORTED (0x6d00) status word: that fires
    // for any instruction the app does not know — signing a Soroban auth entry
    // on an older app, or a Stellar APDU sent while another app is open — and
    // this parser is shared by every Ledger flow.
    if (message.indexOf(UNSUPPORTED_SIGN_MESSAGE_APP_ERROR) > -1) {
      return i18n.t(
        "Update the Stellar app on your Ledger to version {{version}} or later to sign messages.",
        { version: MIN_SIGN_MESSAGE_APP_VERSION },
      );
    }
    if (message.indexOf(OVERSIZED_SIGN_MESSAGE_ERROR) > -1) {
      return i18n.t(
        "This message is too large for your Ledger to display. Ask the site for a shorter message.",
      );
    }
    if (message.indexOf(MISMATCHED_HARDWARE_ACCOUNT_ERROR) > -1) {
      return i18n.t(
        "The connected device does not match the selected account. Connect the device this account was added from and try again.",
      );
    }
    // Deliberately does not tell the user to connect a different device: the
    // signature may well have come from the right one. Retrying covers a device
    // swapped between connections, updating covers an app whose SEP-53 digest
    // disagrees with ours.
    if (message.indexOf(UNVERIFIED_SIGN_MESSAGE_ERROR) > -1) {
      return i18n.t(
        "The signature returned by your Ledger could not be verified. Disconnect any other devices and try again. If this keeps happening, update the Stellar app on your Ledger.",
      );
    }
    return message;
  },
};
