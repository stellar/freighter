import React from "react";
import { render as renderComponent, screen } from "@testing-library/react";
import { createInstance, type i18n } from "i18next";
import { I18nextProvider } from "react-i18next";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { HistoryItem } from "popup/components/accountHistory/HistoryItem";
import { TransactionDetail } from "popup/components/accountHistory/TransactionDetail";
import { useSoranHistoryName } from "popup/hooks/useSoranHistoryName";
import englishTranslations from "popup/locales/en/translation.json";
import portugueseTranslations from "popup/locales/pt/translation.json";
import type { OperationDataRow } from "popup/views/AccountHistory/hooks/useGetHistoryData";

jest.unmock("i18next");
jest.unmock("i18next-browser-languagedetector");
jest.unmock("i18next-resources-to-backend");
jest.unmock("react-i18next");

jest.mock("popup/hooks/useSoranHistoryName", () => ({
  useSoranHistoryName: jest.fn(),
}));
const names = jest.mocked(useSoranHistoryName);
let localeInstance: i18n;
const render = (component: React.ReactElement) =>
  renderComponent(
    <I18nextProvider i18n={localeInstance}>{component}</I18nextProvider>,
  );
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
beforeEach(async () => {
  localeInstance = createInstance();
  await localeInstance.init({
    lng: "en-GB",
    fallbackLng: "en",
    resources: {
      en: { translation: englishTranslations },
      pt: { translation: portugueseTranslations },
    },
  });
  names.mockReturnValue({
    currentName: "current.nova",
    usedName: "original.nova",
  });
});

it.each([
  { locale: "en-GB", translationLanguage: "en", expectedTime: "09:58" },
  { locale: "en-US", translationLanguage: "en", expectedTime: "09:58 AM" },
  { locale: "pt-BR", translationLanguage: "pt", expectedTime: "09:58" },
])(
  "preserves the $locale clock when translations fall back to $translationLanguage",
  async ({ locale, translationLanguage, expectedTime }) => {
    await localeInstance.changeLanguage(locale);
    expect(localeInstance.language).toBe(locale);
    expect(localeInstance.resolvedLanguage).toBe(translationLanguage);

    render(
      <TransactionDetail
        activeOperation={{
          ...operation,
          metadata: {
            ...operation.metadata,
            createdAt: new Date(2026, 8, 12, 9, 58).toISOString(),
          },
        }}
        networkDetails={TESTNET_NETWORK_DETAILS}
      />,
    );

    const timestamp = screen.getByTestId(
      "TransactionDetailModal__subtitle-date",
    ).textContent;
    expect(timestamp?.split(" • ")[1]).toBe(expectedTime);
    expect(timestamp).not.toContain("undefined");
  },
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
