import { HOSTED, TESTNET, PUBLIC, type NetworkName } from "@cavos/reserve";

import { RESERVE_URL } from "@shared/constants/reserve";

const NETWORK_BY_PASSPHRASE: Record<string, NetworkName> = {
  [TESTNET]: "testnet",
  [PUBLIC]: "mainnet",
};

export function reserveNetwork(networkPassphrase: string): NetworkName | null {
  return NETWORK_BY_PASSPHRASE[networkPassphrase] ?? null;
}

export function isReserveNetwork(networkPassphrase: string): boolean {
  return reserveNetwork(networkPassphrase) !== null;
}

/**
 * Loopback is a single lane at the origin. A hosted origin without a lane
 * gets `/testnet` or `/mainnet`. A pinned `/testnet` or `/mainnet` path only
 * serves that network.
 */
export function resolveReserveUrl(
  origin: string,
  network: NetworkName,
): string | null {
  if (!origin) return HOSTED[network].url;

  let parsed: URL;
  try {
    parsed = new URL(origin.includes("://") ? origin : `https://${origin}`);
  } catch {
    return null;
  }

  const path = parsed.pathname.replace(/\/+$/, "");
  const leaf = path.split("/").filter(Boolean).pop();
  if (leaf === "testnet" || leaf === "mainnet") {
    if (leaf !== network) return null;
    return `${parsed.origin}${path}`;
  }

  const local =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "[::1]";
  if (local) {
    return `${parsed.origin}${path}`.replace(/\/$/, "") || parsed.origin;
  }

  return `${parsed.origin}${path}/${network}`;
}

export function reserveUrl(networkPassphrase: string): string | null {
  const network = reserveNetwork(networkPassphrase);
  if (!network) return null;
  return resolveReserveUrl(RESERVE_URL, network);
}

export function getReserveUrl(networkPassphrase: string): string {
  return reserveUrl(networkPassphrase) ?? "";
}

export function isReserveConfigured(networkPassphrase: string): boolean {
  return reserveUrl(networkPassphrase) !== null;
}
