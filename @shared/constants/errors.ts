export class NoExtensionInstalledError extends Error {
  message = "Freighter does not appear to be installed.";
}

export class SorobanRpcNotSupportedError extends Error {
  message = "No Soroban RPC available";
}
