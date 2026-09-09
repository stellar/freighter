import { Reserve } from "@cavos/reserve";

import { reserveNetwork, reserveUrl } from "./network";

export {
  Reserve,
  ReserveError,
  ReserveVerificationError,
  readQuote,
} from "@cavos/reserve";

export {
  getReserveUrl,
  isReserveConfigured,
  isReserveNetwork,
  reserveNetwork,
  reserveUrl,
  resolveReserveUrl,
} from "./network";

export function createReserveClient(networkPassphrase: string): Reserve | null {
  const network = reserveNetwork(networkPassphrase);
  const url = reserveUrl(networkPassphrase);
  if (!network || !url) return null;
  return new Reserve({ url, network, networkPassphrase });
}
