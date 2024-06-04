export const truncateString = (str: string, charCount = 4) =>
  str ? `${str.slice(0, charCount)}…${str.slice(-charCount)}` : '';

export const truncatedPublicKey = (publicKey: string, charCount = 4) =>
  truncateString(publicKey, charCount);
