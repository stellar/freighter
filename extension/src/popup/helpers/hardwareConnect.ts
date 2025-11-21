import {
  FeeBumpTransaction,
  Memo,
  MemoType,
  Operation,
  Transaction,
  StrKey,
} from "stellar-sdk";
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
  tx: Transaction<Memo<MemoType>, Operation[]> | FeeBumpTransaction;
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
    const result = isHashSigningEnabled
      ? await ledgerApi.signHash(bipPath, tx.hash())
      : await ledgerApi.signTransaction(bipPath, tx.signatureBase());

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
    const defaultErr = "Error connecting. Please try again.";
    if (!message) {
      return defaultErr;
    }
    if (message.indexOf("No device selected") > -1) {
      return "No device detected. Please make sure your device is connected and the Stellar app is open on it.";
    }
    if (message.indexOf("Incorrect length") > -1) {
      return "Connect device to computer and open the Stellar app on it.";
    }
    if (message.indexOf("Transaction approval request was rejected") > -1) {
      return "Transaction Rejected.";
    }
    return message;
  },
};
