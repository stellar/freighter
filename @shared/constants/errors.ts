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

/** Returned when a phrase being added is already one of the wallet's sources. */
export const PHRASE_ALREADY_HELD_ERROR =
  "This recovery phrase is already in your wallet";

/** Returned when storing a phrase being added to a live wallet fails. */
export const IMPORT_PHRASE_FAILED_ERROR = "Error adding recovery phrase";

/** Returned when an add needs a password but the wallet has no software keystore to check it against. */
export const NO_SOFTWARE_KEYSTORE_ERROR =
  "This wallet has no password to check against";

/** Returned when the password doesn't unlock the active software keystore. */
export const INCORRECT_PASSWORD_ERROR = "Incorrect password";

/** Returned when logging in to every account with the password fails on a locked session. */
export const UNABLE_TO_LOGIN_ERROR = "Unable to login";
