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

export const stroopToXlm = (stroop: number) => stroop / 10000000;
