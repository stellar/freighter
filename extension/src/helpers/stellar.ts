import { parsedSearchParam, getUrlHostname } from "./urls";

export const truncatedPublicKey = (publicKey: string) =>
  `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;

export const getTransactionInfo = (search: string) => {
  const transactionInfo = parsedSearchParam(search);

  const {
    tab: { url },
    transaction,
    isDomainListedAllowed,
  } = transactionInfo;
  const hostname = getUrlHostname(url);
  const { _operations } = transaction;
  const operationTypes = _operations.map(
    (operation: { type: string }) => operation.type,
  );

  return {
    transaction,
    domain: hostname,
    operations: _operations,
    operationTypes,
    isDomainListedAllowed,
  };
};
