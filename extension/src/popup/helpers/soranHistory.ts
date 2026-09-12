import type { OperationDataRow } from "popup/views/AccountHistory/hooks/useGetHistoryData";

/** Only unambiguous counterparties get a name. Swaps/multi-party calls do not. */
export const getHistoryCounterparty = (operation: OperationDataRow | null) => {
  const metadata = operation?.metadata;
  if (!metadata || metadata.transactionFailed || metadata.isSwap)
    return undefined;
  if (metadata.isInvokeHostFn && metadata.hasAssetDiffs) {
    if (metadata.assetDiffs?.length !== 1) return undefined;
    const diff = metadata.assetDiffs[0];
    return diff.destination
      ? {
          address: diff.destination as string,
          isReceiving: Boolean(diff.isCredit),
        }
      : undefined;
  }
  if (
    metadata.isPayment ||
    metadata.isCollectibleTransfer ||
    metadata.type === "create_account"
  ) {
    const address = metadata.isReceiving ? metadata.from : metadata.to;
    return address
      ? {
          address: address as string,
          isReceiving: Boolean(metadata.isReceiving),
        }
      : undefined;
  }
  return undefined;
};

export const formatHistoryTimestamp = (createdAt: string, locale?: string) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })} • ${date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
};
