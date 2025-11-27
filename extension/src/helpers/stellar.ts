import BigNumber from "bignumber.js";
import {
  Asset,
  hash,
  Networks,
  Account,
  MuxedAccount,
  StrKey,
} from "stellar-sdk";
import isEqual from "lodash/isEqual";

import {
  FUTURENET_NETWORK_DETAILS,
  NETWORK_URLS,
  NetworkDetails,
} from "@shared/constants/stellar";
export {
  getAssetFromCanonical,
  getCanonicalFromAsset,
} from "@shared/helpers/stellar";

import { TransactionInfo } from "types/transactions";
import { parsedSearchParam, getUrlHostname } from "./urls";
import { isContractId } from "popup/helpers/soroban";

export const SIGN_MESSAGE_PREFIX = "Stellar Signed Message:\n";

export const encodeSep53Message = (message: string) => {
  const messageBytes = Buffer.from(message, "utf8");
  const prefixBytes = Buffer.from(SIGN_MESSAGE_PREFIX, "utf8");
  const encodedMessage = Buffer.concat([prefixBytes, messageBytes]);
  return hash(encodedMessage);
};

export const truncateString = (str: string, charCount = 4) =>
  str ? `${str.slice(0, charCount)}…${str.slice(-charCount)}` : "";

export const truncatedPublicKey = (publicKey: string, charCount = 4) =>
  truncateString(publicKey, charCount);

export const truncatedFedAddress = (addr: string) => {
  if (!addr || addr.indexOf("*") === -1) {
    return addr;
  }
  const domain = addr.split("*")[1];
  return `${addr[0]}...*${domain}`;
};

export const truncatedPoolId = (poolId: string) => truncateString(poolId);

export const getTransactionInfo = (search: string) => {
  const searchParams = parsedSearchParam(search) as TransactionInfo;

  const {
    accountToSign,
    url,
    transaction,
    transactionXdr,
    flaggedKeys,
    tab: { title = "" },
  } = searchParams;
  const hostname = getUrlHostname(url);
  const isHttpsDomain = url.startsWith("https");
  const { _operations = [] } = transaction;
  const operationTypes = _operations.map(
    (operation: { type: string }) => operation.type,
  );

  return {
    accountToSign,
    transaction,
    transactionXdr,
    domain: hostname,
    domainTitle: title,
    isHttpsDomain,
    operations: _operations,
    operationTypes,
    flaggedKeys,
  };
};

export function isAsset(
  value: Asset | { code: string; issuer: string },
): value is Asset {
  return (value as Asset).getIssuer !== undefined;
}

export const stroopToXlm = (
  stroops: BigNumber | string | number,
): BigNumber => {
  if (stroops instanceof BigNumber) {
    return stroops.dividedBy(1e7);
  }
  return new BigNumber(Number(stroops) / 1e7);
};

export const xlmToStroop = (lumens: BigNumber | string): BigNumber => {
  if (lumens instanceof BigNumber) {
    return lumens.times(1e7);
  }
  // round to nearest stroop
  return new BigNumber(Math.round(Number(lumens) * 1e7));
};

export const getConversionRate = (
  sourceAmount: string,
  destAmount: string,
): BigNumber => new BigNumber(destAmount).div(new BigNumber(sourceAmount));

export const formatDomain = (domain: string) => {
  if (domain) {
    domain.replace("https://", "").replace("www.", "");
    return domain;
  }
  return "Stellar Network";
};

/**
 * Checks if an address is a muxed account (M... format)
 *
 * @param address The address to check
 * @returns True if the address is a muxed account
 */
export const isMuxedAccount = (address: string): boolean =>
  StrKey.isValidMed25519PublicKey(address);

/**
 * Extracts the base ED25519 account (G...) from a muxed account (M...)
 *
 * @param muxedAddress The muxed account address
 * @returns The base account address or null if conversion fails
 */
export const getBaseAccount = (muxedAddress: string): string | null => {
  try {
    if (isMuxedAccount(muxedAddress)) {
      const mAccount = MuxedAccount.fromAddress(muxedAddress, "0");
      return mAccount.baseAccount().accountId();
    }
    return muxedAddress;
  } catch (error) {
    console.error("Error extracting base account:", error);
    return null;
  }
};

/**
 * Creates a muxed account address from a base account and a muxed ID (memo)
 * This is used for CAP-0067 to support memo in Soroban transfers
 *
 * @param baseAccount The base ED25519 account (G...)
 * @param muxedId The muxed ID (memo) as a string or number
 * @returns The muxed account address (M...) or null if conversion fails
 */
export const createMuxedAccount = (
  baseAccount: string,
  muxedId: string | number,
): string | null => {
  try {
    if (!StrKey.isValidEd25519PublicKey(baseAccount)) {
      console.error("Invalid base account for muxed account creation", {
        baseAccount,
      });
      return null;
    }

    // Create a minimal Account object for MuxedAccount constructor
    const account = new Account(baseAccount, "0");
    const muxedAccount = new MuxedAccount(account, String(muxedId));
    const muxedAddress = muxedAccount.accountId();

    return muxedAddress;
  } catch (error) {
    console.error("Error creating muxed account", error, {
      baseAccount,
      muxedId: String(muxedId),
    });
    return null;
  }
};

