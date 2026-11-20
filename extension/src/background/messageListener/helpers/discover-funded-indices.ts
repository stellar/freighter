import StellarHDWallet from "stellar-hd-wallet";
import { captureException } from "@sentry/browser";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";

const MAX_IN_FLIGHT = 10;
// Callers run under the account-mutation lock, so a stalled lookup would
// hold off sign-out and auto-lock until it times out.
const LOOKUP_TIMEOUT_MS = 5_000;

/*
  Checks derivation indices `from` to `to` (inclusive) on mainnet. `funded`
  lists the funded ones in ascending order. Only a 404 counts as unfunded:
  any other status, a response without an account id, a thrown fetch or a
  lookup slower than LOOKUP_TIMEOUT_MS is a failed lookup, counted in
  `failedCount` and reported. Callers decide what a failed lookup means.
*/
export const discoverFundedIndices = async ({
  wallet,
  from,
  to,
}: {
  wallet: ReturnType<typeof StellarHDWallet.fromMnemonic>;
  from: number;
  to: number;
}): Promise<{ funded: number[]; failedCount: number }> => {
  const indices: number[] = [];
  for (let i = from; i <= to; i += 1) {
    indices.push(i);
  }

  const funded = new Set<number>();
  let failedCount = 0;
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
        if (resp.status === 404) {
          continue;
        }
        if (!resp.ok) {
          throw new Error(`Unexpected status ${resp.status}`);
        }
        const j = await resp.json();
        if (!j.account_id) {
          throw new Error("Response has no account id");
        }
        funded.add(i);
      } catch (e) {
        failedCount += 1;
        captureException(
          `Error discovering account: ${e instanceof Error ? e.message : JSON.stringify(e)} - ${i}`,
        );
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(MAX_IN_FLIGHT, indices.length) }, worker),
  );

  return { funded: indices.filter((i) => funded.has(i)), failedCount };
};
