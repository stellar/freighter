import { useEffect, useState } from "react";

import { AssetType } from "@shared/api/types/account-balance";

import { createReserveClient } from "./client";
import { listFeeAssetOptions, nativeAvailableFromBalances } from "./feeAssets";
import { isReserveNetwork } from "./network";
import type { FeeAssetOption } from "./types";

export function useReserveFeeAssets({
  balances,
  requiredFeeXlm,
  networkPassphrase,
  enabled,
}: {
  balances: AssetType[];
  requiredFeeXlm: string;
  networkPassphrase: string;
  enabled: boolean;
}): { options: FeeAssetOption[]; isLoading: boolean } {
  const [accepted, setAccepted] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !isReserveNetwork(networkPassphrase)) {
      return;
    }

    let cancelled = false;
    const client = createReserveClient(networkPassphrase);
    if (!client) {
      setAccepted([]);
      return;
    }

    setIsLoading(true);
    client
      .tokens()
      .then((res) => {
        if (!cancelled) setAccepted(res.tokens);
      })
      .catch(() => {
        if (!cancelled) setAccepted([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, networkPassphrase]);

  const options = listFeeAssetOptions({
    acceptedTokens: accepted,
    balances,
    nativeAvailable: nativeAvailableFromBalances(balances),
    requiredFeeXlm,
  });

  return { options, isLoading };
}
