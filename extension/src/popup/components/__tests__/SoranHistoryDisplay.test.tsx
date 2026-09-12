import React from "react";
import { render, screen } from "@testing-library/react";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { HistoryItem } from "popup/components/accountHistory/HistoryItem";
import { TransactionDetail } from "popup/components/accountHistory/TransactionDetail";
import { useSoranHistoryName } from "popup/hooks/useSoranHistoryName";
import type { OperationDataRow } from "popup/views/AccountHistory/hooks/useGetHistoryData";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) =>
      key.replace("{{name}}", options?.name || ""),
    i18n: { resolvedLanguage: "en-GB" },
  }),
}));

jest.mock("popup/hooks/useSoranHistoryName", () => ({
  useSoranHistoryName: jest.fn(),
}));
const names = jest.mocked(useSoranHistoryName);
const destination = "GBES5UHJYI445RV4XBGWHZOMBW4RYXBHOX47ZNZAJZAH2WP42ZEP2DYQ";
const operation: OperationDataRow = {
  id: "123",
  action: "Sent",
  actionIcon: "sent",
  amount: "-10 XLM",
  date: "Sep 12",
  rowIcon: <span />,
  rowText: "XLM",
  metadata: {
    isPayment: true,
    isReceiving: false,
    to: destination,
    from: "sender",
    destAssetCode: "XLM",
    nonLabelAmount: "10",
    createdAt: "2026-09-12T09:58:00Z",
    feeCharged: "100",
    memo: "hello",
  },
};
beforeEach(() =>
  names.mockReturnValue({
    currentName: "current.nova",
    usedName: "original.nova",
  }),
);
it("labels a historical name separately while retaining the address and memo", () => {
  render(
    <TransactionDetail
      activeOperation={operation}
      networkDetails={TESTNET_NETWORK_DETAILS}
    />,
  );
  expect(
    screen.getByTestId("transaction-current-soran-name"),
  ).toHaveTextContent("current.nova");
  expect(screen.getByTestId("transaction-used-soran-name")).toHaveTextContent(
    "original.nova",
  );
  expect(screen.getByText("Current account name")).toBeInTheDocument();
  expect(screen.getByTestId("AssetDiff__to-from-address")).toHaveTextContent(
    "GBES",
  );
  expect(screen.getByText("hello")).toBeInTheDocument();
  expect(
    screen.getByTestId("TransactionDetailModal__subtitle-date"),
  ).not.toHaveTextContent("undefined");
});
it("shows only the current name for older payments", () => {
  names.mockReturnValue({ currentName: "current.nova", usedName: undefined });
  render(
    <TransactionDetail
      activeOperation={operation}
      networkDetails={TESTNET_NETWORK_DETAILS}
    />,
  );
  expect(
    screen.getByTestId("transaction-current-soran-name"),
  ).toBeInTheDocument();
  expect(
    screen.queryByTestId("transaction-used-soran-name"),
  ).not.toBeInTheDocument();
});
it("renders the original name with explicit provenance in history rows", () => {
  render(
    <HistoryItem
      operation={operation}
      networkDetails={TESTNET_NETWORK_DETAILS}
      publicKey="payer"
      accountBalances={{} as never}
      setActiveHistoryDetailId={() => undefined}
    />,
  );
  expect(screen.getByTestId("history-item-soran-name")).toHaveTextContent(
    "Sent using original.nova",
  );
});
it("keeps address details usable without a name", () => {
  names.mockReturnValue({ currentName: undefined, usedName: undefined });
  render(
    <TransactionDetail
      activeOperation={operation}
      networkDetails={TESTNET_NETWORK_DETAILS}
    />,
  );
  expect(screen.getByTestId("AssetDiff__to-from-address")).toHaveTextContent(
    "GBES",
  );
  expect(
    screen.queryByTestId("transaction-current-soran-name"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByTestId("transaction-used-soran-name"),
  ).not.toBeInTheDocument();
});
