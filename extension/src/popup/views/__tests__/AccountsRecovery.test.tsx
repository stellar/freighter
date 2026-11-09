import React from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { Account, SecretSource, SecretSourceType } from "@shared/api/types";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { ROUTES } from "popup/constants/routes";

import { AccountsRecovery } from "../AccountsRecovery";
import { Settings } from "../Settings";
import { Wrapper } from "../../__testHelpers__";

const DERIVED_1 = "GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57";
const DERIVED_2 = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const IMPORTED_1 = "GD6ROJBYLKQMOW3E7N4M2YBPUHMZD7PL65VRHRMO24BOVSBV5H3BQRSL";
const LEDGER = "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH";

const sources: SecretSource[] = [
  {
    id: "phrase-1",
    type: SecretSourceType.PHRASE,
    label: "Seed Phrase 1",
    createdAt: 1,
  },
  {
    id: "key-1",
    type: SecretSourceType.SECRET_KEY,
    label: "Secret Key 1",
    createdAt: 2,
  },
  {
    id: "phrase-2",
    type: SecretSourceType.PHRASE,
    label: "Seed Phrase 2",
    createdAt: 3,
  },
];

// Account 3 is derived from the second phrase, added after the imported key.
const accounts: Account[] = [
  {
    id: "k1",
    sourceId: "phrase-1",
    publicKey: DERIVED_1,
    name: "Account 1",
    imported: false,
  },
  {
    id: "k2",
    sourceId: "key-1",
    publicKey: IMPORTED_1,
    name: "Account 2",
    imported: true,
  },
  {
    id: "k3",
    sourceId: "phrase-2",
    publicKey: DERIVED_2,
    name: "Account 3",
    imported: false,
  },
  {
    id: `hw:${LEDGER}`,
    publicKey: LEDGER,
    name: "Account 4",
    imported: true,
    hardwareWalletType: WalletType.LEDGER,
  },
];

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

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
};

describe("AccountsRecovery", () => {
  beforeEach(() => {
    mockWalletsState = {
      state: RequestState.SUCCESS,
      data: {
        type: AppDataType.RESOLVED,
        publicKey: DERIVED_2,
        allAccounts: accounts,
        accountValue: { [DERIVED_1]: "$1,149.23", [IMPORTED_1]: "$0.00" },
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        isFetchingTokenPrices: false,
      },
    };
  });

  const renderList = () =>
    render(
      <Wrapper
        routes={[ROUTES.accountsRecovery]}
        state={{
          auth: {
            publicKey: DERIVED_2,
            activeAccountId: "k3",
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            allAccounts: accounts,
            secretSources: sources,
          },
        }}
      >
        <Routes>
          <Route
            path={ROUTES.accountsRecovery}
            element={<AccountsRecovery />}
          />
          <Route path={ROUTES.editAccount} element={<LocationProbe />} />
        </Routes>
      </Wrapper>,
    );

  it("lists every account once, under the source that roots it", () => {
    renderList();

    const groups = screen.getAllByTestId("accounts-recovery-group");
    expect(screen.getAllByTestId("accounts-recovery-row")).toHaveLength(4);
    expect(
      groups.map((group) => [
        group.querySelector(".AccountsRecovery__group__label")?.textContent,
        within(group)
          .getAllByTestId("accounts-recovery-row")
          .map(
            (row) =>
              row.querySelector(".AccountsRecovery__row__name")?.textContent,
          ),
      ]),
    ).toEqual([
      // The test i18n returns keys uninterpolated; the numbers are covered in
      // accountGroups.test.ts.
      ["Recovery phrase {{number}}", ["Account 1"]],
      ["Recovery phrase {{number}}", ["Account 3"]],
      ["Secret key {{number}}", ["Account 2"]],
      ["Ledger", ["Account 4"]],
    ]);
    expect(within(groups[0]).getByText("$1,149.23")).toBeInTheDocument();
  });

  it("marks the active account", () => {
    renderList();

    const current = screen
      .getAllByTestId("accounts-recovery-row")
      .filter((row) => row.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Account 3");
  });

  it("opens Edit account for the row's account", () => {
    renderList();

    const rows = screen.getAllByTestId("accounts-recovery-row");
    const imported = rows.find((row) =>
      row.textContent?.includes("Account 2"),
    )!;
    fireEvent.click(within(imported).getByTestId("accounts-recovery-edit"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      `${ROUTES.editAccount}?accountId=k2`,
    );
  });
});

describe("Settings", () => {
  it("opens Accounts & recovery from the card at the top", () => {
    render(
      <Wrapper
        routes={[ROUTES.settings]}
        state={{
          auth: {
            publicKey: DERIVED_1,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            allAccounts: accounts,
          },
          settings: { networkDetails: TESTNET_NETWORK_DETAILS },
        }}
      >
        <Routes>
          <Route path={ROUTES.settings} element={<Settings />} />
          <Route path={ROUTES.accountsRecovery} element={<LocationProbe />} />
        </Routes>
      </Wrapper>,
    );

    fireEvent.click(screen.getByTestId("settings-accounts-recovery"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      ROUTES.accountsRecovery,
    );
  });
});
