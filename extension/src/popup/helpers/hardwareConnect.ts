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

/*
 ** HELPER METHODS
 */

type CreateWalletConnection = {
  [key in ConfigurableWalletType]: (bipPath?: string) => Promise<string>;
};

// To communicate with an existing ledger connection, we need to close existing connections first
export const connectToLedgerTransport = async () => {
  // Close existing connections to avoid "device already open" error
  const existingTransports = await TransportWebHID.list();
  await Promise.all(
    existingTransports.map((existingTransport) =>
      existingTransport.close().catch(() => {
        // Ignore close errors - device might already be closed
      }),
    ),
  );

  return TransportWebHID.create();
};

/*
 * Establishes a connection to the hardware wallet's account using the wallet's API
 * @param {string} bipPath - The bip path to pass to the API (optional).
 * @returns {string} A string representation of the public key.
 */
export const createWalletConnection: CreateWalletConnection = {
  [WalletType.LEDGER]: async (bipPath = "") => {
    const transport = await TransportWebHID.request();
    const ledgerApi = new LedgerApi(transport);
    const response = await ledgerApi.getPublicKey(bipPath);

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
    const ledgerApi = new LedgerApi(transport);
    const response = await ledgerApi.getPublicKey(bipPath);

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
