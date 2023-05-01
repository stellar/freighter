import BigNumber from "bignumber.js";
import StellarSdk from "stellar-sdk";
import isEqual from "lodash/isEqual";
import { isPlain } from "@reduxjs/toolkit";

import { isSorobanIssuer } from "popup/helpers/account";
import {
  FUTURENET_NETWORK_DETAILS,
  NETWORK_URLS,
  NetworkDetails,
} from "@shared/constants/stellar";

import { parsedSearchParam, getUrlHostname } from "./urls";

// .isBigNumber() not catching correctly, so checking .isBigNumber
// property as well
export const isSerializable = (value: any) =>
  value?.isBigNumber || BigNumber.isBigNumber(value) || isPlain(value);

const truncateString = (str: string) =>
  str ? `${str.slice(0, 4)}…${str.slice(-4)}` : "";

export const truncatedPublicKey = (publicKey: string) =>
  truncateString(publicKey);

export const truncatedFedAddress = (addr: string) => {
  if (!addr || addr.indexOf("*") === -1) {
    return addr;
  }
  const domain = addr.split("*")[1];
  return `${addr[0]}...*${domain}`;
};

export const truncatedPoolId = (poolId: string) => truncateString(poolId);

export const getTransactionInfo = (search: string) => {
  const transactionInfo = parsedSearchParam(search);

  const {
    accountToSign,
    url,
    transaction,
    transactionXdr,
    isDomainListedAllowed,
    flaggedKeys,
    tab: { title = "" },
  } = transactionInfo;
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
    isDomainListedAllowed,
    flaggedKeys,
  };
};

export const getAssetFromCanonical = (canonical: string) => {
  if (canonical === "native") {
    return StellarSdk.Asset.native();
  }
  if (canonical.includes(":")) {
    const [code, issuer] = canonical.split(":");

    if (isSorobanIssuer(issuer)) {
      return {
        code,
        issuer,
      };
    }
    return new StellarSdk.Asset(code, issuer);
  }

  throw new Error(`invalid asset canonical id: ${canonical}`);
};

export const getCanonicalFromAsset = (
  assetCode: string,
  assetIssuer: string,
) => {
  if (assetCode === "XLM" && !assetIssuer) {
    return "native";
  }
  return `${assetCode}:${assetIssuer}`;
};

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
  const { networkPassphrase, networkUrl } = networkDetails;

  return (
    networkPassphrase === StellarSdk.Networks.PUBLIC &&
    networkUrl === NETWORK_URLS.PUBLIC
  );
};

export const isTestnet = (networkDetails: NetworkDetails) => {
  const { networkPassphrase, networkUrl } = networkDetails;

  return (
    networkPassphrase === StellarSdk.Networks.TESTNET &&
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

export const CUSTOM_NETWORK = "CUSTOM";

export const isCustomNetwork = (networkDetails: NetworkDetails) => {
  const { network } = networkDetails;

  return network === CUSTOM_NETWORK;
};
