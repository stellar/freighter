import { useEffect, useState } from "react";
import { Networks } from "stellar-sdk";
import { getSoranPaymentName } from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import type { OperationDataRow } from "popup/views/AccountHistory/hooks/useGetHistoryData";
import { getHistoryCounterparty } from "popup/helpers/soranHistory";
import { getSoranPrimaryName } from "popup/helpers/soranPrimary";

export const useSoranHistoryName = (
  operation: OperationDataRow | null,
  network: NetworkDetails,
) => {
  const counterparty = getHistoryCounterparty(operation);
  const address = counterparty?.address;
  const metadata = operation?.metadata;
  const publicKey = metadata?.publicKey;
  const transactionHash = metadata?.transactionHash;
  const memo = metadata?.memo || "";
  const memoType = metadata?.memoType || (memo ? undefined : "none");
  const isReceiving = counterparty?.isReceiving;
  const { networkPassphrase, sorobanRpcUrl } = network;
  const key = JSON.stringify([
    address,
    isReceiving,
    publicKey,
    transactionHash,
    memo,
    memoType,
    networkPassphrase,
    sorobanRpcUrl,
  ]);
  const [current, setCurrent] = useState<{ key: string; name?: string }>();
  const [used, setUsed] = useState<{ key: string; name?: string }>();

  useEffect(() => {
    if (!address || networkPassphrase !== Networks.TESTNET || !sorobanRpcUrl)
      return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      const result = await getSoranPrimaryName(address, network);
      if (cancelled) return;
      setCurrent({
        key,
        name: result.status === "name" ? result.name : undefined,
      });
      timer = setTimeout(refresh, result.status === "failed" ? 10_000 : 61_000);
    };
    void refresh();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, address, networkPassphrase, sorobanRpcUrl, network]);

  useEffect(() => {
    if (!address || isReceiving || !publicKey || !transactionHash || !memoType)
      return;
    let cancelled = false;
    void getSoranPaymentName(publicKey, {
      networkPassphrase,
      transactionHash,
      destination: address,
      memo,
      memoType,
    })
      .then(({ name }) => {
        if (!cancelled) setUsed({ key, name: name || undefined });
      })
      .catch(() => {
        if (!cancelled) setUsed({ key });
      });
    return () => {
      cancelled = true;
    };
  }, [
    key,
    address,
    isReceiving,
    publicKey,
    transactionHash,
    networkPassphrase,
    memo,
    memoType,
  ]);

  return {
    currentName: current?.key === key ? current.name : undefined,
    usedName: used?.key === key ? used.name : undefined,
  };
};
