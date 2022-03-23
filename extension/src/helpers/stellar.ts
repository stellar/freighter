import BigNumber from "bignumber.js";
import { parsedSearchParam, getUrlHostname } from "./urls";

const truncateString = (str: string) =>
  str ? `${str.slice(0, 4)}…${str.slice(-4)}` : "";

export const truncatedPublicKey = (publicKey: string) =>
  truncateString(publicKey);

export const truncatedPoolId = (poolId: string) => truncateString(poolId);

export const getTransactionInfo = (search: string) => {
  const transactionInfo = parsedSearchParam(search);

  const {
    url,
    transaction,
    isDomainListedAllowed,
    flaggedKeys,
    tab: { title = "" },
  } = transactionInfo;
  const hostname = getUrlHostname(url);
  const { _operations = [] } = transaction;
  const operationTypes = _operations.map(
    (operation: { type: string }) => operation.type,
  );

  return {
    transaction,
    domain: hostname,
    domainTitle: title,
    operations: _operations,
    operationTypes,
    isDomainListedAllowed,
    flaggedKeys,
  };
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
