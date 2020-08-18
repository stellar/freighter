export const truncatedPublicKey = (publicKey: string) =>
  `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
