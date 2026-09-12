import { act, renderHook, waitFor } from "@testing-library/react";
import {
  TESTNET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import type { OperationDataRow } from "popup/views/AccountHistory/hooks/useGetHistoryData";
import { getSoranPrimaryName } from "popup/helpers/soranPrimary";
import { getSoranPaymentName } from "@shared/api/internal";
import { useSoranHistoryName } from "../useSoranHistoryName";
jest.mock("popup/helpers/soranPrimary", () => ({
  getSoranPrimaryName: jest.fn(),
}));
jest.mock("@shared/api/internal", () => ({ getSoranPaymentName: jest.fn() }));
const primary = jest.mocked(getSoranPrimaryName);
const saved = jest.mocked(getSoranPaymentName);
const operation = (destination = "recipient", extra = {}) =>
  ({
    id: "op",
    metadata: {
      publicKey: "payer",
      isPayment: true,
      isReceiving: false,
      to: destination,
      from: "sender",
      transactionHash: "hash",
      memo: "hello",
      memoType: "text",
      ...extra,
    },
  }) as unknown as OperationDataRow;
beforeEach(() => {
  jest.resetAllMocks();
  primary.mockResolvedValue({
    status: "name",
    name: "current.nova",
    ledger: 1,
    timestamp: "1",
  });
  saved.mockResolvedValue({ name: "original.nova" });
});
it("keeps the current name distinct from the saved exact payment route", async () => {
  const { result } = renderHook(() =>
    useSoranHistoryName(operation(), TESTNET_NETWORK_DETAILS),
  );
  await waitFor(() =>
    expect(result.current).toEqual({
      currentName: "current.nova",
      usedName: "original.nova",
    }),
  );
  expect(saved).toHaveBeenCalledWith("payer", {
    networkPassphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
    transactionHash: "hash",
    destination: "recipient",
    memo: "hello",
    memoType: "text",
  });
});
it("discards stale responses immediately after a counterparty or network changes", async () => {
  let finish: (value: Awaited<ReturnType<typeof getSoranPrimaryName>>) => void;
  primary.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const { result, rerender } = renderHook(
    ({ op, network }) => useSoranHistoryName(op, network),
    { initialProps: { op: operation(), network: TESTNET_NETWORK_DETAILS } },
  );
  rerender({ op: operation("another"), network: MAINNET_NETWORK_DETAILS });
  await act(async () => {
    finish!({ status: "name", name: "stale.nova", ledger: 1, timestamp: "1" });
  });
  expect(result.current.currentName).toBeUndefined();
  expect(primary).toHaveBeenCalledTimes(1);
});
it("uses the sender for incoming payments and does not claim a locally used name", async () => {
  const { result } = renderHook(() =>
    useSoranHistoryName(
      operation("me", { isReceiving: true }),
      TESTNET_NETWORK_DETAILS,
    ),
  );
  await waitFor(() => expect(result.current.currentName).toBe("current.nova"));
  expect(primary).toHaveBeenCalledWith("sender", TESTNET_NETWORK_DETAILS);
  expect(saved).not.toHaveBeenCalled();
  expect(result.current.usedName).toBeUndefined();
});
it("falls back to address-only when lookup or local storage is unavailable", async () => {
  primary.mockResolvedValue({ status: "failed" });
  saved.mockRejectedValue(new Error("storage error"));
  const { result } = renderHook(() =>
    useSoranHistoryName(operation(), TESTNET_NETWORK_DETAILS),
  );
  await act(async () => {});
  expect(result.current).toEqual({
    currentName: undefined,
    usedName: undefined,
  });
});
