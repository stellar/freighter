export class NoExtensionInstalledError extends Error {
  message = "Freighter does not appear to be installed.";
}

export class FriendbotNotSupported extends Error {
  message = "Friendbot is not supported on this network.";
}
