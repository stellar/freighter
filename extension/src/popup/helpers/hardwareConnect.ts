import {
  FeeBumpTransaction,
  Memo,
  MemoType,
  Operation,
  Transaction,
} from "stellar-sdk";
import {
  ConfigurableWalletType,
  WalletType,
} from "@shared/constants/hardwareWallet";

/* Ledger Imports */
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import LedgerApi from "@ledgerhq/hw-app-str";

import LedgerLogo from "popup/assets/ledger-logo.png";
/* end Ledger imports */

/*
 ** HELPER METHODS
 */

type CreateWalletConnection = {
  [key in ConfigurableWalletType]: (bipPath?: string) => Promise<string>;
};

/*
 * Establishes a connection to the hardware wallet's account using the wallet's API
 * @param {string} bipPath - The bip path to pass to the API (optional).
 * @returns {string} A string representation of the public key.
 */
export const createWalletConnection: CreateWalletConnection = {
  [WalletType.LEDGER]: async (bipPath = "") => {
    const transport = await TransportWebUSB.request();
    const ledgerApi = new LedgerApi(transport);
    const response = await ledgerApi.getPublicKey(bipPath);

    return response.publicKey;
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
    const transport = await TransportWebUSB.create();
    const ledgerApi = new LedgerApi(transport);
    const response = await ledgerApi.getPublicKey(bipPath);

    return response.publicKey;
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
    const transport = await TransportWebUSB.create();
    const ledgerApi = new LedgerApi(transport);
    let result = { signature: Buffer.from([]) };

    if (isHashSigningEnabled) {
      result = await ledgerApi.signHash(bipPath, tx.hash());
    } else {
      result = await ledgerApi.signTransaction(bipPath, tx.signatureBase());
    }
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
    instruction:
      "Make sure your Ledger wallet is connected to your computer and the Stellar app is open on the Ledger wallet.",
    link: {
      href: "https://www.ledger.com/stellar-wallet",
      text: "Learn more about using Ledger",
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
