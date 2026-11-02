export class NoExtensionInstalledError extends Error {
  message = "Freighter does not appear to be installed.";
}

export class SorobanRpcNotSupportedError extends Error {
  message = "No Soroban RPC available";
}

/**
 * Returned when an import or a hardware connection would add a public key the
 * wallet already holds under another id. Two accounts with one address can't
 * be told apart by any flow that only has the address (a dApp's
 * `accountToSign`), so the wallet refuses the second one.
 */
export const ACCOUNT_ALREADY_EXISTS_ERROR =
  "This account is already in your wallet";
