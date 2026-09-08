import { useEffect, useState } from "react";

import {
  fetchClaimableBalances,
  pickBootstrapOptions,
  shouldOfferReserveActivate,
  type BootstrapOption,
} from "./bootstrap";
import { createReserveClient } from "./client";

export function useReserveBootstrap({
  publicKey,
  horizonUrl,
  networkPassphrase,
  enabled,
}: {
  publicKey: string;
  horizonUrl: string;
  networkPassphrase: string;
  enabled: boolean;
}): { options: BootstrapOption[]; isLoading: boolean } {
  const [options, setOptions] = useState<BootstrapOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      !enabled ||
      !publicKey ||
      !shouldOfferReserveActivate(networkPassphrase)
    ) {
      setOptions([]);
      return;
    }

    const client = createReserveClient(networkPassphrase);
    if (!client) {
      setOptions([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      client.tokens(),
      fetchClaimableBalances(horizonUrl, publicKey),
    ])
      .then(([tokens, records]) => {
        if (cancelled) return;
        setOptions(
          pickBootstrapOptions({
            records,
            acceptedTokens: tokens.tokens,
            claimant: publicKey,
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, horizonUrl, networkPassphrase, publicKey]);

  return { options, isLoading };
}
