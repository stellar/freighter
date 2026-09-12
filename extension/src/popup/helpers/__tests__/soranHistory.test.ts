import {
  formatHistoryTimestamp,
  getHistoryCounterparty,
} from "../soranHistory";
import type { OperationDataRow } from "popup/views/AccountHistory/hooks/useGetHistoryData";
const operation = (metadata: Record<string, unknown>) =>
  ({ metadata }) as OperationDataRow;
it("selects the complete counterparty for sent and received payments", () => {
  expect(
    getHistoryCounterparty(
      operation({ isPayment: true, from: "sender", to: "muxed" }),
    ),
  ).toEqual({ address: "muxed", isReceiving: false });
  expect(
    getHistoryCounterparty(
      operation({
        isPayment: true,
        from: "muxed",
        to: "me",
        isReceiving: true,
      }),
    ),
  ).toEqual({ address: "muxed", isReceiving: true });
});
it("uses one unambiguous contract transfer and omits multi-party calls, swaps and failures", () => {
  const diff = { destination: "contract", isCredit: false };
  expect(
    getHistoryCounterparty(
      operation({
        isInvokeHostFn: true,
        hasAssetDiffs: true,
        assetDiffs: [diff],
      }),
    ),
  ).toEqual({ address: "contract", isReceiving: false });
  expect(
    getHistoryCounterparty(
      operation({
        isInvokeHostFn: true,
        hasAssetDiffs: true,
        assetDiffs: [diff, diff],
      }),
    ),
  ).toBeUndefined();
  expect(
    getHistoryCounterparty(
      operation({ isSwap: true, isPayment: true, to: "other" }),
    ),
  ).toBeUndefined();
  expect(
    getHistoryCounterparty(
      operation({ transactionFailed: true, isPayment: true, to: "other" }),
    ),
  ).toBeUndefined();
});
it.each(["en-GB", "en-US", "pt-BR"])(
  "formats valid dates in %s without assuming AM/PM",
  (locale) => {
    const result = formatHistoryTimestamp("2026-09-12T09:58:00Z", locale);
    expect(result).toContain("2026");
    expect(result).toContain(" • ");
    expect(result).not.toMatch(/undefined|Invalid|NaN/);
  },
);
it("handles an unavailable timestamp", () =>
  expect(formatHistoryTimestamp("bad")).toBe("—"));

it.each([
  { from: "sender", to: "me", isReceiving: true, address: "sender" },
  { from: "me", to: "recipient", isReceiving: false, address: "recipient" },
])("selects the collectible counterparty: %j", ({ address, ...metadata }) => {
  expect(
    getHistoryCounterparty(
      operation({ isCollectibleTransfer: true, ...metadata }),
    ),
  ).toEqual({ address, isReceiving: metadata.isReceiving });
});
it.each([
  { from: "sender", to: "me" },
  { to: "me", isReceiving: true },
  { from: "me", isReceiving: false },
])(
  "omits a collectible name when direction or counterparty is missing: %j",
  (metadata) => {
    expect(
      getHistoryCounterparty(
        operation({ isCollectibleTransfer: true, ...metadata }),
      ),
    ).toBeUndefined();
  },
);

describe("token transfer history naming without asset balance changes", () => {
  it.each([
    { from: "sender", to: "me", isReceiving: true, address: "sender" },
    { from: "me", to: "recipient", isReceiving: false, address: "recipient" },
  ])("selects the counterparty: %j", ({ address, ...metadata }) => {
    expect(
      getHistoryCounterparty(
        operation({
          isInvokeHostFn: true,
          isTokenTransfer: true,
          ...metadata,
        }),
      ),
    ).toEqual({ address, isReceiving: metadata.isReceiving });
  });

  it.each([
    { from: "sender", to: "me" },
    { to: "me", isReceiving: true },
    { from: "me", isReceiving: false },
    {
      from: "me",
      to: "recipient",
      isReceiving: false,
      transactionFailed: true,
    },
    { from: "me", to: "recipient", isReceiving: false, isSwap: true },
    {
      from: "me",
      to: "recipient",
      isReceiving: false,
      hasAssetDiffs: true,
      assetDiffs: [{ destination: "first" }, { destination: "second" }],
    },
  ])("omits a name for incomplete or ambiguous transfers: %j", (metadata) => {
    expect(
      getHistoryCounterparty(
        operation({
          isInvokeHostFn: true,
          isTokenTransfer: true,
          ...metadata,
        }),
      ),
    ).toBeUndefined();
  });
});
