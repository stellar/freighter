import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { Account } from "@shared/api/types";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { AccountSheet } from "popup/components/account/AccountSheet";
import { Wrapper } from "popup/__testHelpers__";

const DERIVED_1 = "GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57";
const DERIVED_2 = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const IMPORTED = "GD6ROJBYLKQMOW3E7N4M2YBPUHMZD7PL65VRHRMO24BOVSBV5H3BQRSL";
const LEDGER = "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH";

const derived = [
  { publicKey: DERIVED_1, name: "Account 1", imported: false },
  { publicKey: DERIVED_2, name: "Account 2", imported: false },
] as Account[];

const mixed = [
  ...derived,
  { publicKey: IMPORTED, name: "Account 3", imported: true },
  {
    publicKey: LEDGER,
    name: "Account 4",
    imported: false,
    hardwareWalletType: WalletType.LEDGER,
  },
] as Account[];

let mockWalletsState: unknown;
jest.mock(
  "popup/components/account/AccountSheet/hooks/useGetWalletsData",
  () => ({
    useGetWalletsData: () => ({
      state: mockWalletsState,
      fetchData: jest.fn(),
    }),
  }),
);

jest.mock("helpers/metrics", () => ({
  emitScreenViewed: jest.fn(),
  emitMetric: jest.fn(),
}));

const renderSheet = (accounts: Account[], activePublicKey = DERIVED_2) => {
  mockWalletsState = {
    state: RequestState.SUCCESS,
    data: {
      type: AppDataType.RESOLVED,
      publicKey: activePublicKey,
      allAccounts: accounts,
      accountValue: {},
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      isFetchingTokenPrices: false,
    },
  };

  const sheet = (isOpen: boolean) => (
    <Wrapper
      routes={["/"]}
      state={{
        auth: {
          publicKey: activePublicKey,
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          allAccounts: accounts,
        },
        settings: { networkDetails: TESTNET_NETWORK_DETAILS },
      }}
    >
      <AccountSheet
        isOpen={isOpen}
        onClose={() => {}}
        onAccountChanged={async () => {}}
      />
    </Wrapper>
  );

  const result = render(sheet(true));
  return {
    ...result,
    reopen: () => {
      result.rerender(sheet(false));
      result.rerender(sheet(true));
    },
  };
};

const groupNamed = (label: string) =>
  screen
    .getAllByTestId("account-sheet-group")
    .find((group) =>
      within(group)
        .getByTestId("account-sheet-group-toggle")
        .textContent?.startsWith(label),
    )!;

describe("AccountSheet", () => {
  it("lists a single source flat, without group headers", () => {
    renderSheet(derived);

    expect(screen.queryAllByTestId("account-sheet-group")).toHaveLength(0);
    expect(screen.getAllByTestId("wallet-row-select")).toHaveLength(2);
  });

  it("groups accounts by what roots them, with the device name for hardware", () => {
    renderSheet(mixed);

    const labels = screen
      .getAllByTestId("account-sheet-group-toggle")
      .map((toggle) => toggle.textContent);
    // The test i18n returns keys as-is, so the numbers stay as placeholders;
    // groupAccounts' own tests cover the numbering.
    expect(labels).toEqual([
      "Recovery phrase {{number}}",
      "Secret key {{number}}",
      "Ledger",
    ]);

    expect(
      within(groupNamed("Recovery phrase")).getAllByTestId("wallet-row-select"),
    ).toHaveLength(2);
    expect(within(groupNamed("Ledger")).getByText("Account 4")).toBeVisible();
    expect(screen.queryByText("Imported")).not.toBeInTheDocument();
  });

  it("marks the active account inside its own group", () => {
    renderSheet(mixed, IMPORTED);

    const current = screen
      .getAllByTestId("wallet-row-select")
      .filter((row) => row.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Account 3");
    expect(groupNamed("Secret key")).toContainElement(current[0]);
  });

  it("shows the address with a copy button and no rename, QR or explorer actions", () => {
    renderSheet(mixed);

    const header = screen.getByTestId("wallets-header");
    expect(within(header).getByTestId("wallets-header-copy")).toBeVisible();
    expect(screen.queryByTestId("wallets-header-edit-name")).toBeNull();
    expect(screen.queryByTestId("wallets-header-qr")).toBeNull();
    expect(screen.queryByTestId("wallets-header-explorer")).toBeNull();
  });

  // Collapsed groups are kept for the life of the popup, so this runs last.
  it("collapses a group and keeps it collapsed when the sheet reopens", () => {
    const { reopen } = renderSheet(mixed);

    const toggle = within(groupNamed("Recovery phrase")).getByTestId(
      "account-sheet-group-toggle",
    );
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      within(groupNamed("Recovery phrase")).queryAllByTestId(
        "wallet-row-select",
      ),
    ).toHaveLength(0);
    // The other groups stay open.
    expect(within(groupNamed("Ledger")).getByText("Account 4")).toBeVisible();

    reopen();
    expect(
      within(groupNamed("Recovery phrase")).getByTestId(
        "account-sheet-group-toggle",
      ),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
