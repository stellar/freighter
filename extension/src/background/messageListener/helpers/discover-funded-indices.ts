import StellarHDWallet from "stellar-hd-wallet";
import { captureException } from "@sentry/browser";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";

const MAX_IN_FLIGHT = 10;
// Callers run under the account-mutation lock, so a stalled lookup would
// hold off sign-out and auto-lock until it times out.
const LOOKUP_TIMEOUT_MS = 5_000;

/*
  Checks derivation indices `from` to `to` (inclusive) on mainnet and returns
  the funded ones in ascending order. A lookup that throws, or takes longer
  than LOOKUP_TIMEOUT_MS, counts as not found and is reported.
*/
export const discoverFundedIndices = async ({
  wallet,
  from,
  to,
}: {
  wallet: ReturnType<typeof StellarHDWallet.fromMnemonic>;
  from: number;
  to: number;
}): Promise<number[]> => {
  const indices: number[] = [];
  for (let i = from; i <= to; i += 1) {
    indices.push(i);
  }

  const funded = new Set<number>();
  let next = 0;

  const worker = async () => {
    while (next < indices.length) {
      const i = indices[next];
      next += 1;
      try {
        const publicKey = wallet.getPublicKey(i);
        const resp = await fetch(
          `${MAINNET_NETWORK_DETAILS.networkUrl}/accounts/${publicKey}`,
          { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
        );
        const j = await resp.json();
        if (j.account_id) {
          funded.add(i);
        }
      } catch (e) {
        captureException(
          `Error preloading account: ${JSON.stringify(e)} - ${i}`,
        );
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(MAX_IN_FLIGHT, indices.length) }, worker),
  );

  return indices.filter((i) => funded.has(i));
};
