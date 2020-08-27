export const truncatedPublicKey = (publicKey: string) =>
  `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;

export const getTransactionInfo = (search: string) => {
  const decodedTransactionInfo = atob(search.replace("?", ""));
  const transactionInfo = decodedTransactionInfo
    ? JSON.parse(decodedTransactionInfo)
    : {};

  const {
    tab: { title, url },
    transaction,
  } = transactionInfo;

  const u = new URL(url);

  return {
    title,
    transaction,
    domain: u.origin,
  };
};
