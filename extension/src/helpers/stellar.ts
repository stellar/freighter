import BigNumber from "bignumber.js";
import { Asset, Networks } from "stellar-sdk";
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

export const isMuxedAccount = (publicKey: string) => publicKey.startsWith("M");

export const isFederationAddress = (address: string) => address.includes("*");

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