/**
 * Gets the muxed ID from a muxed account address
 *
 * @param muxedAddress The muxed account address (M...)
 * @returns The muxed ID (memo) as a string or null if extraction fails
 */
export const getMuxedId = (muxedAddress: string): string | null => {
  try {
    if (!isMuxedAccount(muxedAddress)) {
      return null;
    }
    const mAccount = MuxedAccount.fromAddress(muxedAddress, "0");
    const muxedId = mAccount.id();

    return muxedId;
  } catch (error) {
    return null;
  }
};

/**
 * Checks if a public key is valid (ED25519, MED25519, contract ID, or federation address)
 *
 * @param publicKey The public key to check
 * @returns True if the public key is valid
 */
export const isValidStellarAddress = (publicKey: string): boolean => {
  try {
    // Must have a value to validate
    if (
      !publicKey ||
      typeof publicKey !== "string" ||
      publicKey.trim() === ""
    ) {
      return false;
    }

    // Check if it's a valid Ed25519 public key (G... addresses)
    if (StrKey.isValidEd25519PublicKey(publicKey)) {
      return true;
    }

    // Check if it's a valid muxed account (M... addresses)
    if (StrKey.isValidMed25519PublicKey(publicKey)) {
      return true;
    }

    // Check if it's a valid contract ID (C... addresses)
    if (publicKey.startsWith("C")) {
      const isValid = isContractId(publicKey);
      return isValid;
    }

    // Check if it's a valid federation address (user*domain.com)
    if (isFederationAddress(publicKey)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error validating Stellar address:", error);
    return false;
  }
};

/**
 * Determines if two Stellar addresses refer to the same account
 * Only considers direct match between Ed25519 public keys
 * Doesn't consider federation addresses or contract IDs to be the same account
 * For muxed accounts, compares their base G addresses
 *
 * @param address1 First address to compare
 * @param address2 Second address to compare
 * @returns True if addresses refer to the same account
 */
export const isSameAccount = (address1: string, address2: string): boolean => {
  try {
    // If either address is empty or not a string, they're not the same
    if (
      !address1 ||
      !address2 ||
      typeof address1 !== "string" ||
      typeof address2 !== "string"
    ) {
      return false;
    }

    // If addresses are exactly the same string, they might be the same account
    if (address1 === address2) {
      // For identical strings, verify they're valid Ed25519 public keys or muxed accounts
      return (
        StrKey.isValidEd25519PublicKey(address1) ||
        StrKey.isValidMed25519PublicKey(address1)
      );
    }

    // Special handling for federation addresses, muxed accounts, and contract IDs
    const isAddress1ContractId =
      address1.startsWith("C") && isContractId(address1);
    const isAddress2ContractId =
      address2.startsWith("C") && isContractId(address2);

    // Contract IDs should never be considered the same account as a G address
    if (isAddress1ContractId || isAddress2ContractId) {
      return false;
    }

    // Handle muxed accounts by converting to base accounts if needed
    const isAddress1Muxed = isMuxedAccount(address1);
    const isAddress2Muxed = isMuxedAccount(address2);

    if (isAddress1Muxed || isAddress2Muxed) {
      // Convert addresses to base accounts
      const baseAddress1 = isAddress1Muxed
        ? getBaseAccount(address1)
        : address1;
      const baseAddress2 = isAddress2Muxed
        ? getBaseAccount(address2)
        : address2;

      // If conversion failed, they can't be the same
      if (!baseAddress1 || !baseAddress2) {
        return false;
      }

      // Compare the base addresses
      return (
        baseAddress1 === baseAddress2 &&
        StrKey.isValidEd25519PublicKey(baseAddress1)
      );
    }

    // Final case - different addresses that are both valid Ed25519 keys
    return false;
  } catch (error) {
    console.error("Error comparing Stellar addresses:", error);
    return false;
  }
};

export const isFederationAddress = (address: string) => address.includes("*");

export const isValidDomain = (input: string) => {
  // eslint-disable-next-line no-useless-escape
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}$/i;
  if (domainRegex.test(input)) {
    return true;
  } else {
    return false;
  }
};

export const isValidFederatedDomain = (input: string) => {
  const [_, domain] = input.split("*");
  return isFederationAddress(input) && isValidDomain(domain);
};

export const isMainnet = (networkDetails: NetworkDetails) => {
  const { networkPassphrase } = networkDetails;

  return networkPassphrase === Networks.PUBLIC;
};

export const isTestnet = (networkDetails: NetworkDetails) => {
  const { networkPassphrase, networkUrl } = networkDetails;

  return (
    networkPassphrase === Networks.TESTNET &&
    networkUrl === NETWORK_URLS.TESTNET
  );
};

export const isFuturenet = (networkDetails: NetworkDetails) => {
  const { networkPassphrase, networkUrl } = networkDetails;

  return (
    networkPassphrase === FUTURENET_NETWORK_DETAILS.networkPassphrase &&
    networkUrl === NETWORK_URLS.FUTURENET
  );
};

export const isActiveNetwork = (
  networkA: NetworkDetails,
  networkB: NetworkDetails,
) => isEqual(networkA, networkB);
